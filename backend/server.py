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
from datetime import datetime
import aiohttp
import asyncio
from urllib.parse import quote, urlencode
import json
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import re

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
    title="AI-Powered PDF Search Engine",
    description="Intelligent PDF discovery and search platform with multiple sources",
    version="2.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 20
    sources: Optional[List[str]] = None  # Filter by specific sources

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

class SearchResponse(BaseModel):
    query: str
    reformulated_query: Optional[str] = None
    results: List[PDFResult]
    total_found: int
    search_time: float
    suggestions: List[str] = []
    sources_used: List[str] = []

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
            system_message="You are an intelligent academic search assistant. Help users find relevant papers, documents, and books by understanding their intent and reformulating queries for better results across multiple academic databases."
        ).with_model("openai", "gpt-4o").with_max_tokens(2048)
    
    async def reformulate_query(self, original_query: str) -> str:
        """Use AI to improve search queries"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                Original query: "{original_query}"
                
                Please reformulate this query to be more effective for searching academic databases, archives, and digital libraries. 
                Make it more specific and add relevant academic terms if appropriate.
                Consider synonyms and related terms that might help find more relevant documents.
                Only return the reformulated query, nothing else.
                """
            )
            response = await chat.send_message(message)
            return response.strip()
        except Exception as e:
            logger.error(f"Error reformulating query: {e}")
            return original_query
    
    async def generate_suggestions(self, query: str) -> List[str]:
        """Generate related search suggestions"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                Based on this search query: "{query}"
                
                Generate 3 related search suggestions that users might be interested in.
                Focus on academic, research, and educational topics.
                Make suggestions that would find complementary or related documents.
                Return only the suggestions, one per line.
                """
            )
            response = await chat.send_message(message)
            suggestions = [s.strip() for s in response.split('\n') if s.strip()]
            return suggestions[:3]
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []
    
    async def summarize_pdf_content(self, title: str, description: str = "", authors: List[str] = None) -> str:
        """Generate AI summary for PDF based on metadata"""
        try:
            chat = await self.create_chat_instance()
            authors_str = ", ".join(authors) if authors else "Unknown"
            message = UserMessage(
                text=f"""
                PDF Title: {title}
                Authors: {authors_str}
                Description: {description}
                
                Based on the title, authors, and description, provide a brief 2-3 sentence summary of what this PDF likely contains.
                Focus on the main topic, methodology, and potential value to researchers.
                """
            )
            response = await chat.send_message(message)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating PDF summary: {e}")
            return "AI summary not available"

# Initialize AI engine
ai_engine = AISearchEngine()

# Base Search Class
class BaseSearchEngine:
    def __init__(self, name: str):
        self.name = name
    
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Override this method in subclasses"""
        raise NotImplementedError

# Archive.org Search Engine
class ArchiveOrgSearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("Archive.org")
        self.base_url = "https://archive.org/advancedsearch.php"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search Archive.org for PDF documents"""
        try:
            params = {
                'q': f'({query}) AND format:PDF',
                'fl': 'identifier,title,description,downloads,item_size,publicdate,language,creator,subject',
                'sort[]': 'downloads desc',
                'rows': max_results,
                'page': 1,
                'output': 'json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        docs = data.get('response', {}).get('docs', [])
                        return [self._format_result(doc) for doc in docs]
                    else:
                        logger.error(f"Archive.org API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching Archive.org: {e}")
            return []
    
    def _format_result(self, doc: Dict[str, Any]) -> PDFResult:
        """Convert Archive.org result to PDFResult format"""
        identifier = doc.get('identifier', '')
        title = doc.get('title', ['Untitled'])[0] if isinstance(doc.get('title'), list) else doc.get('title', 'Untitled')
        description = doc.get('description', [''])[0] if isinstance(doc.get('description'), list) else doc.get('description', '')
        creator = doc.get('creator', [])
        authors = creator if isinstance(creator, list) else [creator] if creator else []
        
        base_url = f"https://archive.org/details/{identifier}"
        download_url = f"https://archive.org/download/{identifier}/{identifier}.pdf"
        thumbnail_url = f"https://archive.org/services/img/{identifier}"
        
        file_size = doc.get('item_size', 0)
        if file_size:
            try:
                size_mb = round(int(file_size) / (1024 * 1024), 1)
                file_size_str = f"{size_mb} MB"
            except:
                file_size_str = "Unknown"
        else:
            file_size_str = "Unknown"
        
        language = doc.get('language', ['English'])[0] if isinstance(doc.get('language'), list) else doc.get('language', 'English')
        downloads = doc.get('downloads', 0)
        
        return PDFResult(
            title=title[:200],
            description=description[:500] if description else None,
            url=base_url,
            download_url=download_url,
            source=self.name,
            authors=authors[:3],  # Limit to 3 authors
            file_size=file_size_str,
            language=language,
            thumbnail_url=thumbnail_url,
            relevance_score=min(float(downloads) / 1000, 1.0) if downloads else 0.1,
            publication_date=doc.get('date', doc.get('publicdate'))
        )

# arXiv Search Engine
class ArxivSearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("arXiv")
        self.base_url = "http://export.arxiv.org/api/query"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search arXiv for papers"""
        try:
            params = {
                'search_query': f'all:{query}',
                'start': 0,
                'max_results': max_results,
                'sortBy': 'relevance',
                'sortOrder': 'descending'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        xml_data = await response.text()
                        return self._parse_arxiv_xml(xml_data)
                    else:
                        logger.error(f"arXiv API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching arXiv: {e}")
            return []
    
    def _parse_arxiv_xml(self, xml_data: str) -> List[PDFResult]:
        """Parse arXiv XML response"""
        try:
            root = ET.fromstring(xml_data)
            ns = {'atom': 'http://www.w3.org/2005/Atom', 'arxiv': 'http://arxiv.org/schemas/atom'}
            
            results = []
            for entry in root.findall('atom:entry', ns):
                title = entry.find('atom:title', ns).text.strip() if entry.find('atom:title', ns) is not None else "Untitled"
                summary = entry.find('atom:summary', ns).text.strip() if entry.find('atom:summary', ns) is not None else ""
                
                # Extract authors
                authors = []
                for author in entry.findall('atom:author', ns):
                    name = author.find('atom:name', ns)
                    if name is not None:
                        authors.append(name.text.strip())
                
                # Get URLs
                pdf_url = None
                abstract_url = None
                for link in entry.findall('atom:link', ns):
                    if link.get('type') == 'application/pdf':
                        pdf_url = link.get('href')
                    elif link.get('rel') == 'alternate':
                        abstract_url = link.get('href')
                
                # Extract arXiv ID and categories
                arxiv_id = None
                categories = []
                for category in entry.findall('atom:category', ns):
                    categories.append(category.get('term'))
                
                if entry.find('atom:id', ns) is not None:
                    arxiv_id = entry.find('atom:id', ns).text.split('/')[-1]
                
                # Publication date
                published = entry.find('atom:published', ns)
                pub_date = published.text[:10] if published is not None else None
                
                results.append(PDFResult(
                    title=title[:200],
                    description=summary[:500] if summary else None,
                    url=abstract_url or f"https://arxiv.org/abs/{arxiv_id}",
                    download_url=pdf_url,
                    source=self.name,
                    authors=authors[:3],
                    publication_date=pub_date,
                    categories=categories,
                    relevance_score=0.8,  # arXiv papers are generally high quality
                    language="English"
                ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error parsing arXiv XML: {e}")
            return []

# Semantic Scholar Search Engine
class SemanticScholarSearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("Semantic Scholar")
        self.base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search Semantic Scholar for papers"""
        try:
            params = {
                'query': query,
                'limit': max_results,
                'fields': 'title,abstract,authors,year,url,openAccessPdf,citationCount,venue,categories'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        papers = data.get('data', [])
                        return [self._format_semantic_result(paper) for paper in papers if paper.get('openAccessPdf')]
                    else:
                        logger.error(f"Semantic Scholar API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching Semantic Scholar: {e}")
            return []
    
    def _format_semantic_result(self, paper: Dict[str, Any]) -> PDFResult:
        """Convert Semantic Scholar result to PDFResult format"""
        title = paper.get('title', 'Untitled')
        abstract = paper.get('abstract', '')
        authors = [author.get('name', '') for author in paper.get('authors', [])]
        year = paper.get('year')
        url = paper.get('url', '')
        pdf_info = paper.get('openAccessPdf', {})
        pdf_url = pdf_info.get('url') if pdf_info else None
        citation_count = paper.get('citationCount', 0)
        venue = paper.get('venue', '')
        
        return PDFResult(
            title=title[:200],
            description=abstract[:500] if abstract else None,
            url=url,
            download_url=pdf_url,
            source=self.name,
            authors=authors[:3],
            publication_date=str(year) if year else None,
            citation_count=citation_count,
            relevance_score=min(citation_count / 100, 1.0) if citation_count else 0.5,
            language="English",
            categories=[venue] if venue else None
        )

# Open Library Search Engine
class OpenLibrarySearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("Open Library")
        self.base_url = "https://openlibrary.org/search.json"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search Open Library for books"""
        try:
            params = {
                'q': query,
                'limit': max_results,
                'fields': 'key,title,author_name,first_publish_year,subject,language,ia,cover_i,publisher'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        docs = data.get('docs', [])
                        # Filter for books that have Internet Archive access
                        return [self._format_openlibrary_result(doc) for doc in docs if doc.get('ia')]
                    else:
                        logger.error(f"Open Library API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching Open Library: {e}")
            return []
    
    def _format_openlibrary_result(self, doc: Dict[str, Any]) -> PDFResult:
        """Convert Open Library result to PDFResult format"""
        title = doc.get('title', 'Untitled')
        authors = doc.get('author_name', [])
        year = doc.get('first_publish_year')
        subjects = doc.get('subject', [])
        language = doc.get('language', ['English'])
        ia_id = doc.get('ia', [])
        cover_id = doc.get('cover_i')
        key = doc.get('key', '')
        
        # Use first Internet Archive ID if available
        ia_identifier = ia_id[0] if isinstance(ia_id, list) and ia_id else ia_id
        
        url = f"https://openlibrary.org{key}"
        download_url = f"https://archive.org/download/{ia_identifier}/{ia_identifier}.pdf" if ia_identifier else None
        thumbnail_url = f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None
        
        return PDFResult(
            title=title[:200],
            description=f"Book from Open Library. Subjects: {', '.join(subjects[:3])}" if subjects else None,
            url=url,
            download_url=download_url,
            source=self.name,
            authors=authors[:3] if authors else [],
            publication_date=str(year) if year else None,
            language=language[0] if isinstance(language, list) and language else "English",
            thumbnail_url=thumbnail_url,
            categories=subjects[:5] if subjects else None,
            relevance_score=0.6
        )

# CORE Search Engine
class CORESearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("CORE")
        self.base_url = "https://api.core.ac.uk/v3/search/works"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search CORE for academic papers"""
        try:
            params = {
                'q': query,
                'limit': max_results,
                'scroll': 'false'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        results = data.get('results', [])
                        return [self._format_core_result(result) for result in results if result.get('downloadUrl')]
                    else:
                        logger.error(f"CORE API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching CORE: {e}")
            return []
    
    def _format_core_result(self, result: Dict[str, Any]) -> PDFResult:
        """Convert CORE result to PDFResult format"""
        title = result.get('title', 'Untitled')
        abstract = result.get('abstract', '')
        authors = result.get('authors', [])
        year = result.get('yearPublished')
        download_url = result.get('downloadUrl')
        doi = result.get('doi')
        language = result.get('language', {}).get('name', 'English')
        
        # Format authors
        author_names = []
        for author in authors:
            if isinstance(author, dict):
                name = author.get('name', '')
            else:
                name = str(author)
            if name:
                author_names.append(name)
        
        return PDFResult(
            title=title[:200],
            description=abstract[:500] if abstract else None,
            url=f"https://core.ac.uk/works/{result.get('id', '')}",
            download_url=download_url,
            source=self.name,
            authors=author_names[:3],
            publication_date=str(year) if year else None,
            doi=doi,
            language=language,
            relevance_score=0.7
        )

# Google Books Search Engine
class GoogleBooksSearch(BaseSearchEngine):
    def __init__(self):
        super().__init__("Google Books")
        self.base_url = "https://www.googleapis.com/books/v1/volumes"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[PDFResult]:
        """Search Google Books for books with PDF access"""
        try:
            params = {
                'q': query,
                'maxResults': max_results,
                'filter': 'free-ebooks',
                'printType': 'books'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        items = data.get('items', [])
                        return [self._format_googlebooks_result(item) for item in items]
                    else:
                        logger.error(f"Google Books API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching Google Books: {e}")
            return []
    
    def _format_googlebooks_result(self, item: Dict[str, Any]) -> PDFResult:
        """Convert Google Books result to PDFResult format"""
        volume_info = item.get('volumeInfo', {})
        access_info = item.get('accessInfo', {})
        
        title = volume_info.get('title', 'Untitled')
        authors = volume_info.get('authors', [])
        description = volume_info.get('description', '')
        published_date = volume_info.get('publishedDate')
        categories = volume_info.get('categories', [])
        language = volume_info.get('language', 'en')
        page_count = volume_info.get('pageCount')
        
        # Get URLs
        preview_link = volume_info.get('previewLink', '')
        pdf_link = access_info.get('pdf', {}).get('downloadLink')
        
        # Get thumbnail
        image_links = volume_info.get('imageLinks', {})
        thumbnail = image_links.get('thumbnail') or image_links.get('smallThumbnail')
        
        return PDFResult(
            title=title[:200],
            description=description[:500] if description else None,
            url=preview_link,
            download_url=pdf_link,
            source=self.name,
            authors=authors[:3],
            publication_date=published_date,
            language=language,
            page_count=page_count,
            thumbnail_url=thumbnail,
            categories=categories[:3],
            relevance_score=0.6
        )

# Multi-Source Search Manager
class MultiSourceSearchManager:
    def __init__(self):
        self.engines = {
            'archive': ArchiveOrgSearch(),
            'arxiv': ArxivSearch(),
            'semantic_scholar': SemanticScholarSearch(),
            'open_library': OpenLibrarySearch(),
            'core': CORESearch(),
            'google_books': GoogleBooksSearch()
        }
    
    async def search_all_sources(self, query: str, max_results: int = 20, selected_sources: List[str] = None) -> List[PDFResult]:
        """Search across multiple sources and aggregate results"""
        if selected_sources:
            engines_to_use = {k: v for k, v in self.engines.items() if k in selected_sources}
        else:
            engines_to_use = self.engines
        
        # Calculate results per source
        results_per_source = max(2, max_results // len(engines_to_use))
        
        # Create search tasks
        tasks = []
        for engine_name, engine in engines_to_use.items():
            task = asyncio.create_task(
                engine.search_pdfs(query, results_per_source),
                name=engine_name
            )
            tasks.append(task)
        
        # Execute searches in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Aggregate and deduplicate results
        all_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error in search engine {list(engines_to_use.keys())[i]}: {result}")
                continue
            all_results.extend(result)
        
        # Remove duplicates based on title similarity
        unique_results = self._deduplicate_results(all_results)
        
        # Sort by relevance score
        unique_results.sort(key=lambda x: x.relevance_score or 0, reverse=True)
        
        return unique_results[:max_results]
    
    def _deduplicate_results(self, results: List[PDFResult]) -> List[PDFResult]:
        """Remove duplicate results based on title similarity"""
        unique_results = []
        seen_titles = set()
        
        for result in results:
            # Normalize title for comparison
            normalized_title = re.sub(r'[^\w\s]', '', result.title.lower()).strip()
            if normalized_title and normalized_title not in seen_titles:
                seen_titles.add(normalized_title)
                unique_results.append(result)
        
        return unique_results

# Initialize search manager
search_manager = MultiSourceSearchManager()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "AI-Powered Multi-Source PDF Search Engine API", "version": "2.0.0"}

@api_router.post("/search", response_model=SearchResponse)
async def search_pdfs(request: SearchRequest):
    """Main search endpoint with AI-powered query enhancement across multiple sources"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Reformulate query using AI
        reformulated_query = await ai_engine.reformulate_query(request.query)
        logger.info(f"Original query: {request.query}")
        logger.info(f"Reformulated query: {reformulated_query}")
        
        # Search across multiple sources
        search_results = await search_manager.search_all_sources(
            reformulated_query, 
            request.max_results,
            request.sources
        )
        
        # Generate AI summaries for results (in batches to avoid rate limits)
        for result in search_results[:5]:  # Limit AI summaries to top 5 results
            try:
                result.ai_summary = await ai_engine.summarize_pdf_content(
                    result.title, 
                    result.description or "",
                    result.authors
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
            "sources_used": sources_used,
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
            sources_used=sources_used
        )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed. Please try again.")

@api_router.get("/sources")
async def get_available_sources():
    """Get list of available search sources"""
    sources = []
    for key, engine in search_manager.engines.items():
        sources.append({
            "id": key,
            "name": engine.name,
            "description": f"Search academic and research documents from {engine.name}"
        })
    return {"sources": sources}

@api_router.get("/suggestions")
async def get_search_suggestions(q: str = Query(..., description="Query to generate suggestions for")):
    """Get AI-powered search suggestions"""
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
            
            Since I cannot directly access the PDF content, please provide a general summary 
            of what this type of document typically contains based on its URL and context.
            Keep it under {request.max_length} characters.
            """
        )
        summary = await chat.send_message(message)
        
        return {"summary": summary.strip()[:request.max_length]}
    except Exception as e:
        logger.error(f"Error summarizing PDF: {e}")
        raise HTTPException(status_code=500, detail="Summarization failed")

@api_router.get("/search/history", response_model=List[Dict[str, Any]])
async def get_search_history(limit: int = Query(10, description="Number of recent searches to return")):
    """Get recent search history"""
    try:
        history = await db.search_history.find().sort("timestamp", -1).limit(limit).to_list(limit)
        return history
    except Exception as e:
        logger.error(f"Error fetching search history: {e}")
        return []

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "services": {
            "database": "connected",
            "openai": "configured" if ai_engine.openai_key else "missing_key",
            "search_engines": {
                "archive_org": "available",
                "arxiv": "available", 
                "semantic_scholar": "available",
                "open_library": "available",
                "core": "available",
                "google_books": "available"
            }
        },
        "version": "2.0.0"
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