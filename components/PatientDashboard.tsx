import React, { useState, useEffect, useRef } from 'react';
import { getHealthTriage } from '../services/aiService';
import { apiService } from '../services/apiService';
import { EscortProfile, Language, UserInfo } from '../types';
import { MapPin, MessageCircle, Repeat2, Heart, BarChart2, Share, Image as ImageIcon, Smile, CalendarClock, BriefcaseMedical, MoreHorizontal, AlertCircle, RefreshCw, Loader2, X, Calendar, Star, FileText, Briefcase } from 'lucide-react';
import { DatePickerModal } from './DatePickerModal';
import { AvailableEscorts } from './AvailableEscorts';

interface PatientDashboardProps {
  lang: Language;
  user?: UserInfo | null;
  onSelectService?: (service: string) => void;
}

// Pull to refresh hook
const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = async () => {
    isDragging.current = false;
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(0);
      await onRefresh();
      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
  };

  return { isRefreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd };
};

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ lang, user, onSelectService }) => {
  const [symptoms, setSymptoms] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [escorts, setEscorts] = useState<EscortProfile[]>([]);
  const [escortsLoading, setEscortsLoading] = useState(true);
  const [escortsError, setEscortsError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [savedEscorts, setSavedEscorts] = useState<Set<string>>(new Set());
  const [consultCount, setConsultCount] = useState<Record<string, number>>({});
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleSave = (escortId: string) => {
    setSavedEscorts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(escortId)) {
        newSet.delete(escortId);
      } else {
        newSet.add(escortId);
      }
      return newSet;
    });
  };

  const handleConsult = (escortId: string) => {
    setConsultCount(prev => ({
      ...prev,
      [escortId]: (prev[escortId] || 0) + 1
    }));
  };

  const handleShare = (escortId: string, escortName: string) => {
    if (navigator.share) {
      navigator.share({
        title: 'MediMate 陪诊服务',
        text: `发现优秀陪诊师：${escortName}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`发现优秀陪诊师：${escortName} - ${window.location.href}`);
      alert(lang === 'zh' ? '链接已复制到剪贴板' : 'Link copied to clipboard');
    }
    setShowShareMenu(null);
  };

  const refreshData = async () => {
    await fetchEscorts();
  };

  const { isRefreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(refreshData);
  
  const t = {
    zh: {
      placeholder: '哪里不舒服？(输入症状 AI 智能导诊)',
      aiTitle: 'AI 导诊建议',
      analyzing: '分析中...',
      triage: '智能导诊',
      officialServices: '官方服务',
      officialAccount: 'MediMate 官方服务',
      alwaysOpen: '24小时',
      services: [
        { label: '全程陪诊', sub: '挂号/取药/送医' },
        { label: '代办买药', sub: '送药上门' },
        { label: '专车接送', sub: '轮椅/担架' },
        { label: '住院陪护', sub: '24H护工' }
      ],
      certified: '实名认证',
      proService: '专业陪诊服务，熟悉',
      process: '流程。',
      consult: '咨询',
      book: '下单',
      orders: '接单',
      loadingEscorts: '加载陪诊师列表...',
      failedToLoad: '加载失败',
      noEscortsFound: '附近暂无陪诊师',
      retry: '重试',
      networkError: '网络错误，请检查网络连接',
      saved: '已收藏',
      save: '收藏',
      shared: '已分享',
      share: '分享',
      copied: '已复制'
    },
    en: {
      placeholder: 'What are your symptoms? (AI Triage)',
      aiTitle: 'AI Triage Advice',
      analyzing: 'Analyzing...',
      triage: 'AI Triage',
      officialServices: 'Official Services',
      officialAccount: 'MediMate Official',
      alwaysOpen: '24/7',
      services: [
        { label: 'Full Escort', sub: 'Reg/Meds/Doctor' },
        { label: 'Med Delivery', sub: 'Door-to-door' },
        { label: 'Transport', sub: 'Wheelchair/Stretcher' },
        { label: 'Caregiving', sub: '24H Nursing' }
      ],
      certified: 'Certified',
      proService: 'Professional escort service, familiar with',
      process: 'process.',
      consult: 'Consult',
      book: 'Book',
      orders: 'Orders',
      loadingEscorts: 'Loading escorts...',
      failedToLoad: 'Failed to load',
      noEscortsFound: 'No escorts found nearby',
      retry: 'Retry',
      networkError: 'Network error, please check your connection',
      saved: 'Saved',
      save: 'Save',
      shared: 'Shared',
      share: 'Share',
      copied: 'Copied'
    }
  }[lang];

  // Fetch nearby escorts
  const fetchEscorts = async () => {
    setEscortsLoading(true);
    setEscortsError('');

    try {
      // Use real geolocation API
      let latitude = 39.9042; // Default: Beijing
      let longitude = 116.4074;

      if (navigator.geolocation) {
        await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => {
              console.warn('Geolocation error:', error.message);
              reject(error);
            },
            { timeout: 5000, maximumAge: 300000 }
          );
        }).then(
          (position) => {
            latitude = position.latitude;
            longitude = position.longitude;
          },
          () => {
            // Fall back to default if geolocation fails
          }
        );
      }

      // Use API service to fetch nearby escorts
      const data = await apiService.getNearbyEscorts(latitude, longitude, 10);
      setEscorts(data);

      // If no data returned, set a message
      if (data.length === 0) {
        setEscortsError(t.noEscortsFound);
      }
    } catch (error) {
      console.error('Failed to fetch escorts:', error);
      setEscortsError(t.networkError);
    } finally {
      setEscortsLoading(false);
    }
  };

  // Fetch escorts on component mount and when language changes
  useEffect(() => {
    fetchEscorts();
  }, [lang]);

  const handleAiTriage = async () => {
    if (!symptoms) return;
    setAiLoading(true);
    const advice = await getHealthTriage(symptoms);
    setAiAdvice(advice);
    setAiLoading(false);
  };

  const onInteract = (action: string) => {
    console.log(`User interaction: ${action}`);
  };

  const serviceColors = [
    'bg-blue-50 text-blue-600',
    'bg-emerald-50 text-emerald-600',
    'bg-amber-50 text-amber-600',
    'bg-purple-50 text-purple-600'
  ];

  return (
    <div
      className="pb-24"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)`, height: pullDistance > 0 ? '60px' : '0' }}
      >
        {isRefreshing ? (
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        ) : (
          <RefreshCw className="h-6 w-6 text-slate-400" style={{ opacity: pullDistance / 60 }} />
        )}
      </div>

      <div className="border-b border-slate-100 p-4">
        <div className="flex gap-3">
          <img src="https://picsum.photos/100/100?random=50" className="h-10 w-10 rounded-full bg-slate-200" alt="Me" />
          <div className="flex-1">
            <textarea
              className="w-full text-xl placeholder-slate-500 border-none focus:ring-0 resize-none outline-none text-slate-900 min-h-[50px]"
              placeholder={t.placeholder}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={2}
            />
            
            {aiAdvice && (
              <div className="mb-4 bg-teal-50 rounded-2xl p-3 text-slate-900 border border-teal-100 text-sm">
                <span className="font-bold text-teal-600 block mb-1">{t.aiTitle}</span>
                {aiAdvice}
              </div>
            )}

            {selectedImage && (
              <div className="mb-3 relative inline-block">
                <img src={selectedImage} alt="Preview" className="h-24 rounded-lg object-cover" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X className="h-3 w-3" /></button>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
              <div className="flex gap-1 text-teal-500">
                <div onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-teal-50 rounded-full cursor-pointer transition-colors"><ImageIcon className="h-5 w-5" /></div>
                <div onClick={() => setShowDatePicker(true)} className={`p-2 rounded-full cursor-pointer transition-colors ${selectedDate ? 'bg-teal-100 text-teal-600' : 'hover:bg-teal-50 text-teal-500'}`}><Calendar className="h-5 w-5" /></div>
                <div 
                  onClick={() => {
                    if (!navigator.geolocation) {
                      alert(lang === 'zh' ? '您的浏览器不支持定位功能' : 'Your browser does not support geolocation');
                      return;
                    }
                    setIsGettingLocation(true);
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = pos.coords.latitude.toFixed(6);
                        const lng = pos.coords.longitude.toFixed(6);
                        const locationStr = `${lat},${lng}`;
                        setSelectedLocation(locationStr);
                        const newSym = symptoms + (symptoms ? ' ' : '') + `[位置: ${lat}, ${lng}]`;
                        setSymptoms(newSym);
                        setIsGettingLocation(false);
                      },
                      (err) => {
                        setIsGettingLocation(false);
                        let msg = lang === 'zh' ? '无法获取位置' : 'Cannot get location';
                        if (err.code === 1) msg = lang === 'zh' ? '请允许位置权限' : 'Please allow location permission';
                        if (err.code === 2) msg = lang === 'zh' ? '位置不可用' : 'Location unavailable';
                        if (err.code === 3) msg = lang === 'zh' ? '定位超时' : 'Location timeout';
                        alert(msg);
                      },
                      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                    );
                  }} 
                  className={`p-2 rounded-full cursor-pointer transition-colors ${selectedLocation ? 'bg-teal-100 text-teal-600' : 'hover:bg-teal-50 text-teal-500'}`}
                >
                  {isGettingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const reader = new FileReader(); reader.onload = (ev) => setSelectedImage(ev.target?.result as string); reader.readAsDataURL(f); } }} />
              <button
              onClick={handleAiTriage}
              disabled={aiLoading || !symptoms}
              className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-1.5 rounded-full disabled:opacity-50 transition-colors"
            >
              {aiLoading ? t.analyzing : t.triage}
            </button>
            </div>
          </div>
        </div>
      </div>

      {/* Official Services */}
      <div 
        className="border-b border-slate-100 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
        onClick={() => onInteract('Open Services')}
      >
         <div className="flex gap-1 mb-1 text-xs font-bold text-slate-500 items-center ml-12">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current mr-1"><g><path d="M7 4.5C7 3.12 8.12 2 9.5 2h5C15.88 2 17 3.12 17 4.5v15c0 1.38-1.12 2.5-2.5 2.5h-5C8.12 22 7 20.88 7 19.5v-15zM9.5 4c-.28 0-.5.22-.5.5v15c0 .28.22.5.5.5h5c.28 0 .5-.22.5-.5v-15c0-.28-.22-.5-.5-.5h-5z"></path></g></svg>
            {t.officialServices}
         </div>
         <div className="flex gap-3">
             <div className="flex-shrink-0">
               <div className="h-10 w-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">M</div>
             </div>
             <div className="flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-900">{t.officialAccount}</span>
                  <span className="text-teal-500">@official</span>
                  <span className="text-slate-500 text-sm">· {t.alwaysOpen}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {t.services.map((s, idx) => (
                    <div 
                        key={idx} 
                        className={`rounded-xl p-3 ${serviceColors[idx]} border border-transparent hover:border-black/10 transition-all cursor-pointer`}
                        onClick={(e) => { e.stopPropagation(); onSelectService?.(s.label); }}
                    >
                       <div className="font-bold">{s.label}</div>
                       <div className="text-xs opacity-70">{s.sub}</div>
                    </div>
                  ))}
                </div>
             </div>
         </div>
      </div>

      {/* Available Escorts Services */}
      <div className="border-b border-slate-100">
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-teal-600" />
            {lang === 'zh' ? '可预约陪诊师' : 'Available Escorts'}
          </h3>
        </div>
        <AvailableEscorts
          lang={lang}
          onBook={(service, slot) => {
            // Navigate to order confirmation with pre-filled data
            console.log('Booking service:', service, 'slot:', slot);
            // This will be handled by parent component
          }}
        />
      </div>

      {/* Escort List */}
      <div className="divide-y divide-slate-100">
        {escortsLoading ? (
          <div className="p-10 text-center text-slate-500">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-transparent rounded-full animate-spin"></div>
              <div>{t.loadingEscorts}</div>
            </div>
          </div>
        ) : escortsError ? (
          <div className="p-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="font-medium text-slate-900">{t.failedToLoad}</div>
              <div className="text-sm text-slate-500 mb-4">{escortsError}</div>
              <button
                className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-full hover:bg-teal-600 transition-colors"
                onClick={fetchEscorts}
              >
                <RefreshCw className="h-4 w-4" />
                {t.retry}
              </button>
            </div>
          </div>
        ) : escorts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-slate-400 mb-2">
              <MapPin className="h-12 w-12 mx-auto" />
            </div>
            <div className="font-medium text-slate-900 mb-1">{t.noEscortsFound}</div>
            <div className="text-sm text-slate-500">{lang === 'zh' ? '尝试调整搜索范围或稍后再试' : 'Try adjusting your search or check back later'}</div>
          </div>
        ) : (
          escorts.map((escort) => (
            <div 
              key={escort.id} 
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => onInteract(`Escort Profile: ${escort.name}`)}
            >
              <div className="flex gap-3">
                <img src={escort.imageUrl} alt={escort.name} className="h-10 w-10 rounded-full hover:opacity-90" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 group">
                      <span className="font-bold text-slate-900 group-hover:underline">{escort.name}</span>
                      {escort.isCertified && (
                         <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-teal-500 fill-current">
                           <title>{t.certified}</title>
                           <g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.748 2.795 1.863 3.616-.203.438-.323.922-.323 1.434 0 2.21 1.71 3.998 3.818 3.998.47 0 .92-.084 1.336-.25.62 1.333 1.926 2.25 3.437 2.25s2.817-.917 3.437-2.25c.415.165.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.512-.12-.996-.323-1.434 1.114-.82 1.863-2.16 1.863-3.616zm-5.558-1.984l-4.235 7.48c-.144.255-.38.41-.66.41-.28 0-.514-.155-.658-.41l-2.456-4.34c-.204-.36-.075-.815.286-1.018.36-.203.816-.074 1.018.286l1.812 3.2 3.6-6.355c.203-.36.66-.488 1.02-.285.36.203.49.658.284 1.02z"></path></g>
                         </svg>
                      )}
                      <span className="text-slate-500 text-sm">@{escort.id}_pro · {escort.distance}</span>
                    </div>
                    <div 
                      className="text-slate-400 hover:text-teal-500 p-2 rounded-full hover:bg-teal-50 transition-colors"
                    >
                       <MoreHorizontal className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-1 text-slate-900">
                     <p className="mb-2">{t.proService} <span className="text-teal-500">#{escort.specialties[0]}</span> {t.process}</p>
                     <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                       <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1"><Star className="h-3 w-3" /> {escort.rating}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1"><FileText className="h-3 w-3" /> 100%{t.certified}</span>
                       <span className="bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1"><Briefcase className="h-3 w-3" /> {t.orders}{escort.completedOrders}+</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                     <button 
                       className="flex items-center gap-2 text-slate-500 hover:text-blue-500 transition-colors group"
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         handleConsult(escort.id);
                         onInteract('Consult'); 
                       }}
                     >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm">{(consultCount[escort.id] || 0) > 0 ? (consultCount[escort.id]) : ''}</span>
                     </button>
                      
                     <button 
                       className="flex items-center gap-2 text-slate-500 hover:text-green-500 transition-colors group"
                       onClick={(e) => { e.stopPropagation(); onInteract('Book Now'); }}
                     >
                        <BriefcaseMedical className="h-5 w-5" />
                        <span className="text-sm">{t.book}</span>
                     </button>

                     <button 
                       className={`flex items-center gap-2 transition-colors group ${savedEscorts.has(escort.id) ? 'text-red-500' : 'text-slate-500 hover:text-red-500'}`}
                       onClick={(e) => { 
                         e.stopPropagation(); 
                         handleToggleSave(escort.id);
                         onInteract('Save'); 
                       }}
                     >
                        <Heart className={`h-5 w-5 ${savedEscorts.has(escort.id) ? 'fill-current' : ''}`} />
                        <span className="text-sm">{savedEscorts.has(escort.id) ? t.saved : t.save}</span>
                     </button>

                     <div className="relative ml-auto">
                       <button 
                         className="flex items-center gap-2 text-slate-500 hover:text-teal-500 transition-colors group"
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setShowShareMenu(showShareMenu === escort.id ? null : escort.id);
                         }}
                       >
                          <Share className="h-5 w-5" />
                       </button>
                       {showShareMenu === escort.id && (
                         <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10 min-w-[120px]">
                           <button 
                             className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                             onClick={(e) => { e.stopPropagation(); handleShare(escort.id, escort.name); }}
                           >
                              <Share className="h-4 w-4" />
                              {t.share}
                           </button>
                           <button 
                             className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               navigator.clipboard.writeText(`${window.location.href}?escort=${escort.id}`);
                               alert(lang === 'zh' ? '链接已复制' : 'Link copied');
                               setShowShareMenu(null);
                             }}
                           >
                              <BarChart2 className="h-4 w-4" />
                              {t.copied}
                           </button>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelect={(date, time) => {
          setSelectedDate(date);
          setSelectedTime(time || '');
          const dateStr = `${date}${time ? ` ${time}` : ''}`;
          setSymptoms(symptoms + ` [预约: ${dateStr}]`);
        }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    </div>
  );
};
