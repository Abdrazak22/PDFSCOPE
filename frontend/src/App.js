import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);

  // Fetch available sources on component mount
  useEffect(() => {
    fetchAvailableSources();
  }, []);

  // Fetch available search sources
  const fetchAvailableSources = async () => {
    try {
      const response = await axios.get(`${API}/sources`);
      setAvailableSources(response.data.sources || []);
    } catch (error) {
      console.error("Error fetching sources:", error);
    }
  };

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Search function
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchPayload = {
        query: query.trim(),
        max_results: 20
      };
      
      // Add selected sources if any
      if (selectedSources.length > 0) {
        searchPayload.sources = selectedSources;
      }
      
      const response = await axios.post(`${API}/search`, searchPayload);
      setSearchResults(response.data);
      
      // Fetch suggestions
      const suggestionsResponse = await axios.get(`${API}/suggestions?q=${encodeURIComponent(query)}`);
      setSuggestions(suggestionsResponse.data.suggestions || []);
      
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults({ error: "Search failed. Please try again." });
    }
    setLoading(false);
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Toggle source selection
  const toggleSource = (sourceId) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  // PDF Viewer Component
  const PDFViewer = ({ pdf, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {pdf.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Source: {pdf.source}
              {pdf.authors && pdf.authors.length > 0 && ` • Authors: ${pdf.authors.join(', ')}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>
        <div className="flex-1 p-4">
          {pdf.download_url ? (
            <iframe
              src={`${pdf.download_url}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border rounded"
              title={pdf.title}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Direct PDF viewing not available for this document.
                </p>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  View on {pdf.source}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Search Result Card Component
  const SearchResultCard = ({ result }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {result.thumbnail_url && (
            <img
              src={result.thumbnail_url}
              alt={result.title}
              className="w-16 h-20 object-cover rounded border flex-shrink-0"
              onError={(e) => {e.target.style.display = 'none'}}
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
              {result.title}
            </h3>
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                {result.source}
              </span>
              {result.authors && result.authors.length > 0 && (
                <span>👤 {result.authors.slice(0, 2).join(', ')}</span>
              )}
              {result.publication_date && (
                <span>📅 {result.publication_date}</span>
              )}
              {result.citation_count && (
                <span>📊 {result.citation_count} citations</span>
              )}
              {result.file_size && <span>📄 {result.file_size}</span>}
              {result.language && result.language !== 'English' && (
                <span>🌐 {result.language}</span>
              )}
            </div>

            {/* Categories */}
            {result.categories && result.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {result.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            {/* AI Summary */}
            {result.ai_summary && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
                🤖 <span className="font-medium">AI Summary:</span> {result.ai_summary}
              </p>
            )}
            
            {/* Description */}
            {result.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                {result.description}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {result.download_url && (
                <button
                  onClick={() => setSelectedPdf(result)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  📖 Read Online
                </button>
              )}
              {result.download_url && (
                <a
                  href={result.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block"
                >
                  ⬇️ Download PDF
                </a>
              )}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-block"
              >
                🔗 View Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Source Filter Component
  const SourceFilter = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-6">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        🔍 Search Sources {selectedSources.length > 0 && `(${selectedSources.length} selected)`}
      </h4>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSources([])}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
            selectedSources.length === 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All Sources
        </button>
        {availableSources.map((source) => (
          <button
            key={source.id}
            onClick={() => toggleSource(source.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedSources.includes(source.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {source.name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">📚</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI PDF Search
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Multi-Source Intelligent Discovery Platform
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Find PDFs from Multiple Academic Sources
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-4xl mx-auto">
            Search across arXiv, Semantic Scholar, Open Library, CORE, Google Books, Archive.org and more. 
            Our AI understands your intent and finds exactly what you need.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search for research papers, books, documents... e.g. 'machine learning transformers', 'quantum computing algorithms'"
                className="w-full px-6 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Source Filter */}
          {availableSources.length > 0 && <SourceFilter />}
        </div>

        {/* Search Results */}
        {searchResults && (
          <div className="mb-8">
            {searchResults.error ? (
              <div className="text-center py-12">
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg inline-block">
                  {searchResults.error}
                </div>
              </div>
            ) : (
              <>
                {/* Search Info */}
                <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Search Results for: "{searchResults.query}"
                      </h3>
                      {searchResults.reformulated_query && searchResults.reformulated_query !== searchResults.query && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          🤖 AI enhanced query: "{searchResults.reformulated_query}"
                        </p>
                      )}
                      {searchResults.sources_used && searchResults.sources_used.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Sources:</span>
                          {searchResults.sources_used.map((source, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                            >
                              {source}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Found {searchResults.total_found} results in {searchResults.search_time}s
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                {searchResults.results && searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {searchResults.results.map((result, index) => (
                      <SearchResultCard key={result.id || index} result={result} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-gray-500 dark:text-gray-400 mb-4">
                      <span className="text-6xl">📭</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No documents found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try different keywords or check the suggestions below
                    </p>
                  </div>
                )}

                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      🤖 AI Suggestions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Welcome Message */}
        {!searchResults && (
          <div className="text-center py-16">
            <div className="mb-8">
              <span className="text-8xl">🔍📚</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Start Your Multi-Source Search
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Our AI searches across multiple academic databases simultaneously, including arXiv, Semantic Scholar, 
              Open Library, CORE, Google Books, and Archive.org. Find the most relevant documents from millions of sources.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-4">🧠</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Semantic search with intelligent query enhancement
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-4">🌐</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Multi-Source</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Search across 6+ academic databases simultaneously
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-4">⚡</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Real-Time</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Parallel search across millions of documents
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                <div className="text-3xl mb-4">📖</div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Built-in Reader</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Read PDFs directly with integrated viewer
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PDF Viewer Modal */}
      {selectedPdf && (
        <PDFViewer 
          pdf={selectedPdf} 
          onClose={() => setSelectedPdf(null)} 
        />
      )}
    </div>
  );
}

export default App;