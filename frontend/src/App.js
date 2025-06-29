import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Main App Component
function App() {
  const [darkMode, setDarkMode] = useState(false); // Default to light mode like PDFFiller
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [dateRange, setDateRange] = useState("2015-2025");

  // Dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Search function with Google priority
  const handleSearch = async (query = searchQuery) => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const searchPayload = {
        query: query.trim(),
        max_results: 20,
        date_range: dateRange,
        priority_google: true
      };
      
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

  // PDF Viewer Component
  const PDFViewer = ({ pdf, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-800 truncate">
              {pdf.title}
            </h3>
            <div className="flex items-center space-x-3 mt-2 text-sm text-gray-600">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                {pdf.source}
              </span>
              {pdf.domain && <span className="text-gray-500">🌐 {pdf.domain}</span>}
              {pdf.publication_date && <span className="text-gray-500">📅 {pdf.publication_date}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 text-3xl font-light"
          >
            ×
          </button>
        </div>
        <div className="flex-1 p-6">
          {pdf.download_url ? (
            <iframe
              src={`${pdf.download_url}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full rounded-lg border border-gray-200"
              title={pdf.title}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-gray-400 text-6xl mb-4">📄</div>
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  Direct PDF viewing not available
                </h4>
                <p className="text-gray-600 mb-6">
                  This document needs to be viewed on the original source.
                </p>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  View on {pdf.source}
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Enhanced Search Result Card Component
  const SearchResultCard = ({ result, index }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start space-x-4">
          {result.thumbnail_url ? (
            <img
              src={result.thumbnail_url}
              alt={result.title}
              className="w-16 h-20 object-cover rounded-lg border border-gray-200 flex-shrink-0"
              onError={(e) => {e.target.style.display = 'none'}}
            />
          ) : (
            <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Title with source indicator */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-800 line-clamp-2 flex-1 group-hover:text-blue-600 transition-colors">
                {result.title}
              </h3>
              {result.source === 'Google PDF Search' && (
                <span className="ml-3 flex-shrink-0 bg-gradient-to-r from-blue-500 to-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Google
                </span>
              )}
            </div>
            
            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {result.domain && (
                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  {result.domain}
                </span>
              )}
              
              {result.publication_date && (
                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {result.publication_date}
                </span>
              )}
              
              {result.file_size && (
                <span className="inline-flex items-center px-3 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-full border border-gray-200">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {result.file_size}
                </span>
              )}
            </div>

            {/* Categories */}
            {result.categories && result.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {result.categories.slice(0, 3).map((category, index) => (
                  <span
                    key={index}
                    className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-200"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}
            
            {/* AI Summary */}
            {result.ai_summary && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg mb-4 border border-blue-100">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">AI Summary</p>
                    <p className="text-sm text-blue-600 line-clamp-3">{result.ai_summary}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Description */}
            {result.description && (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {result.description}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {result.download_url && (
                <button
                  onClick={() => setSelectedPdf(result)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Read PDF
                </button>
              )}
              {result.download_url && (
                <a
                  href={result.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </a>
              )}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Source
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Date Range Filter Component
  const DateRangeFilter = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Publication Date Range
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: "2020-2025", label: "2020-2025", desc: "Latest" },
          { value: "2015-2025", label: "2015-2025", desc: "Recent" },
          { value: "2010-2025", label: "2010-2025", desc: "Modern" },
          { value: "2000-2025", label: "2000-2025", desc: "All Recent" }
        ].map((range) => (
          <button
            key={range.value}
            onClick={() => setDateRange(range.value)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              dateRange === range.value
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            <div className="font-medium">{range.label}</div>
            <div className="text-sm text-gray-500">{range.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header - PDFFiller inspired */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    PDF<span className="text-blue-600">Finder</span>
                  </h1>
                  <p className="text-sm text-gray-600">
                    AI-Powered PDF Discovery
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              
              <div className="hidden md:flex space-x-6 text-sm">
                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Features</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">About</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">Help</a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - PDFFiller inspired */}
      <section className="bg-gradient-to-br from-blue-50 to-green-50 py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Find Any PDF Document
            <span className="block text-blue-600">Powered by Google AI</span>
          </h2>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto">
            Search millions of recent PDFs from Google's comprehensive index. 
            Find research papers, reports, and documents from 2000-2025 with AI-enhanced discovery.
          </p>
          
          {/* Enhanced Search Bar */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
              <div className="flex items-center">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Search for PDFs... e.g. 'machine learning 2023', 'climate research'"
                    className="w-full pl-12 pr-4 py-4 text-lg text-gray-800 placeholder-gray-500 bg-transparent focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={loading}
                  className="ml-4 px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 disabled:from-blue-400 disabled:to-green-400 text-white font-semibold rounded-xl transition-all flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-blue-600 mb-2">Millions</div>
              <div className="text-gray-600">PDF Documents</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-green-600 mb-2">2000-2025</div>
              <div className="text-gray-600">Recent Focus</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-2xl font-bold text-purple-600 mb-2">AI-Powered</div>
              <div className="text-gray-600">Smart Search</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Date Range Filter */}
        {searchResults && <DateRangeFilter />}

        {/* Search Results */}
        {searchResults && (
          <div className="mb-12">
            {searchResults.error ? (
              <div className="text-center py-16">
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl inline-block">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{searchResults.error}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Enhanced Search Info */}
                <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Search Results for "{searchResults.query}"
                      </h3>
                      {searchResults.reformulated_query && searchResults.reformulated_query !== searchResults.query && (
                        <p className="text-sm text-blue-600 mb-3 bg-blue-50 px-3 py-2 rounded-lg">
                          <span className="font-medium">AI Enhanced:</span> "{searchResults.reformulated_query}"
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-sm font-medium text-gray-700">Sources:</span>
                        {searchResults.sources_used && searchResults.sources_used.map((source, index) => (
                          <span
                            key={index}
                            className={`text-xs px-3 py-1 rounded-full font-medium ${
                              source === 'Google PDF Search'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {source}
                            {source === 'Google PDF Search' && ` (${searchResults.google_results_count || 0})`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">{searchResults.total_found}</div>
                      <div className="text-sm text-gray-600">results in {searchResults.search_time}s</div>
                      {searchResults.google_results_count && (
                        <div className="text-sm text-blue-600 font-medium">
                          {searchResults.google_results_count} from Google
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Grid */}
                {searchResults.results && searchResults.results.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                    {searchResults.results.map((result, index) => (
                      <SearchResultCard key={result.id || index} result={result} index={index} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-gray-400 text-8xl mb-6">📭</div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                      No PDFs found
                    </h3>
                    <p className="text-gray-600 mb-8">
                      Try different keywords or adjust your search parameters
                    </p>
                  </div>
                )}

                {/* AI Suggestions */}
                {suggestions.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Related Searches
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            handleSearch(suggestion);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 text-blue-700 border border-blue-200 rounded-lg transition-colors font-medium"
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

        {/* Welcome/Features Section */}
        {!searchResults && (
          <section className="py-16">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-gray-800 mb-6">
                Why Choose PDFFinder?
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Our AI-powered search engine gives you access to millions of recent PDF documents 
                through Google's comprehensive index, with intelligent filtering and discovery features.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Google-Powered</h4>
                <p className="text-gray-600">
                  Search millions of PDFs from Google's massive and comprehensive document index.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Recent Focus</h4>
                <p className="text-gray-600">
                  Prioritizes documents from 2000-2025 to ensure you find the most current research.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">AI-Enhanced</h4>
                <p className="text-gray-600">
                  Smart query optimization and automatic summaries for better search results.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-800 mb-3">Lightning Fast</h4>
                <p className="text-gray-600">
                  Real-time search results from Google's infrastructure with instant PDF access.
                </p>
              </div>
            </div>
          </section>
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