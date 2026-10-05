import React, { useState, useEffect, useRef } from 'react';
import { getHealthTriage } from '../../services/aiService';
import { apiService } from '../../services/apiService';
import { EscortProfile, Language } from '../../types';
import { MapPin, MessageCircle, Heart, RefreshCw, Loader2, AlertCircle, Star, ChevronRight, Hospital, ClipboardList } from 'lucide-react';
import { EscortDetail } from '../EscortDetail';
import { OrderConfirmation } from '../OrderConfirmation';
import { OrderList } from '../OrderList';
import { OrderDetail } from '../OrderDetail';

interface PatientDashboardProps {
  lang: Language;
}

// Mock 陪诊师数据用于降级显示
const MOCK_ESCORTS: EscortProfile[] = [
  {
    id: 'escort-001',
    name: '王医生',
    rating: 4.9,
    completedOrders: 256,
    isVerified: true,
    specialties: ['内科', '老年科'],
    avatarUrl: 'https://ui-avatars.com/api/?name=王医生&background=random',
    distance: '1.2km',
  },
  {
    id: 'escort-002',
    name: '李护士',
    rating: 4.8,
    completedOrders: 189,
    isVerified: true,
    specialties: ['护理', '儿科'],
    avatarUrl: 'https://ui-avatars.com/api/?name=李护士&background=random',
    distance: '2.5km',
  },
  {
    id: 'escort-003',
    name: '张护工',
    rating: 4.7,
    completedOrders: 128,
    isVerified: true,
    specialties: ['陪护', '康复'],
    avatarUrl: 'https://ui-avatars.com/api/?name=张护工&background=random',
    distance: '3.1km',
  },
  {
    id: 'escort-004',
    name: '刘医生',
    rating: 4.9,
    completedOrders: 312,
    isVerified: true,
    specialties: ['外科', '骨科'],
    avatarUrl: 'https://ui-avatars.com/api/?name=刘医生&background=random',
    distance: '4.2km',
  },
];

type ViewMode = 'home' | 'escort-detail' | 'order-confirmation' | 'order-list' | 'order-detail' | 'messages';

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ lang }) => {
  const [symptoms, setSymptoms] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [escorts, setEscorts] = useState<EscortProfile[]>([]);
  const [escortsLoading, setEscortsLoading] = useState(true);
  const [escortsError, setEscortsError] = useState('');
  const [useMockData, setUseMockData] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [selectedEscortId, setSelectedEscortId] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [orderEscort, setOrderEscort] = useState<any>(null);
  const [orderServiceType, setOrderServiceType] = useState<string>('');
  const [orderPrice, setOrderPrice] = useState<number>(0);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = {
    zh: {
      placeholder: '哪里不舒服？(输入症状 AI 智能导诊)',
      aiTitle: 'AI 导诊建议',
      analyzing: '分析中...',
      triage: '智能导诊',
      services: [
        { label: '全程陪诊', sub: '挂号/取药/送医' },
        { label: '代办买药', sub: '送药上门' },
        { label: '专车接送', sub: '轮椅/担架' },
        { label: '住院陪护', sub: '24H护工' }
      ],
      certified: '实名认证',
      consult: '咨询',
      book: '下单',
      loadingEscorts: '加载陪诊师列表...',
      failedToLoad: '加载失败',
      noEscortsFound: '附近暂无陪诊师',
      retry: '重试',
      networkError: '网络错误，请检查网络连接',
      useDemo: '使用演示数据',
      myOrders: '我的订单',
      nearbyEscorts: '附近陪诊师',
      viewAll: '查看全部',
    },
    en: {
      placeholder: 'What are your symptoms? (AI Triage)',
      aiTitle: 'AI Triage Advice',
      analyzing: 'Analyzing...',
      triage: 'AI Triage',
      services: [
        { label: 'Full Escort', sub: 'Registration/Medicine' },
        { label: 'Medicine Pickup', sub: 'Delivery' },
        { label: 'Transport', sub: 'Wheelchair/Stretcher' },
        { label: 'Hospital Care', sub: '24H Care' }
      ],
      certified: 'Verified',
      consult: 'Chat',
      book: 'Book',
      loadingEscorts: 'Loading escorts...',
      failedToLoad: 'Failed to load',
      noEscortsFound: 'No escorts nearby',
      retry: 'Retry',
      networkError: 'Network error',
      useDemo: 'Use Demo Data',
      myOrders: 'My Orders',
      nearbyEscorts: 'Nearby Escorts',
      viewAll: 'View All',
    }
  }[lang];

  const handleAIChat = async () => {
    if (!symptoms.trim()) return;
    setAiLoading(true);
    try {
      let userLocation: { latitude: number; longitude: number } | undefined;

      if (navigator.geolocation) {
        try {
          userLocation = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
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
          });
        } catch {
          console.warn('Could not get user location for AI triage');
        }
      }

      const advice = await getHealthTriage(symptoms, userLocation);
      setAiAdvice(advice);
    } catch (error) {
      console.error('AI triage error:', error);
      setAiAdvice(lang === 'zh'
        ? '建议您根据症状选择合适的科室就诊。如需帮助，请咨询专业医生。'
        : 'Please choose the appropriate department based on your symptoms. Consult a professional doctor if needed.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const fetchEscorts = async () => {
    setEscortsLoading(true);
    setEscortsError('');
    setUseMockData(false);

    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('Escorts loading timeout, switching to mock data');
      setUseMockData(true);
      setEscorts(MOCK_ESCORTS);
      setEscortsLoading(false);
      setEscortsError('数据加载超时，已显示演示数据');
    }, 5000);

    try {
      let latitude = 39.9042;
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
          () => {}
        );
      }

      const data = await apiService.getNearbyEscorts(latitude, longitude, 10);

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      if (data && data.length > 0) {
        setEscorts(data);
      } else {
        setUseMockData(true);
        setEscorts(MOCK_ESCORTS);
      }
    } catch (error) {
      console.error('Failed to fetch escorts:', error);
      setUseMockData(true);
      setEscorts(MOCK_ESCORTS);
      setEscortsError('无法连接到服务器，已显示演示数据');
    } finally {
      setEscortsLoading(false);
    }
  };

  useEffect(() => {
    fetchEscorts();
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [lang]);

  // 处理查看陪诊师详情
  const handleViewEscort = (escortId: string) => {
    setSelectedEscortId(escortId);
    setViewMode('escort-detail');
  };

  // 处理下单
  const handleOrder = (escort: any, serviceType: string, price: number) => {
    setOrderEscort(escort);
    setOrderServiceType(serviceType);
    setOrderPrice(price);
    setViewMode('order-confirmation');
  };

  // 处理订单创建成功
  const handleOrderSuccess = (orderId: string) => {
    setSelectedOrderId(orderId);
    setViewMode('order-detail');
  };

  // 处理取消订单
  const handleOrderCancel = () => {
    setViewMode('escort-detail');
  };

  // 处理聊天
  const handleChat = (userId: string) => {
    // TODO: 实现聊天功能
    console.log('Chat with user:', userId);
  };

  // 处理评价
  const handleReview = (orderId: string) => {
    // TODO: 实现评价功能
    console.log('Review order:', orderId);
  };

  // 处理查看订单详情
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setViewMode('order-detail');
  };

  // 返回首页
  const handleBackToHome = () => {
    setViewMode('home');
    setSelectedEscortId('');
    setSelectedOrderId('');
    setOrderEscort(null);
  };

  // 渲染不同视图
  if (viewMode === 'escort-detail' && selectedEscortId) {
    return (
      <EscortDetail
        escortId={selectedEscortId}
        onBack={handleBackToHome}
        onOrder={handleOrder}
        onChat={handleChat}
        lang={lang}
      />
    );
  }

  if (viewMode === 'order-confirmation' && orderEscort) {
    return (
      <OrderConfirmation
        escort={orderEscort}
        serviceType={orderServiceType as any}
        servicePrice={orderPrice}
        onSuccess={handleOrderSuccess}
        onCancel={handleOrderCancel}
        lang={lang}
      />
    );
  }

  if (viewMode === 'order-list') {
    return (
      <OrderList
        lang={lang}
        onOrderClick={handleViewOrder}
        userRole="PATIENT"
      />
    );
  }

  if (viewMode === 'order-detail' && selectedOrderId) {
    return (
      <OrderDetail
        orderId={selectedOrderId}
        lang={lang}
        onBack={() => setViewMode('order-list')}
        onChat={handleChat}
        onReview={handleReview}
      />
    );
  }

  return (
    <div className="pb-20">
      {/* AI Triage Section */}
      <div className="p-4 border-b border-slate-100">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 rounded-2xl p-4 text-white">
          <h2 className="font-bold text-lg mb-2">{t.triage}</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
              placeholder={t.placeholder}
              className="flex-1 px-4 py-2 rounded-full text-slate-900 text-sm"
            />
            <button
              onClick={handleAIChat}
              disabled={aiLoading || !symptoms.trim()}
              className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium disabled:opacity-50"
            >
              {aiLoading ? t.analyzing : t.triage}
            </button>
          </div>
          {aiAdvice && (
            <div className="mt-3 p-3 bg-white/10 rounded-xl text-sm">
              <p className="font-medium mb-1">{t.aiTitle}</p>
              <p>{aiAdvice}</p>
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {t.services.map((service, idx) => (
            <div key={idx} className="flex-shrink-0 bg-slate-50 rounded-xl p-3 w-24 text-center">
              <div className="w-10 h-10 bg-teal-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                <Hospital className="h-5 w-5 text-teal-600" />
              </div>
              <p className="font-bold text-slate-900 text-sm">{service.label}</p>
              <p className="text-xs text-slate-500">{service.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* My Orders Quick Link */}
      <div className="p-4 border-b border-slate-100">
        <div 
          className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setViewMode('order-list')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{t.myOrders}</h3>
              <p className="text-xs text-slate-500">
                {lang === 'zh' ? '查看全部订单' : 'View all orders'}
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </div>
      </div>

      {/* Nearby Escorts */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-900">{t.nearbyEscorts}</h2>
          <button onClick={fetchEscorts} className="p-1 hover:bg-slate-100 rounded-full">
            <RefreshCw className={`h-4 w-4 ${escortsLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {escortsLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-500 mb-2" />
            <span className="text-slate-500">{t.loadingEscorts}</span>
            <button
              onClick={() => {
                if (loadingTimeoutRef.current) {
                  clearTimeout(loadingTimeoutRef.current);
                }
                setUseMockData(true);
                setEscorts(MOCK_ESCORTS);
                setEscortsLoading(false);
                setEscortsError('已切换到演示数据模式');
              }}
              className="mt-3 px-4 py-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              {t.useDemo}
            </button>
          </div>
        ) : escortsError && escorts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-2">{escortsError}</p>
            <button
              onClick={fetchEscorts}
              className="px-4 py-2 bg-teal-500 text-white rounded-full text-sm"
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <>
            {escortsError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-800">{escortsError}</span>
                </div>
                <button
                  onClick={fetchEscorts}
                  className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t.retry}
                </button>
              </div>
            )}

            <div className="space-y-3">
              {escorts.map((escort) => (
                <div 
                  key={escort.id} 
                  className="bg-white rounded-xl p-3 shadow-sm flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleViewEscort(escort.id)}
                >
                  <img
                    src={escort.avatarUrl || `https://picsum.photos/60/60?random=${escort.id}`}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{escort.name}</span>
                      {escort.isVerified && (
                        <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">
                          {t.certified}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {escort.rating.toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{escort.completedOrders} {lang === 'zh' ? '单' : 'orders'}</span>
                      {escort.distance && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {escort.distance}
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button 
                        className="flex-1 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChat(escort.userId || escort.id);
                        }}
                      >
                        {t.consult}
                      </button>
                      <button 
                        className="flex-1 py-1.5 bg-teal-500 rounded-full text-sm text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewEscort(escort.id);
                        }}
                      >
                        {t.book}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
