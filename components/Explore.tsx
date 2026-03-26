import React, { useState, useEffect, useRef } from 'react';
import { Language, Hospital, UserInfo } from '../types';
import { apiService } from '../services/apiService';
import { Search, Settings, MapPin, Loader2, Star, Phone, Building2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

interface ExploreProps {
  lang: Language;
  user?: UserInfo | null;
  onSelectHospital?: (hospital: Hospital) => void;
}

// Mock 医院数据用于降级显示
const MOCK_HOSPITALS: Hospital[] = [
  {
    id: 'hosp-001',
    name: '北京协和医院',
    level: '三级甲等',
    department: '综合医院',
    address: '北京市东城区帅府园1号',
    phone: '010-69156114',
    rating: 4.9,
  },
  {
    id: 'hosp-002',
    name: '北京大学第一医院',
    level: '三级甲等',
    department: '综合医院',
    address: '北京市西城区西什库大街8号',
    phone: '010-83572211',
    rating: 4.8,
  },
  {
    id: 'hosp-003',
    name: '北京天坛医院',
    level: '三级甲等',
    department: '神经外科',
    address: '北京市丰台区南四环西路119号',
    phone: '010-59975000',
    rating: 4.7,
  },
  {
    id: 'hosp-004',
    name: '中日友好医院',
    level: '三级甲等',
    department: '综合医院',
    address: '北京市朝阳区樱花园东街2号',
    phone: '010-84205288',
    rating: 4.6,
  },
  {
    id: 'hosp-005',
    name: '北京儿童医院',
    level: '三级甲等',
    department: '儿科',
    address: '北京市西城区南礼士路56号',
    phone: '010-59616161',
    rating: 4.8,
  },
];

export const Explore: React.FC<ExploreProps> = ({ lang, user: _user, onSelectHospital }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Hospital[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadHospitals();

    // 清理超时定时器
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const loadHospitals = async () => {
    try {
      setLoading(true);
      setError(null);
      setUseMockData(false);

      // 设置 5 秒超时
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Hospitals loading timeout, switching to mock data');
        setUseMockData(true);
        setHospitals(MOCK_HOSPITALS);
        setLoading(false);
        setError('数据加载超时，已显示演示数据');
      }, 5000);

      const data = await apiService.getHospitals();

      // 清除超时定时器
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      if (data && data.length > 0) {
        setHospitals(data);
      } else {
        // API 返回空数据，使用 Mock 数据
        setUseMockData(true);
        setHospitals(MOCK_HOSPITALS);
      }
    } catch (error) {
      console.error('Failed to load hospitals:', error);
      // 出错时使用 Mock 数据
      setUseMockData(true);
      setHospitals(MOCK_HOSPITALS);
      setError('无法连接到服务器，已显示演示数据');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      setSearching(true);
      try {
        const results = await apiService.searchHospitals({ keyword: query, limit: 20 });
        setSearchResults(results.data);
      } catch (error) {
        console.error('Search failed:', error);
        // 搜索失败时，在 Mock 数据中过滤
        if (useMockData) {
          const filtered = MOCK_HOSPITALS.filter(h =>
            h.name.toLowerCase().includes(query.toLowerCase()) ||
            h.department?.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(filtered);
        }
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const t = {
    zh: {
      search: '搜索医院、科室、医生',
      forYou: '推荐',
      trending: '热门医院',
      news: '健康资讯',
      local: '本地',
      noResults: '未找到相关医院',
      loading: '加载中...',
      level: '等级',
      department: '科室',
      orders: '订单',
      viewDetails: '查看详情',
      retry: '重试',
      useDemo: '使用演示数据',
    },
    en: {
      search: 'Search hospitals, departments...',
      forYou: 'For You',
      trending: 'Trending',
      news: 'News',
      local: 'Local',
      noResults: 'No hospitals found',
      loading: 'Loading...',
      level: 'Level',
      department: 'Department',
      orders: 'Orders',
      viewDetails: 'View Details',
      retry: 'Retry',
      useDemo: 'Use Demo Data',
    }
  }[lang];

  const tabs = [t.forYou, t.trending, t.news, t.local];
  const displayHospitals = searchQuery ? searchResults : hospitals;

  const renderHospitalCard = (hospital: Hospital, index: number) => (
    <div 
      key={hospital.id || index} 
      className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors relative flex items-center justify-between"
      onClick={() => onSelectHospital?.(hospital)}
    >
      <div className="flex-1">
        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
          <span>{index + 1} · {hospital.department || hospital.level || 'Hospital'} · {lang === 'zh' ? '热门' : 'Trending'}</span>
        </div>
        <div className="font-bold text-slate-900 text-base">{hospital.name}</div>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
          {hospital.level && <span>{hospital.level}</span>}
          {hospital.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-500 fill-current" />
              {hospital.rating.toFixed(1)}
            </span>
          )}
          {hospital.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{hospital.address.substring(0, 15)}...</span>}
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-400" />
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-2" />
        <span className="text-slate-500">{t.loading}</span>
        <span className="text-xs text-slate-400 mt-2">{lang === 'zh' ? '加载时间较长？点击取消' : 'Taking too long? Click to cancel'}</span>
        <button
          onClick={() => {
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            setUseMockData(true);
            setHospitals(MOCK_HOSPITALS);
            setLoading(false);
            setError('已切换到演示数据模式');
          }}
          className="mt-3 px-4 py-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
        >
          {t.useDemo}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* 错误提示 */}
      {error && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">{error}</span>
          </div>
          <button
            onClick={loadHospitals}
            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <RefreshCw className="h-3 w-3" />
            {t.retry}
          </button>
        </div>
      )}

      {/* Search Header */}
      <div className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-100 px-4 py-2 flex items-center gap-4">
        <div className="flex-1 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {searching ? (
              <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
            ) : (
              <Search className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <input
            type="text"
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-slate-100 w-full rounded-full py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white border border-transparent focus:border-teal-500 transition-all"
          />
        </div>
        <Settings className="h-5 w-5 text-slate-900 cursor-pointer" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
        {tabs.map((tab, idx) => (
          <div
            key={idx}
            className="px-4 py-3 hover:bg-slate-50 cursor-pointer min-w-max relative"
            onClick={() => setActiveTab(idx)}
          >
            <span className={`font-bold text-sm ${activeTab === idx ? 'text-slate-900' : 'text-slate-500'}`}>{tab}</span>
            {activeTab === idx && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-teal-500 rounded-full"></div>}
          </div>
        ))}
      </div>

      {/* Search Results or Hospital List */}
      {activeTab === 0 || activeTab === 1 ? (
        <div className="border-b border-slate-100">
          <div className="py-3 px-4 text-xl font-black text-slate-900">{t.trending}</div>
          {displayHospitals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {searchQuery ? t.noResults : t.loading}
            </div>
          ) : (
            displayHospitals.map((hospital, i) => renderHospitalCard(hospital, i))
          )}
          {displayHospitals.length > 0 && (
            <div className="p-4 text-teal-500 text-sm cursor-pointer hover:bg-slate-50">
              {lang === 'zh' ? '显示更多' : 'Show more'}
            </div>
          )}
        </div>
      ) : activeTab === 2 ? (
        /* Health News - Static for now */
        <div className="flex gap-4 p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
          <div className="flex-1">
            <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
              {lang === 'zh' ? '公共卫生 · 1小时前' : 'Public Health · 1h ago'}
            </div>
            <div className="font-bold text-slate-900 leading-snug">
              {lang === 'zh' ? '2025年流感疫苗接种指南发布，老年人免费接种' : '2025 Flu Vaccine Guide Released'}
            </div>
          </div>
          <img src="https://picsum.photos/200/200?random=10" className="w-20 h-20 rounded-xl object-cover" alt="News" />
        </div>
      ) : (
        /* Local - Show hospitals with location */
        <div className="border-b border-slate-100">
          <div className="py-3 px-4 text-xl font-black text-slate-900">{t.local}</div>
          {displayHospitals.slice(0, 5).map((hospital, i) => (
            <div 
              key={hospital.id || i} 
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3"
              onClick={() => onSelectHospital?.(hospital)}
            >
              <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{hospital.name}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  {hospital.level && <span className="bg-slate-100 px-2 py-0.5 rounded">{hospital.level}</span>}
                  {hospital.department && <span>{hospital.department}</span>}
                </div>
                {hospital.phone && (
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {hospital.phone}
                  </div>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400 self-center" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
