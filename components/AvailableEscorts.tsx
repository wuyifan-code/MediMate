import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  MapPin,
  Clock,
  BadgeCheck,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Calendar,
  X,
  Loader2,
  Heart,
  ArrowRight,
  CheckCircle,
  Tag,
  ArrowDownUp
} from 'lucide-react';
import { apiService } from '../services/apiService';

export type Language = 'zh' | 'en';
export type ServiceType = 'ALL' | 'FULL_PROCESS' | 'APPOINTMENT' | 'REPORT_PICKUP' | 'MEDICINE_PICKUP' | 'VIP_TRANSPORT';
export type SortBy = 'rating' | 'price' | 'distance';

interface EscortService {
  id: string;
  serviceType: ServiceType;
  title: string;
  description: string;
  pricePerHour: number;
  startDate: string;
  endDate: string;
  availableWeekdays: number[];
  timeSlots: { start: string; end: string }[];
  areas: string[];
  tags: string[];
  maxDailyOrders: number;
  isActive: boolean;
  escort: {
    id: string;
    userId: string;
    rating: number;
    reviewCount: number;
    completedOrders: number;
    isVerified: boolean;
    specialties: string[];
    bio: string;
    user: {
      id: string;
      name: string;
      avatarUrl: string;
    };
  };
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface AvailabilityResponse {
  date: string;
  timeSlots: TimeSlot[];
  isAvailable: boolean;
}

interface AvailableEscortsProps {
  lang: Language;
  onBook: (service: EscortService, slot: TimeSlot & { date: string }) => void;
}

const SERVICE_TYPES: { value: ServiceType; label: { zh: string; en: string } }[] = [
  { value: 'ALL', label: { zh: '全部服务', en: 'All Services' } },
  { value: 'FULL_PROCESS', label: { zh: '全程陪诊', en: 'Full Service' } },
  { value: 'APPOINTMENT', label: { zh: '代约挂号', en: 'Appointment' } },
  { value: 'REPORT_PICKUP', label: { zh: '代取报告', en: 'Report Pickup' } },
  { value: 'MEDICINE_PICKUP', label: { zh: '代办买药', en: 'Medicine Pickup' } },
  { value: 'VIP_TRANSPORT', label: { zh: '专车接送', en: 'VIP Transport' } },
];

const WEEKDAYS = [
  { value: 0, label: { zh: '周日', en: 'Sun' } },
  { value: 1, label: { zh: '周一', en: 'Mon' } },
  { value: 2, label: { zh: '周二', en: 'Tue' } },
  { value: 3, label: { zh: '周三', en: 'Wed' } },
  { value: 4, label: { zh: '周四', en: 'Thu' } },
  { value: 5, label: { zh: '周五', en: 'Fri' } },
  { value: 6, label: { zh: '周六', en: 'Sat' } },
];

export const AvailableEscorts: React.FC<AvailableEscortsProps> = ({
  lang,
  onBook,
}) => {
  // State
  const [services, setServices] = useState<EscortService[]>([]);
  const [filteredServices, setFilteredServices] = useState<EscortService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>('ALL');
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [areaSearch, setAreaSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Booking modal
  const [selectedService, setSelectedService] = useState<EscortService | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  
  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const t = {
    zh: {
      searchPlaceholder: '搜索区域或服务...',
      filter: '筛选',
      sort: '排序',
      serviceType: '服务类型',
      priceRange: '价格范围',
      minPrice: '最低价',
      maxPrice: '最高价',
      area: '服务区域',
      areaPlaceholder: '输入区域名称',
      resetFilters: '重置筛选',
      applyFilters: '应用筛选',
      sortByRating: '按评分排序',
      sortByPrice: '按价格排序',
      sortByDistance: '按距离排序',
      rating: '评分',
      reviews: '评价',
      completedOrders: '单',
      perHour: '/ 小时',
      availableAreas: '服务区域',
      availableDates: '可预约日期',
      tags: '标签',
      verified: '已认证',
      notVerified: '未认证',
      bookNow: '立即预约',
      viewDetails: '查看详情',
      noServices: '暂无符合条件的服务',
      tryAdjusting: '请尝试调整筛选条件或搜索关键词',
      loading: '正在为您寻找优质陪诊师...',
      error: '加载失败，请重试',
      selectDate: '选择日期',
      selectTime: '选择时间段',
      availableSlots: '可预约时段',
      noSlots: '该日期暂无可预约时段',
      confirmBooking: '确认预约',
      cancel: '取消',
      close: '关闭',
      to: '至'
    },
    en: {
      searchPlaceholder: 'Search area or service...',
      filter: 'Filter',
      sort: 'Sort',
      serviceType: 'Service Type',
      priceRange: 'Price Range',
      minPrice: 'Min Price',
      maxPrice: 'Max Price',
      area: 'Service Area',
      areaPlaceholder: 'Enter area name',
      resetFilters: 'Reset Filters',
      applyFilters: 'Apply Filters',
      sortByRating: 'Sort by Rating',
      sortByPrice: 'Sort by Price',
      sortByDistance: 'Sort by Distance',
      rating: 'Rating',
      reviews: 'reviews',
      completedOrders: 'orders',
      perHour: '/ hour',
      availableAreas: 'Service Areas',
      availableDates: 'Available Dates',
      tags: 'Tags',
      verified: 'Verified',
      notVerified: 'Not Verified',
      bookNow: 'Book Now',
      viewDetails: 'View Details',
      noServices: 'No matching services found',
      tryAdjusting: 'Try adjusting filters or search terms',
      loading: 'Finding quality escorts for you...',
      error: 'Failed to load, please try again',
      selectDate: 'Select Date',
      selectTime: 'Select Time Slot',
      availableSlots: 'Available Slots',
      noSlots: 'No available slots for this date',
      confirmBooking: 'Confirm Booking',
      cancel: 'Cancel',
      close: 'Close',
      to: 'to'
    },
  }[lang];

  const getServiceTypeLabel = (type: ServiceType) => {
    const found = SERVICE_TYPES.find(s => s.value === type);
    return found ? found.label[lang] : type;
  };

  const getWeekdayLabel = (day: number) => {
    return WEEKDAYS.find(w => w.value === day)?.label[lang] || '';
  };

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getAllEscortServices({
        page: 1,
        limit: 50,
      });
      setServices(response.data || []);
      setFilteredServices(response.data || []);
    } catch (err) {
      console.error('Failed to load services:', err);
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await apiService.getFavorites();
      const favIds = new Set(favs.map((f: any) => f.targetId || f.escortId));
      setFavorites(favIds);
    } catch (err) {
      console.error('Failed to load favorites:', err);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadFavorites();
  }, [loadServices, loadFavorites]);

  useEffect(() => {
    let result = [...services];

    if (selectedServiceType !== 'ALL') {
      result = result.filter(s => s.serviceType === selectedServiceType);
    }

    if (minPrice !== '') {
      result = result.filter(s => s.pricePerHour >= minPrice);
    }
    if (maxPrice !== '') {
      result = result.filter(s => s.pricePerHour <= maxPrice);
    }

    if (areaSearch.trim()) {
      const searchLower = areaSearch.toLowerCase();
      result = result.filter(s =>
        s.areas.some(area => area.toLowerCase().includes(searchLower))
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'rating':
          comparison = a.escort.rating - b.escort.rating;
          break;
        case 'price':
          comparison = a.pricePerHour - b.pricePerHour;
          break;
        case 'distance':
          comparison = 0;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredServices(result);
  }, [services, selectedServiceType, minPrice, maxPrice, areaSearch, sortBy, sortOrder]);

  const handleResetFilters = () => {
    setSelectedServiceType('ALL');
    setMinPrice('');
    setMaxPrice('');
    setAreaSearch('');
    setSortBy('rating');
    setSortOrder('desc');
  };

  const handleToggleFavorite = async (serviceId: string, escortId: string) => {
    try {
      if (favorites.has(escortId)) {
        const favs = await apiService.getFavorites();
        const fav = favs.find((f: any) => f.targetId === escortId || f.escortId === escortId);
        if (fav) {
          await apiService.removeFavorite(fav.id);
          setFavorites(prev => {
            const next = new Set(prev);
            next.delete(escortId);
            return next;
          });
        }
      } else {
        await apiService.addFavorite(escortId, 'escort');
        setFavorites(prev => new Set(prev).add(escortId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleViewDetails = async (service: EscortService) => {
    setSelectedService(service);
    setSelectedDate('');
    setSelectedSlot(null);
    setAvailability(null);
    setShowBookingModal(true);
  };

  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    if (selectedService && date) {
      setLoadingAvailability(true);
      try {
        const data = await apiService.getServiceAvailability(selectedService.id, date);
        setAvailability(data);
      } catch (err) {
        console.error('Failed to load availability:', err);
        setAvailability(null);
      } finally {
        setLoadingAvailability(false);
      }
    }
  };

  const handleBook = () => {
    if (selectedService && selectedSlot && selectedDate) {
      onBook(selectedService, { ...selectedSlot, date: selectedDate });
      setShowBookingModal(false);
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    if (selectedService) {
      return selectedService.endDate.split('T')[0];
    }
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    return threeMonthsLater.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-2xl mx-4 my-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 bg-teal-100 rounded-full animate-pulse flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
            <div className="absolute inset-0 border-4 border-teal-500 rounded-full animate-ping opacity-20"></div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 font-sans transition-colors duration-300">
      
      {/* Search and Filter Sticky Header */}
      <div className="sticky top-0 z-20 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800">
        <div className="px-4 py-4 space-y-3">
          
          {/* Elegant Pill Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            </div>
            <input
              type="text"
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700 rounded-full text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 shadow-sm transition-all text-[15px]"
            />
            {areaSearch && (
              <button 
                onClick={() => setAreaSearch('')}
                className="absolute inset-y-0 right-4 flex items-center"
              >
                <div className="bg-slate-100 dark:bg-slate-700 rounded-full p-1 opacity-60 hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-slate-500" />
                </div>
              </button>
            )}
          </div>

          {/* Smooth Scrollable Chips Row */}
          <div className="flex items-center gap-2.5 overflow-x-auto hide-scrollbar pb-1">
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
                showFilters || selectedServiceType !== 'ALL' || minPrice !== '' || maxPrice !== ''
                  ? 'bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
              }`}
            >
              <Filter className="h-[15px] w-[15px]" />
              {t.filter}
            </button>

            <button
              onClick={() => {
                setSortBy('rating');
                setSortOrder(sortBy === 'rating' && sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
                sortBy === 'rating'
                  ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
              }`}
            >
              <Star className={`h-[15px] w-[15px] ${sortBy === 'rating' ? 'fill-teal-700 dark:fill-teal-400' : ''}`} />
              {t.sortByRating}
              {sortBy === 'rating' && (
                sortOrder === 'desc' ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>

            <button
              onClick={() => {
                setSortBy('price');
                setSortOrder(sortBy === 'price' && sortOrder === 'asc' ? 'desc' : 'asc');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all flex-shrink-0 border ${
                sortBy === 'price'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
              }`}
            >
              <ArrowDownUp className="h-[15px] w-[15px] opacity-80" />
              {t.sortByPrice}
              {sortBy === 'price' && (
                sortOrder === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Glassmorphism Filter Panel */}
          <div className={`transition-all duration-300 ease-in-out origin-top overflow-hidden ${showFilters ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0 m-0'}`}>
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[20px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 dark:border-slate-700 space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t.serviceType}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SERVICE_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedServiceType(type.value)}
                      className={`py-2 px-2 rounded-[10px] text-[13px] font-medium transition-colors ${
                        selectedServiceType === type.value
                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {type.label[lang]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t.priceRange}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={t.minPrice}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-transparent rounded-xl text-[14px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all font-mono"
                    />
                  </div>
                  <div className="w-4 h-[2px] bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder={t.maxPrice}
                      className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-700 border border-transparent rounded-xl text-[14px] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-3 text-[14px] text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-[14px] transition-colors active:scale-[0.98]"
                >
                  {t.resetFilters}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Escort Cards List */}
      <div className="p-4 space-y-4">
        {error ? (
          <div className="text-center py-16 px-4">
            <p className="text-rose-500 mb-4">{error}</p>
            <button
              onClick={loadServices}
              className="px-6 py-2.5 bg-rose-50 text-rose-600 rounded-full font-bold hover:bg-rose-100 active:scale-95 transition-all"
            >
              {t.loading}
            </button>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              <div className="absolute inset-2 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center">
                <Search className="h-8 w-8 text-slate-300 dark:text-slate-500" />
              </div>
              <div className="absolute top-0 right-0 h-6 w-6 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-900">
                <X className="h-3 w-3 text-rose-500" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1">{t.noServices}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.tryAdjusting}</p>
          </div>
        ) : (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="group relative bg-white dark:bg-slate-800 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100/80 dark:border-slate-700/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 overflow-hidden"
            >
              {/* Top Banner specific for Full Process etc */}
              <div className="absolute top-0 right-0 bg-gradient-to-bl from-teal-50 to-white dark:from-teal-900/20 dark:to-slate-800 w-32 h-32 rounded-bl-[100px] -z-0 opacity-50 pointer-events-none transition-opacity group-hover:opacity-100"></div>

              {/* Header Info */}
              <div className="flex items-start gap-4 mb-4 relative z-10">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-teal-200 rounded-full blur-sm opacity-30 transform group-hover:scale-110 transition-transform"></div>
                  <img
                    src={service.escort.user.avatarUrl || `https://ui-avatars.com/api/?name=${service.escort.user.name}&background=random`}
                    alt={service.escort.user.name}
                    className="relative w-[68px] h-[68px] rounded-full object-cover border-2 border-white dark:border-slate-800 bg-slate-100"
                  />
                  {service.escort.isVerified && (
                    <div className="absolute -bottom-1 -right-1 bg-teal-500 border-2 border-white dark:border-slate-800 rounded-full p-0.5 shadow-sm">
                      <BadgeCheck className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-[18px] text-slate-900 dark:text-white truncate">
                      {service.escort.user.name}
                    </h3>
                    <button
                      onClick={() => handleToggleFavorite(service.id, service.escort.userId)}
                      className="p-1.5 -mr-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                    >
                      <Heart
                        className={`h-5 w-5 ${
                          favorites.has(service.escort.userId)
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-slate-300 dark:text-slate-500 hover:text-rose-400'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 mt-0.5 text-[13px]">
                    <span className={`px-2 py-[2px] rounded-md font-bold text-[10px] uppercase tracking-wider ${
                      service.escort.isVerified
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700'
                    }`}>
                      {service.escort.isVerified ? t.verified : t.notVerified}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <div className="flex items-center gap-[2px]">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {service.escort.rating.toFixed(1)}
                      </span>
                      <span className="text-slate-400 hidden xs:inline-block">({service.escort.reviewCount})</span>
                    </div>
                    <span className="text-slate-300 dark:text-slate-600 hidden xs:inline-block">|</span>
                    <div className="flex items-center text-slate-500 hidden xs:flex">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 mr-1">{service.escort.completedOrders}</span> {t.completedOrders}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Title & Price */}
              <div className="space-y-3 relative z-10 pt-1 pb-1">
                <div className="flex items-end justify-between">
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-[15px] leading-tight mb-1">{service.title || getServiceTypeLabel(service.serviceType)}</h4>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-snug">
                      {service.description}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-baseline justify-end gap-0.5">
                      <span className="text-[26px] font-black tracking-tight text-teal-600 dark:text-teal-400 leading-none">
                        {service.pricePerHour}
                      </span>
                      <span className="text-[12px] font-bold text-slate-400 opacity-80 whitespace-nowrap mb-0.5">
                        {t.perHour}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags Section */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {/* Areas */}
                  {service.areas && service.areas.length > 0 && service.areas.slice(0, 2).map((area, idx) => (
                    <span key={`area-${idx}`} className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-[8px]">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {area}
                    </span>
                  ))}
                  
                  {/* Specialties */}
                  {service.escort.specialties && service.escort.specialties.slice(0, 2).map((specialty, idx) => (
                    <span key={`spec-${idx}`} className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 bg-blue-50/70 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-[8px]">
                      <BadgeCheck className="h-3 w-3 text-blue-400" />
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 relative z-10">
                <button
                  onClick={() => handleViewDetails(service)}
                  className="w-1/3 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[14px] font-bold text-[14px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95 shadow-sm"
                >
                  {t.viewDetails}
                </button>
                <button
                  onClick={() => handleViewDetails(service)}
                  className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-[14px] font-bold text-[14px] hover:shadow-lg hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 ring-1 ring-teal-600/20"
                >
                  {t.bookNow}
                  <ArrowRight className="h-4 w-4" opacity={0.8} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full max-w-lg max-h-[90vh] rounded-t-[32px] sm:rounded-[32px] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.bookNow}</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors active:scale-95"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Service Summary Header card */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-[20px] p-4 border border-slate-100 dark:border-slate-700/50">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedService.escort.user.avatarUrl || `https://ui-avatars.com/api/?name=${selectedService.escort.user.name}&background=random`}
                    alt={selectedService.escort.user.name}
                    className="w-[60px] h-[60px] rounded-[18px] object-cover bg-white shadow-sm"
                  />
                  <div className="flex-1">
                    <h3 className="font-extrabold text-[17px] text-slate-900 dark:text-white leading-tight">{selectedService.escort.user.name}</h3>
                    <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{selectedService.title || getServiceTypeLabel(selectedService.serviceType)}</p>
                    <div className="flex items-center justify-between mt-2">
                       <div className="flex items-center gap-1">
                         <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                         <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">{selectedService.escort.rating.toFixed(1)}</span>
                       </div>
                       <div className="flex items-baseline gap-1">
                         <span className="text-xl font-black text-teal-600 dark:text-teal-400 leading-none">{selectedService.pricePerHour}</span>
                         <span className="text-[12px] font-bold text-slate-400">{t.perHour}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2.5 px-1">
                  <Calendar className="h-4 w-4 inline mr-1.5 align-text-bottom text-teal-500" />
                  {t.selectDate}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className="w-full px-5 py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[16px] text-[15px] font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 transition-all shadow-sm"
                />
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-2.5 px-1">
                    <Clock className="h-4 w-4 inline mr-1.5 align-text-bottom text-teal-500" />
                    {t.selectTime}
                  </label>
                  {loadingAvailability ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
                    </div>
                  ) : availability && availability.timeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2.5">
                      {availability.timeSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => slot.available && setSelectedSlot(slot)}
                          disabled={!slot.available}
                          className={`py-3 px-2 rounded-[14px] text-[14px] font-bold transition-all active:scale-95 ${
                            selectedSlot?.start === slot.start
                              ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                              : slot.available
                              ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-teal-500 hover:text-teal-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          }`}
                        >
                          {slot.start}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-[16px] border border-slate-100 dark:border-slate-700/50">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.noSlots}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Available Weekdays Info */}
              <div className="bg-teal-50 dark:bg-teal-900/10 rounded-[16px] p-4 flex items-start gap-3 mt-4 border border-teal-100 dark:border-teal-900/30">
                <Calendar className="h-5 w-5 text-teal-500 shrink-0 mt-0.5" />
                <p className="text-[13px] text-teal-800 dark:text-teal-400 leading-snug">
                  <span className="font-bold block mb-0.5">{t.availableDates}</span>
                  {selectedService.availableWeekdays.map(day => getWeekdayLabel(day)).join('、')}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-700 flex gap-3 flex-shrink-0 bg-white dark:bg-slate-800 pb-8 sm:pb-5">
              <button
                onClick={() => setShowBookingModal(false)}
                className="w-1/3 py-3.5 border-2 border-slate-200 dark:border-slate-600 rounded-[16px] font-bold text-[15px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleBook}
                disabled={!selectedSlot}
                className={`flex-1 py-3.5 rounded-[16px] font-bold text-[15px] transition-all flex justify-center items-center gap-2 active:scale-95 ${
                  selectedSlot
                    ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/20'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {t.confirmBooking}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableEscorts;
