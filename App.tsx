import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UserRole, PageType, Language, UserInfo, Hospital, EscortProfile } from './types';
import { Search, MoreHorizontal, Mail, FileText, Home, Plus, X, Settings as SettingsIcon, Share, BrainCircuit, Loader2, MessageCircle, Zap, Heart, BarChart2, Calendar, ClipboardList, Car, FileSearch } from 'lucide-react';
import { apiService } from './services/apiService';
import { ThemeProvider } from './contexts/ThemeContext';
import { MessageProvider, useMessages } from './contexts/MessageContext';
import { GuestHome } from './components/home/GuestHome';

// Lazy load heavy components
const PatientDashboard = lazy(() => import('./components/PatientDashboard').then(m => ({ default: m.PatientDashboard })));
const EscortDashboard = lazy(() => import('./components/EscortDashboard').then(m => ({ default: m.EscortDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Lazy load page-level components (code splitting: guests only need the home feed on first paint)
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./components/Register').then(m => ({ default: m.Register })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const Explore = lazy(() => import('./components/Explore').then(m => ({ default: m.Explore })));
const Notifications = lazy(() => import('./components/Notifications').then(m => ({ default: m.Notifications })));
const Messages = lazy(() => import('./components/Messages').then(m => ({ default: m.Messages })));
const Profile = lazy(() => import('./components/Profile').then(m => ({ default: m.Profile })));
const SearchResults = lazy(() => import('./components/SearchResults').then(m => ({ default: m.SearchResults })));
const OrderConfirmation = lazy(() => import('./components/OrderConfirmation').then(m => ({ default: m.OrderConfirmation })));
const OrderList = lazy(() => import('./components/OrderList').then(m => ({ default: m.OrderList })));

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
  </div>
);

// Inner App component that uses message context
const AppContent: React.FC = () => {
  const { unreadCount } = useMessages();
  return <AppWithMessages unreadCount={unreadCount} />;
};

// Main app component with message badge support
const AppWithMessages: React.FC<{ unreadCount: number }> = ({ unreadCount }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [lang, setLang] = useState<Language>('zh');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend');

  // Search state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'hospital' | 'escort' | 'all' | 'web'>('all');
  const [popularHospitals, setPopularHospitals] = useState<Hospital[]>([]);
  const [popularEscorts, setPopularEscorts] = useState<EscortProfile[]>([]);
  const [selectedEscortId, setSelectedEscortId] = useState<string | null>(null);
  
  // Official post interaction states
  const [officialPostLiked, setOfficialPostLiked] = useState(false);
  const [officialPostStats, setOfficialPostStats] = useState({ comments: 124, likes: 13000, shares: 210000 });
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Order creation state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState<'FULL_PROCESS' | 'APPOINTMENT' | 'REPORT_PICKUP' | 'VIP_TRANSPORT'>('FULL_PROCESS');
  const [selectedEscortForOrder, setSelectedEscortForOrder] = useState<EscortProfile | null>(null);

  // Auto-login on app load
  useEffect(() => {
    const initAuth = async () => {
      if (apiService.isLoggedIn()) {
        try {
          const userData = apiService.getUser();
          if (userData) {
            setUser(userData);
            setRole(userData.role);
            try {
              const fullProfile = await apiService.getUserProfile();
              if (fullProfile) {
                const profile = fullProfile.profile || fullProfile;
                setUser({
                  ...userData,
                  profile: {
                    name: profile.name,
                    phone: profile.phone,
                    avatarUrl: profile.avatarUrl || profile.avatar_url,
                    bio: profile.bio
                  }
                });
              }
            } catch {
              console.warn('Using cached user data');
            }
          }
        } catch {
          console.warn('Failed to restore session');
        }
      }
    };
    initAuth();
  }, []);

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setRole(UserRole.GUEST);
    setCurrentPage('home');
  };

  // Handle starting a conversation with an escort
  const handleStartConversation = async (escortId: string) => {
    if (!apiService.isLoggedIn()) {
      setCurrentPage('login');
      return;
    }
    try {
      await apiService.startConversation(escortId);
      setSelectedEscortId(escortId);
      setCurrentPage('messages');
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setCurrentPage('messages');
    }
  };
  
  // Close drawer on route change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setMobileDrawerOpen(false);
      if (currentPage !== 'messages') {
        setSelectedEscortId(null);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [currentPage]);

  const handleInteract = (featureName: string) => {
    if (featureName === 'New Order') {
      if (role === UserRole.GUEST) {
        setCurrentPage('login');
        return;
      }
      // Show service type selection modal
      setShowOrderModal(true);
    } else {
      console.warn(`User interacted with: ${featureName}`);
    }
  };

  const handleSelectServiceType = (type: 'FULL_PROCESS' | 'APPOINTMENT' | 'REPORT_PICKUP' | 'VIP_TRANSPORT') => {
    setSelectedServiceType(type);
    // After selecting service type, show escort selection or proceed to order form
    setShowOrderModal(false);
    // Navigate to explore page to select escort
    setCurrentPage('explore');
  };

  const handleOrderSuccess = (orderId: string) => {
    setSelectedEscortForOrder(null);
    setCurrentPage('orders');
    // Show success message
    alert(lang === 'zh' ? `订单创建成功！订单号: ${orderId}` : `Order created successfully! Order ID: ${orderId}`);
  };

  // Handle search
  const handleSearch = (query: string, type: 'hospital' | 'escort' | 'all' | 'web') => {
    setSearchQuery(query);
    setSearchType(type);
    setIsSearchMode(true);
  };

  // Handle back from search
  const handleSearchBack = () => {
    setIsSearchMode(false);
    setSearchQuery('');
  };

  // Load popular data
  useEffect(() => {
    const loadPopularData = async () => {
      try {
        const [hospitals, escorts] = await Promise.all([
          apiService.getPopularHospitals(5),
          apiService.getPopularEscorts(5),
        ]);
        setPopularHospitals(hospitals);
        setPopularEscorts(escorts);
      } catch (error) {
        console.error('Failed to load popular data:', error);
      }
    };
    loadPopularData();
  }, []);

  const translations = useMemo(() => ({
    zh: {
      search: '搜索医院 / 科室',
      searchPlaceholder: '搜索',
      popular: '热门医院',
      orders: '接单',
      topEscorts: '金牌陪诊师',
      book: '预约',
      services: '服务大厅',
      back: '返回',
      recommend: '推荐服务',
      nearby: '附近陪诊',
      guestName: '客',
      patientName: '患',
      escortName: '陪',
      accountInfo: '账户信息',
      devFeature: '功能开发中',
      goHome: '返回大厅',
      promoContent: '就医不孤单，专业陪诊来帮忙！🏥 \n我们提供：\n✅ 全程陪诊\n✅ 代办买药\n✅ 专车接送\n立即预约体验。',
      memberTitle: 'MediMate Plus',
      memberDesc: '开通会员，享受优先派单与免挂号费特权。',
      memberBtn: '查看详情',
      upgrade: '升级到 MediMate+',
      featureList: ['搜索', '订单', '消息', 'AI助手']
    },
    en: {
      search: 'Search Hospital / Dept',
      searchPlaceholder: 'Search',
      popular: 'Popular Hospitals',
      orders: 'Orders',
      topEscorts: 'Top Escorts',
      book: 'Book',
      services: 'Services',
      back: 'Back',
      recommend: 'Recommended',
      nearby: 'Nearby',
      guestName: 'G',
      patientName: 'P',
      escortName: 'E',
      accountInfo: 'Account Info',
      devFeature: 'Feature under development',
      goHome: 'Go Home',
      promoContent: 'Never go to the hospital alone. Professional escorts are here to help! 🏥 \nWe provide:\n✅ Full Escort\n✅ Med Delivery\n✅ Transport\nBook now.',
      memberTitle: 'MediMate Plus',
      memberDesc: 'Get priority matching and waived booking fees.',
      memberBtn: 'View Details',
      upgrade: 'Upgrade to MediMate+',
      featureList: ['Search', 'Orders', 'Messages', 'AI Assistant']
    }
  }), []);

  const t = translations[lang];

  const renderRightSidebar = () => {
    return (
      <aside className="hidden lg:block w-[350px] pl-8 py-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
             {/* Search */}
             <div className="sticky top-0 bg-white dark:bg-slate-900 pb-3 z-30">
               <SearchBar
                 lang={lang}
                 onSearch={handleSearch}
                 placeholder={t.search}
               />
             </div>

             {/* Trends -> Popular Hospitals */}
             <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden mb-4 border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black px-4 py-3 text-slate-900 dark:text-white">{t.popular}</h2>
                {popularHospitals.length > 0 ? (
                  popularHospitals.map((hospital) => (
                    <div
                      key={hospital.id}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors relative"
                      onClick={() => handleSearch(hospital.name, 'hospital')}
                    >
                       <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{hospital.level} · {hospital.department}</span>
                          <MoreHorizontal className="h-4 w-4" />
                       </div>
                       <div className="font-bold text-slate-900 dark:text-white my-0.5">{hospital.name}</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400">{hospital.rating} ⭐</div>
                    </div>
                  ))
                ) : (
                  // Fallback static data
                  [
                    { tag: lang === 'zh' ? '北京 · 三甲' : 'Beijing · Grade 3A', title: lang === 'zh' ? '北京协和医院' : 'Peking Union Medical College', posts: `5,203 ${t.orders}`, id: 'hosp-001' },
                    { tag: lang === 'zh' ? '上海 · 三甲' : 'Shanghai · Grade 3A', title: lang === 'zh' ? '复旦大学附属华山医院' : 'Huashan Hospital', posts: `2,100 ${t.orders}`, id: 'hosp-002' },
                    { tag: lang === 'zh' ? '广州 · 三甲' : 'Guangzhou · Grade 3A', title: lang === 'zh' ? '中山大学附属第一医院' : 'First Affiliated Hospital', posts: `10.5K ${t.orders}`, id: 'hosp-003' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors relative"
                      onClick={() => {
                        setSearchQuery(item.title);
                        setIsSearchMode(true);
                      }}
                    >
                       <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{item.tag} · 三甲</span>
                          <MoreHorizontal className="h-4 w-4" />
                       </div>
                       <div className="font-bold text-slate-900 dark:text-white my-0.5">{item.title}</div>
                       <div className="text-xs text-slate-500 dark:text-slate-400">{item.posts}</div>
                    </div>
                  ))
                )}
             </div>

              {/* Who to follow -> Top Escorts */}
             <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <h2 className="text-xl font-black px-4 py-3 text-slate-900 dark:text-white">{t.topEscorts}</h2>
                {popularEscorts.length > 0 ? (
                  popularEscorts.map((escort) => (
                    <div
                      key={escort.id}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => handleStartConversation(escort.id)}
                    >
                       <div className="flex items-center gap-3">
                          <img src={escort.imageUrl || `https://picsum.photos/100/100?random=${escort.id}`} alt={escort.name} className="h-10 w-10 rounded-full bg-slate-300" />
                          <div className="leading-tight">
                             <div className="font-bold hover:underline text-slate-900 dark:text-white">{escort.name}</div>
                             <div className="text-slate-500 dark:text-slate-400 text-sm">{escort.rating} ⭐ · {escort.completedOrders} 订单</div>
                          </div>
                       </div>
                       <button
                         className="bg-black dark:bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800 dark:hover:bg-teal-500"
                         onClick={(e) => { e.stopPropagation(); handleStartConversation(escort.id); }}
                       >
                          {t.book}
                       </button>
                    </div>
                  ))
                ) : (
                  // Fallback static data
                  [
                    { id: 'escort-wang', name: lang === 'zh' ? '王淑芬' : 'Wang Shu', handle: '@wang_pro', avatar: 'https://picsum.photos/100/100?random=20', rating: 4.9, orders: 523 },
                    { id: 'escort-zhang', name: lang === 'zh' ? '张伟' : 'Zhang Wei', handle: '@zhang_expert', avatar: 'https://picsum.photos/100/100?random=21', rating: 4.8, orders: 210 },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                      onClick={() => handleStartConversation(item.id)}
                    >
                       <div className="flex items-center gap-3">
                          <img src={item.avatar} alt={item.name} className="h-10 w-10 rounded-full bg-slate-300" />
                          <div className="leading-tight">
                             <div className="font-bold hover:underline text-slate-900 dark:text-white">{item.name}</div>
                             <div className="text-slate-500 dark:text-slate-400 text-sm">{item.rating} ⭐ · {item.orders} 订单</div>
                          </div>
                       </div>
                       <button
                         className="bg-black dark:bg-teal-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800 dark:hover:bg-teal-500"
                         onClick={(e) => { e.stopPropagation(); handleStartConversation(item.id); }}
                       >
                          {t.book}
                       </button>
                    </div>
                  ))
                )}
             </div>
      </aside>
    );
  };

  const renderMainContent = () => {
    // Search mode - show search results
    if (isSearchMode) {
      return <SearchResults lang={lang} onBack={handleSearchBack} initialQuery={searchQuery} initialType={searchType} />;
    }

    // Top-level page overrides
    switch (currentPage) {
      case 'settings':
        return <Settings currentLang={lang} setLang={setLang} onBack={() => setCurrentPage('home')} />;
      case 'explore':
        return <Explore lang={lang} user={user} onSelectHospital={(hospital) => { setSearchQuery(hospital.name); setIsSearchMode(true); }} />;
      case 'notifications':
        return <Notifications lang={lang} user={user} />;
      case 'messages':
        return <Messages lang={lang} user={user} initialPartnerId={selectedEscortId} />;
      case 'profile':
        return <Profile lang={lang} role={role} user={user} onBack={() => setCurrentPage('home')} onLogout={handleLogout} />;
      case 'admin':
        return <Suspense fallback={<PageLoader />}><AdminDashboard lang={lang} /></Suspense>;
      case 'saved':
        return <div className="p-10 text-center"><h2 className="text-xl font-bold">Saved functionality coming soon.</h2></div>;
      case 'orders':
        return <OrderList lang={lang} user={user} />;
      case 'order-confirmation':
        return selectedEscortForOrder ? (
          <OrderConfirmation
            escort={{
              id: selectedEscortForOrder.id,
              name: selectedEscortForOrder.name,
              avatar: selectedEscortForOrder.imageUrl,
              rating: selectedEscortForOrder.rating,
              hourly_rate: selectedEscortForOrder.hourlyRate || 100,
              is_verified: selectedEscortForOrder.isCertified
            }}
            serviceType={selectedServiceType}
            servicePrice={selectedEscortForOrder.hourlyRate || 100}
            onSuccess={handleOrderSuccess}
            onCancel={() => setCurrentPage('explore')}
            lang={lang}
          />
        ) : (
          <div className="p-10 text-center">
            <h2 className="text-xl font-bold mb-4">{lang === 'zh' ? '请先选择陪诊师' : 'Please select an escort first'}</h2>
            <button
              onClick={() => setCurrentPage('explore')}
              className="px-6 py-3 bg-teal-600 text-white rounded-full font-bold hover:bg-teal-700 transition-colors"
            >
              {lang === 'zh' ? '去选择陪诊师' : 'Choose Escort'}
            </button>
          </div>
        );
    }

    // Home feed based on role
    switch (role) {
      case UserRole.PATIENT:
        return <Suspense fallback={<PageLoader />}><PatientDashboard lang={lang} user={user} onSelectService={(service) => { setSearchQuery(service); setIsSearchMode(true); }} /></Suspense>;
      case UserRole.ESCORT:
        return <Suspense fallback={<PageLoader />}><EscortDashboard lang={lang} user={user} /></Suspense>;
      default:
        return (
          <>
            <div className="mx-4 mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
              <strong>赛事演示环境</strong> · 页面数据为合成数据，演示服务流程与记录校验能力。
            </div>
            <GuestHome
              lang={lang}
              role={role}
              user={user}
              popularHospitals={popularHospitals}
              popularEscorts={popularEscorts}
              onSearch={handleSearch}
              onNavigate={(path) => setCurrentPage(path as PageType)}
              onOpenServiceSheet={() => role === UserRole.GUEST ? setCurrentPage('login') : setShowOrderModal(true)}
              onOpenAI={() => handleSearch('AI 医疗流程问答', 'web')}
              onStartConversation={handleStartConversation}
              onOpenLogin={() => setCurrentPage('login')}
            />
          </>
        );
        // Guest View Feed - Styled like tweets but content is promotional
        return (
          <div className="divide-y divide-slate-100">
            {/* Promo Post */}
            <div 
              className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => handleInteract('Pinned Post')}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-sm">M</div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-slate-900">MediMate 医伴</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-blue-500 fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.748 2.795 1.863 3.616-.203.438-.323.922-.323 1.434 0 2.21 1.71 3.998 3.818 3.998.47 0 .92-.084 1.336-.25.62 1.333 1.926 2.25 3.437 2.25s2.817-.917 3.437-2.25c.415.165.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.512-.12-.996-.323-1.434 1.114-.82 1.863-2.16 1.863-3.616zm-5.558-1.984l-4.235 7.48c-.144.255-.38.41-.66.41-.28 0-.514-.155-.658-.41l-2.456-4.34c-.204-.36-.075-.815.286-1.018.36-.203.816-.074 1.018.286l1.812 3.2 3.6-6.355c.203-.36.66-.488 1.02-.285.36.203.49.658.284 1.02z"></path></g></svg>
                    <span className="text-slate-500 text-sm">@medimate_official · 20{lang === 'zh' ? '小时' : 'h'}</span>
                  </div>
                  <p className="text-slate-900 mt-1 whitespace-pre-line">
                    {t.promoContent}
                  </p>
                  <div className="mt-3 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                     <img src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80" alt="Medical Escort" className="w-full h-64 object-cover" />
                  </div>
                   <div className="mt-3 flex items-center gap-6 text-slate-500">
                     <button 
                       className="flex items-center gap-2 hover:text-blue-500 transition-colors group"
                       onClick={() => {
                         setOfficialPostStats(prev => ({ ...prev, comments: prev.comments + 1 }));
                         setCurrentPage('messages');
                       }}
                     >
                       <MessageCircle className="h-5 w-5" />
                       <span className="text-sm">{officialPostStats.comments}</span>
                     </button>
                     <button 
                       className="flex items-center gap-2 hover:text-green-500 transition-colors group"
                       onClick={() => {
                         if (role === UserRole.GUEST) {
                           setCurrentPage('login');
                         } else {
                           setSearchQuery('快速预约');
                           setIsSearchMode(true);
                         }
                       }}
                     >
                       <Zap className="h-5 w-5" />
                       <span className="text-sm">502</span>
                     </button>
                     <button 
                       className={`flex items-center gap-2 transition-colors group ${officialPostLiked ? 'text-red-500' : 'hover:text-red-500'}`}
                       onClick={() => {
                         setOfficialPostLiked(!officialPostLiked);
                         setOfficialPostStats(prev => ({
                           ...prev,
                           likes: officialPostLiked ? prev.likes - 1 : prev.likes + 1
                         }));
                       }}
                     >
                       <Heart className={`h-5 w-5 ${officialPostLiked ? 'fill-current' : ''}`} />
                       <span className="text-sm">{(officialPostStats.likes / 10000).toFixed(1)}{lang === 'zh' ? '万' : '0k'}</span>
                     </button>
                     <button 
                       className="flex items-center gap-2 hover:text-teal-500 transition-colors group"
                       onClick={() => alert(lang === 'zh' ? '浏览量统计' : 'View count stats')}
                     >
                       <BarChart2 className="h-5 w-5" />
                       <span className="text-sm">{(officialPostStats.shares / 10000).toFixed(0)}{lang === 'zh' ? '万' : '0k'}</span>
                     </button>
                     <div className="relative ml-auto">
                       <button 
                         className="hover:text-blue-500 transition-colors"
                         onClick={() => setShowShareMenu(!showShareMenu)}
                       >
                         <Share className="h-5 w-5" />
                       </button>
                       {showShareMenu && (
                         <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-slate-100 py-2 z-10 min-w-[140px]">
                           <button 
                             className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                             onClick={() => {
                               if (navigator.share) {
                                 navigator.share({
                                   title: 'MediMate 官方服务',
                                   text: '专业陪诊服务，让就医更轻松',
                                   url: window.location.href
                                 });
                               } else {
                                 navigator.clipboard.writeText(window.location.href);
                                 alert(lang === 'zh' ? '链接已复制' : 'Link copied');
                               }
                               setShowShareMenu(false);
                             }}
                           >
                             <Share className="h-4 w-4" />
                             {lang === 'zh' ? '分享' : 'Share'}
                           </button>
                           <button 
                             className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                             onClick={() => {
                               navigator.clipboard.writeText(window.location.href);
                               alert(lang === 'zh' ? '链接已复制到剪贴板' : 'Link copied to clipboard');
                               setShowShareMenu(false);
                             }}
                           >
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                             {lang === 'zh' ? '复制链接' : 'Copy Link'}
                           </button>
                         </div>
                       )}
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Premium CTA -> Membership CTA */}
            <div className="p-4 border-t border-slate-100">
               <div className="flex gap-3">
                 <div className="h-10 w-10 bg-slate-900 rounded-md flex items-center justify-center text-white font-bold">M+</div>
                 <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-900">{t.memberTitle}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-yellow-500 fill-current"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.457.748 2.795 1.863 3.616-.203.438-.323.922-.323 1.434 0 2.21 1.71 3.998 3.818 3.998.47 0 .92-.084 1.336-.25.62 1.333 1.926 2.25 3.437 2.25s2.817-.917 3.437-2.25c.415.165.866.25 1.336.25 2.11 0 3.818-1.79 3.818-4 0-.512-.12-.996-.323-1.434 1.114-.82 1.863-2.16 1.863-3.616zm-5.558-1.984l-4.235 7.48c-.144.255-.38.41-.66.41-.28 0-.514-.155-.658-.41l-2.456-4.34c-.204-.36-.075-.815.286-1.018.36-.203.816-.074 1.018.286l1.812 3.2 3.6-6.355c.203-.36.66-.488 1.02-.285.36.203.49.658.284 1.02z"></path></g></svg>
                    </div>
                    <p className="text-slate-900 mb-2">{t.memberDesc}</p>
                    <div className="bg-gradient-to-br from-slate-900 to-teal-900 h-48 w-full rounded-2xl flex flex-col items-center justify-center text-white text-center p-6 relative overflow-hidden">
                       <div className="z-10">
                          <h2 className="text-2xl font-bold mb-2">{t.upgrade}</h2>
                          <button onClick={() => setCurrentPage('login')} className="mt-4 px-6 py-2 bg-white text-black rounded-full font-bold">{t.memberBtn}</button>
                       </div>
                    </div>
                 </div>
               </div>
            </div>
            
            {/* Spacer for Bottom Nav */}
            <div className="h-24"></div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-black dark:text-white font-sans flex justify-center relative">

       {currentPage === 'login' && (
         <Suspense fallback={<PageLoader />}>
           <Login
             setRole={(r) => { setRole(r); setCurrentPage('home'); }}
             onClose={() => setCurrentPage('home')}
             onSwitchToRegister={() => setCurrentPage('register')}
             lang={lang}
           />
         </Suspense>
       )}

       {currentPage === 'register' && (
         <Suspense fallback={<PageLoader />}>
           <Register
             setRole={(r) => { setRole(r); setCurrentPage('home'); }}
             onClose={() => setCurrentPage('home')}
             onSwitchToLogin={() => setCurrentPage('login')}
             lang={lang}
           />
         </Suspense>
       )}

       {/* Mobile Drawer */}
      {mobileDrawerOpen && (
         <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 shadow-2xl overflow-y-auto">
               <div className="p-4 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6">
                     <div className="font-bold text-xl text-slate-900 dark:text-white">{t.accountInfo}</div>
                     <button onClick={() => setMobileDrawerOpen(false)}><X className="h-6 w-6 text-slate-900 dark:text-white"/></button>
                  </div>
                  <Header
                     role={role}
                     setRole={setRole}
                     currentPage={currentPage}
                     setPage={setCurrentPage}
                     lang={lang}
                     onInteract={handleInteract}
                     user={user}
                     onLogout={handleLogout}
                  />
               </div>
            </div>
         </div>
      )}

       {/* Mobile Floating Action Button -> Post Request */}
       <div className="fixed bottom-20 right-4 lg:hidden z-40">
          <button 
            className="h-14 w-14 bg-teal-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-teal-600 transition-colors"
            onClick={() => role === UserRole.GUEST ? setCurrentPage('login') : handleInteract('Compose')}
          >
             <Plus className="h-8 w-8" />
          </button>
       </div>

       <div className="flex w-full max-w-[1300px]">
          {/* Desktop Left Sidebar */}
          <header className="hidden lg:flex w-[80px] xl:w-[275px] flex-shrink-0 px-2 flex-col items-end xl:items-start sticky top-0 h-screen overflow-y-auto no-scrollbar py-2 z-50">
             <Header
                role={role}
                setRole={setRole}
                currentPage={currentPage}
                setPage={setCurrentPage}
                lang={lang}
                onInteract={handleInteract}
                user={user}
                onLogout={handleLogout}
             />
          </header>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 border-x border-slate-100 dark:border-slate-800 max-w-[600px] w-full">
             
             {/* Desktop Sticky Header */}
             <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 h-[53px] items-center justify-between cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {currentPage === 'home' ? t.services : (
                    currentPage === 'explore' ? (lang === 'zh' ? '探索' : 'Explore') :
                    currentPage === 'notifications' ? (lang === 'zh' ? '通知' : 'Notifications') :
                    currentPage === 'messages' ? (lang === 'zh' ? '私信' : 'Messages') :
                    currentPage === 'profile' ? (lang === 'zh' ? '个人资料' : 'Profile') :
                    t.back
                  )}
                </h1>
             </div>

             {/* Mobile Sticky Header */}
             <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-transform duration-200">
                {/* Top Row: Avatar - Logo - Settings */}
                <div className="flex justify-between items-center px-4 h-[53px]">
                   <div onClick={() => setMobileDrawerOpen(true)} className="cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-sm border border-slate-300 dark:border-slate-600">
                         {role === UserRole.GUEST ? t.guestName : role === UserRole.PATIENT ? t.patientName : t.escortName}
                      </div>
                   </div>
                   <div className="h-6 w-6 text-black dark:text-white" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                        <path d="M4 4h4l4 10 4-10h4v16h-4V11l-4 9-4-9v9H4V4z"/>
                      </svg>
                   </div>
                   <div onClick={() => setCurrentPage('settings')} className="cursor-pointer">
                      <SettingsIcon className="h-5 w-5 text-slate-900 dark:text-white" />
                   </div>
                </div>

                {/* Tab Row - Only on Home */}
                {currentPage === 'home' && (
                  <div className="flex border-b border-slate-100 dark:border-slate-800">
                     <div 
                       className="flex-1 flex justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors relative"
                       onClick={() => setActiveTab('recommend')}
                     >
                        <div className={`py-3 font-bold text-sm ${activeTab === 'recommend' ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                           {t.recommend}
                           {activeTab === 'recommend' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-teal-500 rounded-full"></div>}
                        </div>
                     </div>
                     <div 
                       className="flex-1 flex justify-center hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors relative"
                       onClick={() => setActiveTab('nearby')}
                     >
                        <div className={`py-3 font-bold text-sm ${activeTab === 'nearby' ? 'text-black dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                           {t.nearby}
                           {activeTab === 'nearby' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-teal-500 rounded-full"></div>}
                        </div>
                     </div>
                  </div>
                )}
             </div>
             
             {/* 页面切换过渡用纯 CSS 动画（.page-transition，见 index.css），key 变化触发重新播放 */}
             <div key={isSearchMode ? 'search_mode' : currentPage} className="page-transition w-full relative">
               <Suspense fallback={<PageLoader />}>
                 {renderMainContent()}
               </Suspense>
             </div>
          </main>

          {renderRightSidebar()}
       </div>
       
       {/* Service Type Selection Modal */}
       {showOrderModal && (
         <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
           <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-6">
               <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                 {lang === 'zh' ? '选择服务类型' : 'Select Service Type'}
               </h2>
               <button
                 onClick={() => setShowOrderModal(false)}
                 className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
               >
                 <X className="h-5 w-5 text-slate-500" />
               </button>
             </div>

             <div className="space-y-3">
               {[
                 {
                   type: 'FULL_PROCESS' as const,
                   icon: ClipboardList,
                   title: lang === 'zh' ? '全程陪诊' : 'Full Escort',
                   desc: lang === 'zh' ? '从挂号到取药的全程陪伴' : 'Full accompaniment from registration to medication'
                 },
                 {
                   type: 'APPOINTMENT' as const,
                   icon: Calendar,
                   title: lang === 'zh' ? '代约挂号' : 'Appointment Booking',
                   desc: lang === 'zh' ? '帮助预约专家号源' : 'Help booking specialist appointments'
                 },
                 {
                   type: 'REPORT_PICKUP' as const,
                   icon: FileSearch,
                   title: lang === 'zh' ? '代取报告' : 'Report Pickup',
                   desc: lang === 'zh' ? '代取检查报告并解读' : 'Pick up and interpret medical reports'
                 },
                 {
                   type: 'VIP_TRANSPORT' as const,
                   icon: Car,
                   title: lang === 'zh' ? '专车接送' : 'VIP Transport',
                   desc: lang === 'zh' ? '舒适专车接送服务' : 'Comfortable private car transport service'
                 }
               ].map((service) => (
                 <button
                   key={service.type}
                   onClick={() => handleSelectServiceType(service.type)}
                   className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all text-left"
                 >
                   <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                     <service.icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                   </div>
                   <div className="flex-1">
                     <h3 className="font-bold text-slate-900 dark:text-white">{service.title}</h3>
                     <p className="text-sm text-slate-500 dark:text-slate-400">{service.desc}</p>
                   </div>
                 </button>
               ))}
             </div>

             <p className="mt-4 text-xs text-slate-400 text-center">
               {lang === 'zh' ? '选择后将进入陪诊师选择页面' : 'You will select an escort after choosing the service'}
             </p>
           </div>
         </div>
       )}

       {/* Mobile Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-between px-6 py-3 lg:hidden z-50 pb-safe">
         <div className="cursor-pointer" onClick={() => setCurrentPage('home')}>
            <Home className={`h-7 w-7 ${currentPage === 'home' ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-slate-900 dark:text-slate-300'}`} strokeWidth={currentPage === 'home' ? 2.5 : 2} />
         </div>
         <div className="cursor-pointer text-slate-900 dark:text-slate-300" onClick={() => setCurrentPage('explore')}>
            <Search className={`h-7 w-7 ${currentPage === 'explore' ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-slate-900 dark:text-slate-300'}`} strokeWidth={currentPage === 'explore' ? 3 : 2} />
         </div>
         <div className="cursor-pointer text-slate-900 dark:text-slate-300" onClick={() => handleInteract('AI Assistant')}>
            {/* AI Assistant Icon */}
            <div className="h-7 w-7 border-2 border-teal-600 rounded-md flex items-center justify-center relative bg-teal-50 dark:bg-teal-900/30">
               <BrainCircuit className="h-4 w-4 text-teal-700 dark:text-teal-400" />
            </div>
         </div>
         <div className="cursor-pointer text-slate-900 dark:text-slate-300" onClick={() => setCurrentPage('notifications')}>
             <FileText className={`h-7 w-7 ${currentPage === 'notifications' ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-slate-900 dark:text-slate-300'}`} />
         </div>
         <div className="cursor-pointer text-slate-900 dark:text-slate-300 relative" onClick={() => setCurrentPage('messages')}>
             <Mail className={`h-7 w-7 ${currentPage === 'messages' ? 'fill-black dark:fill-white text-black dark:text-white' : 'text-slate-900 dark:text-slate-300'}`} />
             {unreadCount > 0 && (
               <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1">
                 {unreadCount > 99 ? '99+' : unreadCount}
               </div>
             )}
         </div>
       </div>
    </div>
  );
};

// Main App component wrapped with MessageProvider
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MessageProvider>
          <AppContent />
        </MessageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
