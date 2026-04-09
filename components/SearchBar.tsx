import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, MapPin, Star, Loader2, Globe } from 'lucide-react';
import { apiService } from '../services/apiService';
import { SearchSuggestion, SearchHistoryItem } from '../types';

interface SearchBarProps {
  lang: 'zh' | 'en';
  onSearch: (query: string, type: 'hospital' | 'escort' | 'all' | 'web') => void;
  placeholder?: string;
  className?: string;
}

const SEARCH_HISTORY_KEY = 'medimate_search_history';
const MAX_HISTORY_ITEMS = 10;
const DEBOUNCE_DELAY = 300;

export const SearchBar: React.FC<SearchBarProps> = ({
  lang,
  onSearch,
  placeholder,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const t = {
    zh: {
      searchPlaceholder: placeholder || '搜索医院 / 陪诊师 / 科室',
      recentSearches: '最近搜索',
      clearHistory: '清除历史',
      suggestions: '搜索建议',
      noResults: '暂无搜索结果',
      hotSearch: '热门搜索',
      hospital: '医院',
      escort: '陪诊师',
      search: '内置搜索',
      searchWeb: '全网搜索',
    },
    en: {
      searchPlaceholder: placeholder || 'Search hospitals / escorts / departments',
      recentSearches: 'Recent Searches',
      clearHistory: 'Clear History',
      suggestions: 'Suggestions',
      noResults: 'No results found',
      hotSearch: 'Hot Search',
      hospital: 'Hospital',
      escort: 'Escort',
      search: 'Search',
      searchWeb: 'Search Web',
    },
  }[lang];

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSearchHistory(parsed);
      } catch {
        console.error('Failed to parse search history');
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = useCallback((history: SearchHistoryItem[]) => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  }, []);

  // Add to search history
  const addToHistory = useCallback((searchQuery: string, type: 'hospital' | 'escort' | 'all' | 'web') => {
    if (!searchQuery.trim()) return;

    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.query !== searchQuery);
      const newItem: SearchHistoryItem = {
        id: Date.now().toString(),
        query: searchQuery,
        type,
        timestamp: Date.now(),
      };
      const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      saveSearchHistory(newHistory);
      return newHistory;
    });
  }, [saveSearchHistory]);

  // Clear search history
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch both hospital and escort suggestions
      const [hospitalSuggestions, escortSuggestions] = await Promise.all([
        apiService.getHospitalSuggestions(searchQuery, 5),
        apiService.getEscortSuggestions(searchQuery, 5),
      ]);

      // Combine and limit results
      const combined = [...hospitalSuggestions, ...escortSuggestions].slice(0, 10);
      setSuggestions(combined);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim()) {
      setShowHistory(false);
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, DEBOUNCE_DELAY);
    } else {
      setSuggestions([]);
      setShowHistory(true);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle search submission
  const handleSearch = useCallback((searchQuery: string, type: 'hospital' | 'escort' | 'all' | 'web' = 'all') => {
    if (!searchQuery.trim()) return;

    addToHistory(searchQuery, type);
    onSearch(searchQuery, type);
    setIsFocused(false);
    setQuery('');
  }, [addToHistory, onSearch]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    handleSearch(suggestion.name, suggestion.type);
  }, [handleSearch]);

  // Handle history item click
  const handleHistoryClick = useCallback((item: SearchHistoryItem) => {
    handleSearch(item.query, item.type);
  }, [handleSearch]);

  // Handle key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  }, [query, handleSearch]);

  // Remove history item
  const removeHistoryItem = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      saveSearchHistory(newHistory);
      return newHistory;
    });
  }, [saveSearchHistory]);

  // Clear input
  const clearInput = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowHistory(true);
    inputRef.current?.focus();
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="group relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={t.searchPlaceholder}
          className="bg-slate-100 dark:bg-slate-800 w-full rounded-full py-3 pl-12 pr-10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-teal-500 transition-all"
        />
        {query && (
          <button
            onClick={clearInput}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t.suggestions}
              </div>
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.type}-${suggestion.id}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  {suggestion.type === 'hospital' ? (
                    <MapPin className="h-4 w-4 text-teal-500 flex-shrink-0" />
                  ) : (
                    <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {suggestion.name}
                    </div>
                    {suggestion.subtitle && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {suggestion.subtitle}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">
                    {suggestion.type === 'hospital' ? t.hospital : t.escort}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Web Search Option */}
          {query && (
            <div className="py-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => {
                  handleSearch(query, 'web');
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left text-teal-600 dark:text-teal-400"
              >
                <Globe className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {t.searchWeb} &quot;{query}&quot;
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Recent Searches */}
          {showHistory && searchHistory.length > 0 && (
            <div className="py-2 border-t border-slate-100 dark:border-slate-700">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t.recentSearches}
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {t.clearHistory}
                </button>
              </div>
              {searchHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left group cursor-pointer"
                >
                  <Clock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white truncate">
                      {item.query}
                    </div>
                  </div>
                  <button
                    onClick={(e) => removeHistoryItem(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-all"
                    aria-label="Remove from history"
                  >
                    <X className="h-3 w-3 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {query && !isLoading && suggestions.length === 0 && (
            <div className="py-8 text-center">
              <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">{t.noResults}</p>
              <button
                onClick={() => handleSearch(query)}
                className="mt-3 px-4 py-2 bg-teal-500 text-white rounded-full text-sm font-medium hover:bg-teal-600 transition-colors"
              >
                {t.search} &quot;{query}&quot;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
