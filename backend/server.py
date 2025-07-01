from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import aiohttp
import asyncio
from urllib.parse import quote, urlencode
import json
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import re
from dateutil import parser as date_parser

# Load the emergentintegrations library for OpenAI
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(
    title="AI-Powered Google PDF Search Engine",
    description="Intelligent PDF discovery focusing on Google's massive index (2000-2025)",
    version="3.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    sources: Optional[List[str]] = None
    date_range: Optional[str] = "2015-2025"  # Focus on recent PDFs with expanded range
    priority_google: Optional[bool] = True  # Prioritize Google results

class PDFResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    url: str
    download_url: Optional[str] = None
    source: str
    authors: Optional[List[str]] = None
    publication_date: Optional[str] = None
    file_size: Optional[str] = None
    page_count: Optional[int] = None
    language: Optional[str] = None
    thumbnail_url: Optional[str] = None
    relevance_score: Optional[float] = None
    ai_summary: Optional[str] = None
    categories: Optional[List[str]] = None
    doi: Optional[str] = None
    citation_count: Optional[int] = None
    domain: Optional[str] = None
    google_rank: Optional[int] = None

class SearchResponse(BaseModel):
    query: str
    reformulated_query: Optional[str] = None
    results: List[PDFResult]
    total_found: int
    search_time: float
    suggestions: List[str] = []
    sources_used: List[str] = []
    google_results_count: Optional[int] = None

class SummarizeRequest(BaseModel):
    pdf_url: str
    max_length: Optional[int] = 500

# OpenAI Integration Helper
class AISearchEngine:
    def __init__(self):
        self.openai_key = os.environ.get('OPENAI_API_KEY')
        if not self.openai_key:
            raise ValueError("OpenAI API key not found in environment variables")
    
    async def create_chat_instance(self):
        """Create a new LlmChat instance for each request"""
        return LlmChat(
            api_key=self.openai_key,
            session_id=f"search_session_{uuid.uuid4()}",
            system_message="You are an intelligent PDF search assistant specializing in finding recent academic papers, research documents, and technical reports from 2000-2025. Help users discover the most relevant and up-to-date documents."
        ).with_model("openai", "gpt-4o").with_max_tokens(2048)
    
    async def reformulate_query_for_google(self, original_query: str) -> str:
        """Use AI to optimize queries specifically for Google PDF search"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                Original query: "{original_query}"
                
                Reformulate this query to be highly effective for Google PDF search, focusing on finding recent academic papers, research reports, and technical documents from 2000-2025.
                
                Guidelines:
                - Add relevant academic and technical terms
                - Include synonyms that might appear in recent papers
                - Consider variations that would be in recent publications
                - Make it specific enough to find quality PDFs
                - Focus on terms that would appear in documents from the last 25 years
                
                Return only the optimized query, nothing else.
                """
            )
            response = await chat.send_message(message)
            return response.strip()
        except Exception as e:
            logger.error(f"Error reformulating query: {e}")
            return original_query
    
    async def generate_suggestions(self, query: str) -> List[str]:
        """Generate related search suggestions for recent academic content"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                Based on this search query: "{query}"
                
                Generate 3 related search suggestions that would help find recent academic papers, research reports, and technical documents (2000-2025).
                Focus on:
                - Related research topics that have emerged recently
                - Technological advances and developments
                - Current academic discussions and trends
                - Complementary research areas
                
                Return only the suggestions, one per line.
                """
            )
            response = await chat.send_message(message)
            suggestions = [s.strip() for s in response.split('\n') if s.strip()]
            return suggestions[:3]
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []
    
    async def summarize_pdf_content(self, title: str, description: str = "", domain: str = None) -> str:
        """Generate AI summary for PDF based on metadata"""
        try:
            chat = await self.create_chat_instance()
            domain_context = f" from {domain}" if domain else ""
            message = UserMessage(
                text=f"""
                PDF Title: {title}
                Description: {description}
                Source domain{domain_context}
                
                Based on the title, description, and source, provide a brief 2-3 sentence summary of what this PDF likely contains.
                Focus on the main research topic, potential methodology, and value for researchers or professionals.
                Consider that this is a recent document (2000-2025) in your summary.
                """
            )
            response = await chat.send_message(message)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating PDF summary: {e}")
            return "AI summary not available"

# Initialize AI engine
ai_engine = AISearchEngine()

# Google Custom Search Engine
class GooglePDFSearch:
    def __init__(self):
        self.name = "Google PDF Search"
        self.api_key = os.environ.get('GOOGLE_API_KEY')
        self.cse_id = os.environ.get('GOOGLE_CSE_ID')
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
        if not self.api_key or not self.cse_id:
            logger.warning("Google API credentials not found. Google search will be disabled.")
    
    async def search_pdfs(self, query: str, max_results: int = 20, date_range: str = "2000-2025") -> List[PDFResult]:
        """Search Google for recent PDFs using Custom Search API"""
        if not self.api_key or not self.cse_id:
            logger.warning("Google API not configured")
            return []
        
        try:
            # Parse date range
            start_year, end_year = self._parse_date_range(date_range)
            
            # Build optimized search query for PDFs
            pdf_query = f'{query} filetype:pdf'
            
            # Add recent focus if date range includes recent years
            if end_year >= 2020:
                pdf_query += ' after:2015'  # Focus on more recent content
            
            all_results = []
            
            # Search in batches (Google API returns max 10 per request)
            searches_needed = min((max_results + 9) // 10, 3)  # Max 3 API calls
            
            for start_index in range(0, searches_needed * 10, 10):
                params = {
                    'key': self.api_key,
                    'cx': self.cse_id,
                    'q': pdf_query,
                    'num': min(10, max_results - len(all_results)),
                    'start': start_index + 1,
                    'safe': 'off',
                    'fileType': 'pdf',
                    'fields': 'items(title,snippet,link,displayLink,pagemap,fileFormat),searchInformation(totalResults)'
                }
                
                # Add date restriction if specified
                if start_year and end_year:
                    if start_year >= 2010:  # More recent searches
                        params['dateRestrict'] = f'y{min(15, 2025 - start_year)}'  # Last N years
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(self.base_url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            items = data.get('items', [])
                            
                            for i, item in enumerate(items):
                                result = self._format_google_result(item, start_index + i + 1, start_year, end_year)
                                if result:
                                    all_results.append(result)
                        else:
                            logger.error(f"Google API returned status {response.status}")
                            if response.status == 429:  # Rate limit
                                break
                
                # If we got fewer than expected results, stop searching
                if len(data.get('items', [])) < 10:
                    break
            
            # Filter by date and sort by relevance and recency
            filtered_results = self._filter_and_rank_by_date(all_results, start_year, end_year)
            
            return filtered_results[:max_results]
            
        except Exception as e:
            logger.error(f"Error searching Google: {e}")
            return []
    
    def _parse_date_range(self, date_range: str) -> tuple:
        """Parse date range string like '2000-2025'"""
        try:
            if '-' in date_range:
                start, end = date_range.split('-')
                return int(start.strip()), int(end.strip())
            else:
                year = int(date_range.strip())
                return year, 2025
        except:
            return 1975, 2025
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        try:
            from urllib.parse import urlparse
            return urlparse(url).netloc
        except:
            return "Unknown"
    
    def _estimate_publication_year(self, title: str, snippet: str, url: str) -> Optional[int]:
        """Try to estimate publication year from content"""
        text = f"{title} {snippet} {url}".lower()
        
        # Look for year patterns (2000-2025)
        year_patterns = [
            r'\b(20[0-2][0-9])\b',  # 2000-2029
            r'\b(19[89][0-9])\b'    # 1980-1999 (some might be relevant)
        ]
        
        years = []
        for pattern in year_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                year = int(match)
                if 1990 <= year <= 2025:
                    years.append(year)
        
        if years:
            # Return the most recent year found
            return max(years)
        
        return None
    
    def _format_google_result(self, item: Dict[str, Any], rank: int, start_year: int, end_year: int) -> Optional[PDFResult]:
        """Convert Google search result to PDFResult format"""
        try:
            title = item.get('title', 'Untitled')
            snippet = item.get('snippet', '')
            url = item.get('link', '')
            display_link = item.get('displayLink', '')
            
            # Skip if not a PDF
            if not url.lower().endswith('.pdf') and 'pdf' not in url.lower():
                return None
            
            # Extract domain for credibility scoring
            domain = self._extract_domain(url)
            
            # Estimate publication year
            pub_year = self._estimate_publication_year(title, snippet, url)
            
            # Calculate relevance score based on domain credibility and recency
            relevance_score = self._calculate_relevance_score(domain, pub_year, rank)
            
            # Determine if this looks like an academic/research document
            is_academic = self._is_academic_content(title, snippet, domain)
            
            # Extract potential file size from snippet
            file_size = self._extract_file_size(snippet)
            
            # Generate categories based on content
            categories = self._extract_categories(title, snippet)
            
            return PDFResult(
                title=title[:200],
                description=snippet[:500] if snippet else None,
                url=url,
                download_url=url,  # For Google results, URL is the download link
                source=self.name,
                domain=domain,
                publication_date=str(pub_year) if pub_year else None,
                file_size=file_size,
                language="English",  # Assume English for Google results
                relevance_score=relevance_score,
                google_rank=rank,
                categories=categories,
                ai_summary=None  # Will be generated later
            )
            
        except Exception as e:
            logger.error(f"Error formatting Google result: {e}")
            return None
    
    def _calculate_relevance_score(self, domain: str, pub_year: Optional[int], rank: int) -> float:
        """Calculate relevance score based on domain authority and recency"""
        score = 1.0
        
        # Domain authority bonus
        academic_domains = [
            'edu', 'gov', 'org', 'ac.uk', 'mit.edu', 'stanford.edu', 
            'harvard.edu', 'ieee.org', 'acm.org', 'arxiv.org', 'nih.gov',
            'who.int', 'un.org', 'worldbank.org', 'oecd.org'
        ]
        
        if any(domain.endswith(ad) for ad in academic_domains):
            score += 0.3
        
        # Recency bonus (prefer 2015-2025)
        if pub_year:
            if pub_year >= 2020:
                score += 0.4
            elif pub_year >= 2015:
                score += 0.3
            elif pub_year >= 2010:
                score += 0.2
            elif pub_year >= 2005:
                score += 0.1
        
        # Google rank penalty (lower rank = higher penalty)
        rank_penalty = min(rank * 0.02, 0.5)
        score -= rank_penalty
        
        return max(score, 0.1)
    
    def _is_academic_content(self, title: str, snippet: str, domain: str) -> bool:
        """Determine if content appears to be academic/research"""
        academic_indicators = [
            'research', 'study', 'analysis', 'survey', 'review', 'paper',
            'journal', 'conference', 'proceedings', 'thesis', 'dissertation',
            'report', 'white paper', 'technical', 'scientific'
        ]
        
        text = f"{title} {snippet}".lower()
        return any(indicator in text for indicator in academic_indicators)
    
    def _extract_file_size(self, snippet: str) -> Optional[str]:
        """Extract file size from snippet if available"""
        size_patterns = [
            r'(\d+(?:\.\d+)?)\s*(mb|kb|gb)',
            r'(\d+(?:\.\d+)?)\s*(megabytes|kilobytes|gigabytes)'
        ]
        
        for pattern in size_patterns:
            match = re.search(pattern, snippet.lower())
            if match:
                size, unit = match.groups()
                return f"{size} {unit.upper()}"
        
        return None
    
    def _extract_categories(self, title: str, snippet: str) -> List[str]:
        """Extract potential categories from title and snippet"""
        text = f"{title} {snippet}".lower()
        
        category_keywords = {
            'Machine Learning': ['machine learning', 'deep learning', 'neural network', 'ai', 'artificial intelligence'],
            'Computer Science': ['algorithm', 'software', 'programming', 'computer science', 'computing'],
            'Medicine': ['medical', 'health', 'disease', 'treatment', 'clinical', 'patient'],
            'Physics': ['physics', 'quantum', 'particle', 'energy', 'mechanics'],
            'Biology': ['biology', 'genetic', 'molecular', 'cell', 'organism'],
            'Engineering': ['engineering', 'design', 'system', 'technical', 'infrastructure'],
            'Economics': ['economic', 'finance', 'market', 'business', 'trade'],
            'Environment': ['climate', 'environment', 'sustainability', 'energy', 'green'],
            'Social Science': ['social', 'society', 'policy', 'public', 'governance']
        }
        
        categories = []
        for category, keywords in category_keywords.items():
            if any(keyword in text for keyword in keywords):
                categories.append(category)
        
        return categories[:3]  # Limit to 3 categories
    
    def _filter_and_rank_by_date(self, results: List[PDFResult], start_year: int, end_year: int) -> List[PDFResult]:
        """Filter results by date range and rank by relevance and recency"""
        filtered = []
        
        for result in results:
            # If we have publication date, check if it's in range
            if result.publication_date:
                try:
                    year = int(result.publication_date)
                    if start_year <= year <= end_year:
                        filtered.append(result)
                except:
                    # If date parsing fails, include the result
                    filtered.append(result)
            else:
                # If no date available, include if it seems recent based on other factors
                filtered.append(result)
        
        # Sort by relevance score (descending)
        filtered.sort(key=lambda x: x.relevance_score or 0, reverse=True)
        
        return filtered

# Multi-Source Search Manager with Google Priority
class MultiSourceSearchManager:
    def __init__(self):
        self.google_search = GooglePDFSearch()
        # Other search engines (keeping them for fallback/comparison)
        self.other_engines = {
            'arxiv': ArxivSearch(),
            'semantic_scholar': SemanticScholarSearch(),
        }
    
    async def search_prioritizing_google(self, query: str, max_results: int = 20, date_range: str = "2000-2025") -> tuple[List[PDFResult], int]:
        """Search with Google as primary source, others as supplementary"""
        
        # Allocate results: 70% Google, 30% others
        google_results_target = int(max_results * 0.7)
        other_results_target = max_results - google_results_target
        
        # Search Google first (primary source)
        google_results = await self.google_search.search_pdfs(query, google_results_target, date_range)
        
        # Search other sources for supplementary results (if needed)
        other_results = []
        if len(google_results) < google_results_target and other_results_target > 0:
            # Create tasks for other search engines
            tasks = []
            for engine_name, engine in self.other_engines.items():
                if hasattr(engine, 'search_pdfs'):
                    task = asyncio.create_task(
                        engine.search_pdfs(query, max(2, other_results_target // len(self.other_engines))),
                        name=engine_name
                    )
                    tasks.append(task)
            
            # Execute other searches in parallel
            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in results:
                    if isinstance(result, Exception):
                        logger.error(f"Error in supplementary search: {result}")
                        continue
                    other_results.extend(result)
        
        # Combine results with Google priority
        all_results = google_results + other_results
        
        # Remove duplicates and limit total results
        unique_results = self._deduplicate_results(all_results)
        final_results = unique_results[:max_results]
        
        return final_results, len(google_results)
    
    def _deduplicate_results(self, results: List[PDFResult]) -> List[PDFResult]:
        """Remove duplicate results based on URL and title similarity"""
        unique_results = []
        seen_urls = set()
        seen_titles = set()
        
        for result in results:
            # Check for URL duplicates
            if result.url in seen_urls:
                continue
            
            # Check for title similarity
            normalized_title = re.sub(r'[^\w\s]', '', result.title.lower()).strip()
            if normalized_title in seen_titles:
                continue
            
            seen_urls.add(result.url)
            seen_titles.add(normalized_title)
            unique_results.append(result)
        
        return unique_results

# Keep other search engines for reference (simplified versions)
class ArxivSearch:
    def __init__(self):
        self.name = "arXiv"
        self.base_url = "http://export.arxiv.org/api/query"
    
    async def search_pdfs(self, query: str, max_results: int = 5) -> List[PDFResult]:
        """Simplified arXiv search for recent papers"""
        try:
            params = {
                'search_query': f'all:{query}',
                'start': 0,
                'max_results': max_results,
                'sortBy': 'submittedDate',
                'sortOrder': 'descending'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        xml_data = await response.text()
                        return self._parse_arxiv_xml(xml_data)
                    return []
        except Exception as e:
            logger.error(f"Error searching arXiv: {e}")
            return []
    
    def _parse_arxiv_xml(self, xml_data: str) -> List[PDFResult]:
        """Parse arXiv XML response"""
        try:
            root = ET.fromstring(xml_data)
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            results = []
            for entry in root.findall('atom:entry', ns):
                title = entry.find('atom:title', ns).text.strip() if entry.find('atom:title', ns) is not None else "Untitled"
                summary = entry.find('atom:summary', ns).text.strip() if entry.find('atom:summary', ns) is not None else ""
                
                # Get PDF URL
                pdf_url = None
                for link in entry.findall('atom:link', ns):
                    if link.get('type') == 'application/pdf':
                        pdf_url = link.get('href')
                        break
                
                # Publication date
                published = entry.find('atom:published', ns)
                pub_date = published.text[:4] if published is not None else None
                
                if pdf_url:
                    results.append(PDFResult(
                        title=title[:200],
                        description=summary[:500] if summary else None,
                        url=pdf_url.replace('/pdf/', '/abs/'),
                        download_url=pdf_url,
                        source=self.name,
                        publication_date=pub_date,
                        relevance_score=0.8,
                        language="English"
                    ))
            
            return results
        except Exception as e:
            logger.error(f"Error parsing arXiv XML: {e}")
            return []

class SemanticScholarSearch:
    def __init__(self):
        self.name = "Semantic Scholar"
        self.base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
    
    async def search_pdfs(self, query: str, max_results: int = 5) -> List[PDFResult]:
        """Simplified Semantic Scholar search"""
        try:
            params = {
                'query': query,
                'limit': max_results,
                'fields': 'title,abstract,authors,year,url,openAccessPdf,citationCount'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        papers = data.get('data', [])
                        return [self._format_result(paper) for paper in papers if paper.get('openAccessPdf')]
                    return []
        except Exception as e:
            logger.error(f"Error searching Semantic Scholar: {e}")
            return []
    
    def _format_result(self, paper: Dict[str, Any]) -> PDFResult:
        """Convert Semantic Scholar result to PDFResult format"""
        pdf_info = paper.get('openAccessPdf', {})
        return PDFResult(
            title=paper.get('title', 'Untitled')[:200],
            description=paper.get('abstract', '')[:500],
            url=paper.get('url', ''),
            download_url=pdf_info.get('url') if pdf_info else None,
            source=self.name,
            publication_date=str(paper.get('year')) if paper.get('year') else None,
            citation_count=paper.get('citationCount', 0),
            relevance_score=0.7,
            language="English"
        )

# Initialize search manager
search_manager = MultiSourceSearchManager()

# API Routes
@api_router.get("/")
async def root():
    return {
        "message": "AI-Powered Google PDF Search Engine", 
        "version": "3.0.0",
        "focus": "Recent PDFs (2000-2025) from Google's massive index"
    }

@api_router.post("/search", response_model=SearchResponse)
async def search_pdfs(request: SearchRequest):
    """Enhanced search endpoint prioritizing Google's PDF index"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Reformulate query specifically for Google PDF search
        reformulated_query = await ai_engine.reformulate_query_for_google(request.query)
        logger.info(f"Original query: {request.query}")
        logger.info(f"Google-optimized query: {reformulated_query}")
        
        # Search with Google priority
        search_results, google_count = await search_manager.search_prioritizing_google(
            reformulated_query, 
            request.max_results,
            request.date_range or "2000-2025"
        )
        
        # Generate AI summaries for top results
        for result in search_results[:5]:
            try:
                result.ai_summary = await ai_engine.summarize_pdf_content(
                    result.title, 
                    result.description or "",
                    result.domain
                )
            except Exception as e:
                logger.error(f"Error generating AI summary: {e}")
                result.ai_summary = "AI summary not available"
        
        # Generate search suggestions
        suggestions = await ai_engine.generate_suggestions(request.query)
        
        # Calculate search time
        search_time = round(asyncio.get_event_loop().time() - start_time, 2)
        
        # Get list of sources used
        sources_used = list(set([result.source for result in search_results]))
        
        # Store search in database for analytics
        search_record = {
            "id": str(uuid.uuid4()),
            "original_query": request.query,
            "reformulated_query": reformulated_query,
            "results_count": len(search_results),
            "google_results": google_count,
            "sources_used": sources_used,
            "date_range": request.date_range,
            "timestamp": datetime.utcnow(),
            "search_time": search_time
        }
        await db.search_history.insert_one(search_record)
        
        return SearchResponse(
            query=request.query,
            reformulated_query=reformulated_query,
            results=search_results,
            total_found=len(search_results),
            search_time=search_time,
            suggestions=suggestions,
            sources_used=sources_used,
            google_results_count=google_count
        )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed. Please try again.")

@api_router.get("/sources")
async def get_available_sources():
    """Get list of available search sources with Google priority"""
    sources = [
        {
            "id": "google",
            "name": "Google PDF Search",
            "description": "Google's massive PDF index focusing on recent documents (2000-2025)",
            "primary": True,
            "coverage": "Millions of PDFs across all domains"
        },
        {
            "id": "arxiv",
            "name": "arXiv",
            "description": "Recent scientific papers and preprints",
            "primary": False,
            "coverage": "2+ million papers"
        },
        {
            "id": "semantic_scholar",
            "name": "Semantic Scholar",
            "description": "Academic papers with citation data",
            "primary": False,
            "coverage": "200+ million papers"
        }
    ]
    return {"sources": sources}

@api_router.get("/suggestions")
async def get_search_suggestions(q: str = Query(..., description="Query to generate suggestions for")):
    """Get AI-powered search suggestions optimized for recent content"""
    try:
        suggestions = await ai_engine.generate_suggestions(q)
        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        return {"suggestions": []}

@api_router.post("/summarize")
async def summarize_pdf(request: SummarizeRequest):
    """Generate AI summary for a specific PDF"""
    try:
        chat = await ai_engine.create_chat_instance()
        message = UserMessage(
            text=f"""
            Generate a detailed summary for this PDF document: {request.pdf_url}
            
            Since I cannot directly access the PDF content, please provide a summary 
            based on the URL and context, focusing on recent research and developments.
            Keep it under {request.max_length} characters.
            """
        )
        summary = await chat.send_message(message)
        
        return {"summary": summary.strip()[:request.max_length]}
    except Exception as e:
        logger.error(f"Error summarizing PDF: {e}")
        raise HTTPException(status_code=500, detail="Summarization failed")

@api_router.get("/search/history")
async def get_search_history(limit: int = Query(10, description="Number of recent searches to return")):
    """Get recent search history with Google analytics"""
    try:
        history = await db.search_history.find().sort("timestamp", -1).limit(limit).to_list(limit)
        return history
    except Exception as e:
        logger.error(f"Error fetching search history: {e}")
        return []

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    google_status = "configured" if search_manager.google_search.api_key and search_manager.google_search.cse_id else "missing_credentials"
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "openai": "configured" if ai_engine.openai_key else "missing_key",
            "google_search": google_status,
            "focus": "Recent PDFs (2000-2025)",
            "primary_source": "Google PDF Search"
        },
        "version": "3.0.0"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()