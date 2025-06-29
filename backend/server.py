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
from urllib.parse import quote
import json

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
    description="Intelligent PDF discovery and search platform",
    version="1.0.0"
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class SearchRequest(BaseModel):
    query: str
    max_results: Optional[int] = 10
    filter_type: Optional[str] = None

class PDFResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    url: str
    download_url: str
    source: str
    file_size: Optional[str] = None
    page_count: Optional[int] = None
    language: Optional[str] = None
    thumbnail_url: Optional[str] = None
    relevance_score: Optional[float] = None
    ai_summary: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    reformulated_query: Optional[str] = None
    results: List[PDFResult]
    total_found: int
    search_time: float
    suggestions: List[str] = []

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
            system_message="You are an intelligent PDF search assistant. Help users find relevant academic papers, documents, and books by understanding their intent and reformulating queries for better results."
        ).with_model("openai", "gpt-4o").with_max_tokens(2048)
    
    async def reformulate_query(self, original_query: str) -> str:
        """Use AI to improve search queries"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                Original query: "{original_query}"
                
                Please reformulate this query to be more effective for searching academic PDFs and documents. 
                Make it more specific and add relevant academic terms if appropriate.
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
                Focus on academic and research topics.
                Return only the suggestions, one per line.
                """
            )
            response = await chat.send_message(message)
            suggestions = [s.strip() for s in response.split('\n') if s.strip()]
            return suggestions[:3]
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return []
    
    async def summarize_pdf_content(self, title: str, description: str = "") -> str:
        """Generate AI summary for PDF based on metadata"""
        try:
            chat = await self.create_chat_instance()
            message = UserMessage(
                text=f"""
                PDF Title: {title}
                Description: {description}
                
                Based on the title and description, provide a brief 2-3 sentence summary of what this PDF likely contains.
                Focus on the main topic and potential value to readers.
                """
            )
            response = await chat.send_message(message)
            return response.strip()
        except Exception as e:
            logger.error(f"Error generating PDF summary: {e}")
            return "AI summary not available"

# Initialize AI engine
ai_engine = AISearchEngine()

# Archive.org Integration
class ArchiveOrgSearch:
    def __init__(self):
        self.base_url = "https://archive.org/advancedsearch.php"
        
    async def search_pdfs(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Search Archive.org for PDF documents"""
        try:
            # Build search parameters
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
                        return data.get('response', {}).get('docs', [])
                    else:
                        logger.error(f"Archive.org API returned status {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error searching Archive.org: {e}")
            return []
    
    def format_result(self, doc: Dict[str, Any]) -> PDFResult:
        """Convert Archive.org result to our PDFResult format"""
        identifier = doc.get('identifier', '')
        title = doc.get('title', ['Untitled'])[0] if isinstance(doc.get('title'), list) else doc.get('title', 'Untitled')
        description = doc.get('description', [''])[0] if isinstance(doc.get('description'), list) else doc.get('description', '')
        
        # Construct URLs
        base_url = f"https://archive.org/details/{identifier}"
        download_url = f"https://archive.org/download/{identifier}/{identifier}.pdf"
        thumbnail_url = f"https://archive.org/services/img/{identifier}"
        
        # Extract additional metadata
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
            title=title[:200],  # Limit title length
            description=description[:500] if description else None,
            url=base_url,
            download_url=download_url,
            source="Archive.org",
            file_size=file_size_str,
            language=language,
            thumbnail_url=thumbnail_url,
            relevance_score=min(float(downloads) / 1000, 1.0) if downloads else 0.1
        )

# Initialize Archive.org search
archive_search = ArchiveOrgSearch()

# API Routes
@api_router.get("/")
async def root():
    return {"message": "AI-Powered PDF Search Engine API", "version": "1.0.0"}

@api_router.post("/search", response_model=SearchResponse)
async def search_pdfs(request: SearchRequest):
    """Main search endpoint with AI-powered query enhancement"""
    start_time = asyncio.get_event_loop().time()
    
    try:
        # Reformulate query using AI
        reformulated_query = await ai_engine.reformulate_query(request.query)
        logger.info(f"Original query: {request.query}")
        logger.info(f"Reformulated query: {reformulated_query}")
        
        # Search Archive.org using reformulated query
        search_results = await archive_search.search_pdfs(
            reformulated_query, 
            request.max_results
        )
        
        # Format results
        pdf_results = []
        for doc in search_results:
            try:
                pdf_result = archive_search.format_result(doc)
                
                # Generate AI summary for each result
                pdf_result.ai_summary = await ai_engine.summarize_pdf_content(
                    pdf_result.title, 
                    pdf_result.description or ""
                )
                
                pdf_results.append(pdf_result)
            except Exception as e:
                logger.error(f"Error formatting result: {e}")
                continue
        
        # Generate search suggestions
        suggestions = await ai_engine.generate_suggestions(request.query)
        
        # Calculate search time
        search_time = round(asyncio.get_event_loop().time() - start_time, 2)
        
        # Store search in database for analytics
        search_record = {
            "id": str(uuid.uuid4()),
            "original_query": request.query,
            "reformulated_query": reformulated_query,
            "results_count": len(pdf_results),
            "timestamp": datetime.utcnow(),
            "search_time": search_time
        }
        await db.search_history.insert_one(search_record)
        
        return SearchResponse(
            query=request.query,
            reformulated_query=reformulated_query,
            results=pdf_results,
            total_found=len(pdf_results),
            search_time=search_time,
            suggestions=suggestions
        )
        
    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed. Please try again.")

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
        # For now, we'll generate a summary based on the PDF URL/title
        # In a full implementation, you'd extract text from the PDF first
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
            "archive_org": "available"
        }
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