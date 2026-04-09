import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  Star,
  Filter,
  ChevronLeft,
  Building2,
  User,
  Clock,
  ChevronDown,
  Loader2,
  X,
  SlidersHorizontal,
  Phone,
  Navigation,
  Globe,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { Hospital, EscortProfile, PaginatedResponse } from '../types';
import { SearchBar } from './SearchBar';
import { NativeWebSearch } from './NativeWebSearch';

interface SearchResultsProps {
  lang: 'zh' | 'en';
  onBack: () => void;
  initialQuery?: string;
  initialType?: 'hospital' | 'escort' | 'all' | 'web';
}

type SearchType = 'hospital' | 'escort' | 'all' | 'web';
type SortOption = 'rating' | 'distance' | 'price' | 'orders' | 'name';

export const SearchResults: React.FC<SearchResultsProps> = ({ lang, onBack, initialQuery = '', initialType = 'all' }) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [activeTab, setActiveTab] = useState<'hospitals' | 'escorts' | 'web'>(
    initialType === 'escort' ? 'escorts' : initialType === 'web' ? 'web' : 'hospitals'
  );

  // Results state
  const [hospitals, setHospitals] = useState<PaginatedResponse<Hospital> | null>(null);
  const [escorts, setEscorts] = useState<PaginatedResponse<EscortProfile> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minRating, setMinRating] = useState<number>(0);
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Options
  const [departments, setDepartments] = useState<string[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);

  const t = {
    zh: {
      title: '搜索结果',
      back: '返回',
      hospitals: '医院',
      escorts: '陪诊师',
      web: '全网',
      all: '全部',
      filters: '筛选',
      sortBy: '排序',
      rating: '评分',
      distance: '距离',
      price: '价格',
      orders: '订单数',
      name: '名称',
      ascending: '升序',
      descending: '降序',
      minRating: '最低评分',
      priceRange: '价格范围',
      department: '科室',
      specialty: '专长',
      clearFilters: '清除筛选',
      applyFilters: '应用筛选',
      noResults: '暂无搜索结果',
      tryDifferent: '尝试不同的关键词或筛选条件',
      loading: '搜索中...',
      error: '搜索失败，请重试',
      loadMore: '加载更多',
      page: '页',
      of: '共',
      results: '个结果',
      hospitalLevel: '等级',
      address: '地址',
      phone: '电话',
      hourlyRate: '元/小时',
      completedOrders: '已完成订单',
      verified: '已认证',
    },
    en: {
      title: 'Search Results',
      back: 'Back',
      hospitals: 'Hospitals',
      escorts: 'Escorts',
      web: 'Web',
      all: 'All',
      filters: 'Filters',
      sortBy: 'Sort by',
      rating: 'Rating',
      distance: 'Distance',
      price: 'Price',
      orders: 'Orders',
      name: 'Name',
      ascending: 'Ascending',
      descending: 'Descending',
      minRating: 'Min Rating',
      priceRange: 'Price Range',
      department: 'Department',
      specialty: 'Specialty',
      clearFilters: 'Clear Filters',
      applyFilters: 'Apply Filters',
      noResults: 'No results found',
      tryDifferent: 'Try different keywords or filters',
      loading: 'Searching...',
      error: 'Search failed, please try again',
      loadMore: 'Load More',
      page: 'Page',
      of: 'of',
      results: 'results',
      hospitalLevel: 'Level',
      address: 'Address',
      phone: 'Phone',
      hourlyRate: '/hour',
      completedOrders: 'Completed Orders',
      verified: 'Verified',
    },
  }[lang];

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [depts, specs] = await Promise.all([
          apiService.getDepartments(),
          apiService.getSpecialties(),
        ]);
        setDepartments(depts);
        setSpecialties(specs);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    loadOptions();
  }, []);

  // Perform search
  const performSearch = useCallback(async (
    query: string,
    type: SearchType,
    page: number = 1,
    append: boolean = false
  ) => {
    if (!query.trim() && type === 'all') return;

    setIsLoading(true);
    setError(null);

    try {
      if (type === 'all' || type === 'hospital') {
        const hospitalParams = {
          keyword: query,
          department: selectedDepartment || undefined,
          minRating: minRating > 0 ? minRating : undefined,
          page,
          limit: 20,
          sortBy,
          sortOrder,
        };

        const hospitalResults = await apiService.searchHospitals(hospitalParams);
        setHospitals(prev => {
          if (append && prev) {
            return {
              ...hospitalResults,
              data: [...prev.data, ...hospitalResults.data],
            };
          }
          return hospitalResults;
        });
      }

      if (type === 'all' || type === 'escort') {
        const escortParams = {
          keyword: query,
          specialty: selectedSpecialty || undefined,
          minRating: minRating > 0 ? minRating : undefined,
          minPrice: priceRange.min,
          maxPrice: priceRange.max,
          page,
          limit: 20,
          sortBy,
          sortOrder,
        };

        const escortResults = await apiService.searchEscorts(escortParams);
        setEscorts(prev => {
          if (append && prev) {
            return {
              ...escortResults,
              data: [...prev.data, ...escortResults.data],
            };
          }
          return escortResults;
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDepartment, selectedSpecialty, minRating, priceRange, sortBy, sortOrder, t.error]);

  // Initial search
  useEffect(() => {
    if (searchQuery) {
      performSearch(searchQuery, searchType);
    }
  }, []); // Run once on mount

  // Handle search from SearchBar
  const handleSearch = useCallback((query: string, type: SearchType) => {
    setSearchQuery(query);
    setSearchType(type);

    if (type === 'hospital') {
      setActiveTab('hospitals');
    } else if (type === 'escort') {
      setActiveTab('escorts');
    } else if (type === 'web') {
      setActiveTab('web');
    }

    performSearch(query, type);
  }, [performSearch]);

  // Handle filter apply
  const handleApplyFilters = useCallback(() => {
    performSearch(searchQuery, searchType);
    setShowFilters(false);
  }, [searchQuery, searchType, performSearch]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setSortBy('rating');
    setSortOrder('desc');
    setMinRating(0);
    setPriceRange({});
    setSelectedDepartment('');
    setSelectedSpecialty('');
    performSearch(searchQuery, searchType);
    setShowFilters(false);
  }, [searchQuery, searchType, performSearch]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    const currentPage = activeTab === 'hospitals'
      ? (hospitals?.page || 1)
      : (escorts?.page || 1);

    if (activeTab === 'hospitals' && hospitals && hospitals.page < hospitals.totalPages) {
      performSearch(searchQuery, 'hospital', currentPage + 1, true);
    } else if (activeTab === 'escorts' && escorts && escorts.page < escorts.totalPages) {
      performSearch(searchQuery, 'escort', currentPage + 1, true);
    }
  }, [activeTab, hospitals, escorts, searchQuery, performSearch]);

  // Get current results
  const currentResults = activeTab === 'hospitals' ? hospitals : escorts;
  const hasMore = currentResults ? currentResults.page < currentResults.totalPages : false;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          </button>
          <div className="flex-1">
            <SearchBar
              lang={lang}
              onSearch={handleSearch}
              placeholder={searchQuery}
            />
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative"
          >
            <SlidersHorizontal className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            {(minRating > 0 || selectedDepartment || selectedSpecialty || priceRange.min || priceRange.max) && (
              <span className="absolute top-1 right-1 h-2 w-2 bg-teal-500 rounded-full" />
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${
              activeTab === 'hospitals'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Building2 className="h-4 w-4" />
              {t.hospitals}
              {hospitals && (
                <span className="text-xs text-slate-400">({hospitals.total})</span>
              )}
            </span>
            {activeTab === 'hospitals' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('escorts')}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${
              activeTab === 'escorts'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              {t.escorts}
              {escorts && (
                <span className="text-xs text-slate-400">({escorts.total})</span>
              )}
            </span>
            {activeTab === 'escorts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('web')}
            className={`flex-1 py-3 text-sm font-medium relative transition-colors ${
              activeTab === 'web'
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Globe className="h-4 w-4" />
              {t.web}
            </span>
            {activeTab === 'web' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="p-4">
        {activeTab === 'web' ? (
          <NativeWebSearch query={searchQuery} lang={lang} />
        ) : isLoading && !currentResults?.data.length ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-teal-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">{t.loading}</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => performSearch(searchQuery, searchType)}
              className="px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
            >
              {t.loading}
            </button>
          </div>
        ) : currentResults?.data.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              {t.noResults}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">{t.tryDifferent}</p>
          </div>
        ) : (
          <>
            {/* Results count */}
            {currentResults && (
              <div className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                {t.page} {currentResults.page} {t.of} {currentResults.totalPages} · {currentResults.total} {t.results}
              </div>
            )}

            {/* Hospital Results */}
            {activeTab === 'hospitals' && hospitals?.data.map((hospital) => (
              <div
                key={hospital.id}
                className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                      {hospital.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                      <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded text-xs">
                        {hospital.level}
                      </span>
                      <span>{hospital.department}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="truncate">{hospital.address}</span>
                    </div>
                    {hospital.phone && (
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 mt-1">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{hospital.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-medium">{hospital.rating || '-'}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Escort Results */}
            {activeTab === 'escorts' && escorts?.data.map((escort) => (
              <div
                key={escort.id}
                className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-3 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={escort.imageUrl || `https://picsum.photos/100/100?random=${escort.id}`}
                    alt={escort.name}
                    className="h-16 w-16 rounded-full object-cover bg-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {escort.name}
                      </h3>
                      {escort.isCertified && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {t.verified}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {escort.rating}
                      </span>
                      <span>·</span>
                      <span>{escort.completedOrders} {t.completedOrders}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {escort.specialties?.slice(0, 3).map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                    {(escort as any).distance && (
                      <div className="flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400">
                        <Navigation className="h-3.5 w-3.5" />
                        <span>{(escort as any).distance}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-teal-600 dark:text-teal-400">
                      ¥{(escort as any).hourlyRate || '-'}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.hourlyRate}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full py-3 mt-4 text-teal-600 dark:text-teal-400 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-xl transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.loading}
                  </span>
                ) : (
                  t.loadMore
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t.filters}
              </h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t.sortBy}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['rating', 'distance', 'price', 'orders', 'name'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        sortBy === option
                          ? 'bg-teal-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t[option]}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortOrder === 'asc'
                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.ascending}
                  </button>
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      sortOrder === 'desc'
                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {t.descending}
                  </button>
                </div>
              </div>

              {/* Min Rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  {t.minRating}: {minRating > 0 ? `${minRating}+` : t.all}
                </label>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0</span>
                  <span>5</span>
                </div>
              </div>

              {/* Department Filter (for hospitals) */}
              {activeTab === 'hospitals' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t.department}
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">{t.all}</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specialty Filter (for escorts) */}
              {activeTab === 'escorts' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t.specialty}
                  </label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">{t.all}</option>
                    {specialties.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range (for escorts) */}
              {activeTab === 'escorts' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {t.priceRange}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min || ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-slate-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max || ''}
                      onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value ? parseInt(e.target.value) : undefined }))}
                      className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Filter Actions */}
            <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
              <button
                onClick={handleApplyFilters}
                className="w-full py-3 bg-teal-500 text-white font-medium rounded-xl hover:bg-teal-600 transition-colors"
              >
                {t.applyFilters}
              </button>
              <button
                onClick={handleClearFilters}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t.clearFilters}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
