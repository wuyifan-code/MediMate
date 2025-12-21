import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PatientDashboard } from './components/PatientDashboard';
import { EscortDashboard } from './components/EscortDashboard';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { Explore } from './components/Explore';
import { Notifications } from './components/Notifications';
import { Messages } from './components/Messages';
import { Profile } from './components/Profile';
import { UserRole, PageType, Language } from './types';
import { Search, MoreHorizontal, Mail, FileText, Home, Plus, X, Settings as SettingsIcon, Share, BrainCircuit } from 'lucide-react';
import { apiService } from './services/apiService';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.GUEST);
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const [lang, setLang] = useState<Language>('zh');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'recommend' | 'nearby'>('recommend');
  
  // Auto-login on app load
  useEffect(() => {
    const user = apiService.getUser();
    if (user) {
      setRole(user.role);
    }
  }, []);
  
  // Close drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [currentPage]);

  const handleInteract = (featureName: string) => {
    console.log(`User interacted with: ${featureName}`);
  };

  const t = {
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
  }[lang];

  const renderRightSidebar = () => {
    return (
      <aside className="hidden lg:block w-[350px] pl-8 py-4 sticky top-0 h-screen overflow-y-auto no-scrollbar">
             {/* Search */}
             <div className="sticky top-0 bg-white pb-3 z-30">
               <div className="group relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Search className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500" />
                 </div>
                 <input 
                   type="text" 
                   placeholder={t.search}
                   className="bg-slate-100 w-full rounded-full py-3 pl-12 pr-4 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white border border-transparent focus:border-teal-500 transition-all"
                   onClick={() => handleInteract('Search')}
                 />
               </div>
             </div>

             {/* Trends -> Popular Hospitals */}
             <div className="bg-slate-50 rounded-2xl overflow-hidden mb-4 border border-slate-100">
                <h2 className="text-xl font-black px-4 py-3">{t.popular}</h2>
                {[
                  { tag: lang === 'zh' ? '北京' : 'Beijing', title: lang === 'zh' ? '北京协和医院' : 'Peking Union Medical College', posts: `5,203 ${t.orders}` },
                  { tag: lang === 'zh' ? '上海' : 'Shanghai', title: lang === 'zh' ? '复旦大学附属华山医院' : 'Huashan Hospital', posts: `2,100 ${t.orders}` },
                  { tag: lang === 'zh' ? '广州' : 'Guangzhou', title: lang === 'zh' ? '中山大学附属第一医院' : 'First Affiliated Hospital', posts: `10.5K ${t.orders}` },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="px-4 py-3 hover:bg-slate-100 cursor-pointer transition-colors relative"
                    onClick={() => handleInteract(`Hospital: ${item.title}`)}
                  >
                     <div className="flex justify-between text-xs text-slate-500">
                        <span>{item.tag} · 三甲</span>
                        <MoreHorizontal className="h-4 w-4" />
                     </div>
                     <div className="font-bold text-slate-900 my-0.5">{item.title}</div>
                     <div className="text-xs text-slate-500">{item.posts}</div>
                  </div>
                ))}
             </div>

              {/* Who to follow -> Top Escorts */}
             <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                <h2 className="text-xl font-black px-4 py-3">{t.topEscorts}</h2>
                {[
                  { name: lang === 'zh' ? '王淑芬' : 'Wang', handle: '@wang_pro', avatar: 'https://picsum.photos/100/100?random=20' },
                  { name: lang === 'zh' ? '张伟' : 'Zhang', handle: '@zhang_expert', avatar: 'https://picsum.photos/100/100?random=21' },
                ].map((item, idx) => (
                  <div 
                    key={idx} 
                    className="px-4 py-3 hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
                    onClick={() => handleInteract(`Profile: ${item.handle}`)}
                  >
                     <div className="flex items-center gap-3">
                        <img src={item.avatar} alt={item.name} className="h-10 w-10 rounded-full bg-slate-300" />
                        <div className="leading-tight">
                           <div className="font-bold hover:underline">{item.name}</div>
                           <div className="text-slate-500 text-sm">{item.handle}</div>
                        </div>
                     </div>
                     <button 
                       className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-slate-800"
                       onClick={(e) => { e.stopPropagation(); handleInteract(`Book ${item.handle}`); }}
                     >
                        {t.book}
                     </button>
                  </div>
                ))}
             </div>
      </aside>
    );
  };

  const renderMainContent = () => {
    // Top-level page overrides
    switch (currentPage) {
      case 'settings':
        return <Settings currentLang={lang} setLang={setLang} onBack={() => setCurrentPage('home')} />;
      case 'explore':
        return <Explore lang={lang} />;
      case 'notifications':
        return <Notifications lang={lang} />;
      case 'messages':
        return <Messages lang={lang} />;
      case 'profile':
        return <Profile lang={lang} role={role} onBack={() => setCurrentPage('home')} />;
      case 'saved':
        return <div className="p-10 text-center"><h2 className="text-xl font-bold">Saved functionality coming soon.</h2></div>;
    }

    // Home feed based on role
    switch (role) {
      case UserRole.PATIENT:
        return <PatientDashboard lang={lang} />;
      case UserRole.ESCORT:
        return <EscortDashboard lang={lang} />;
      default:
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
                   <div className="mt-3 flex justify-between text-slate-500 max-w-md pr-4">
                     <button className="hover:text-teal-500 flex items-center gap-1 text-xs"><span className="p-2 hover:bg-blue-50 rounded-full">💬</span> 124</button>
                     <button className="hover:text-green-500 flex items-center gap-1 text-xs"><span className="p-2 hover:bg-green-50 rounded-full">⚡</span> 502</button>
                     <button className="hover:text-red-500 flex items-center gap-1 text-xs"><span className="p-2 hover:bg-red-50 rounded-full">❤️</span> 1.3{lang === 'zh' ? '万' : '0k'}</button>
                     <button className="hover:text-teal-500 flex items-center gap-1 text-xs"><span className="p-2 hover:bg-teal-50 rounded-full">📊</span> 21{lang === 'zh' ? '万' : '0k'}</button>
                     <button className="hover:text-blue-500"><Share className="h-4 w-4" /></button>
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
    <div className="min-h-screen bg-white text-black font-sans flex justify-center relative">
       
       {currentPage === 'login' && (
         <Login 
           setRole={(r) => { setRole(r); setCurrentPage('home'); }} 
           onClose={() => setCurrentPage('home')}
           lang={lang}
         />
       )}

       {/* Mobile Drawer */}
       {mobileDrawerOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
             <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)}></div>
             <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl overflow-y-auto">
                <div className="p-4 flex flex-col h-full">
                   <div className="flex justify-between items-center mb-6">
                      <div className="font-bold text-xl">{t.accountInfo}</div>
                      <button onClick={() => setMobileDrawerOpen(false)}><X className="h-6 w-6"/></button>
                   </div>
                   <Header 
                      role={role} 
                      setRole={setRole} 
                      currentPage={currentPage} 
                      setPage={setCurrentPage} 
                      lang={lang}
                      onInteract={handleInteract}
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
             />
          </header>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0 border-x border-slate-100 max-w-[600px] w-full">
             
             {/* Desktop Sticky Header */}
             <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 h-[53px] items-center justify-between cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                <h1 className="text-xl font-bold text-slate-900">
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
             <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-transform duration-200">
                {/* Top Row: Avatar - Logo - Settings */}
                <div className="flex justify-between items-center px-4 h-[53px]">
                   <div onClick={() => setMobileDrawerOpen(true)} className="cursor-pointer">
                      <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-300">
                         {role === UserRole.GUEST ? t.guestName : role === UserRole.PATIENT ? t.patientName : t.escortName}
                      </div>
                   </div>
                   <div className="h-6 w-6 text-black" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
                        <path d="M4 4h4l4 10 4-10h4v16h-4V11l-4 9-4-9v9H4V4z"/>
                      </svg>
                   </div>
                   <div onClick={() => setCurrentPage('settings')} className="cursor-pointer">
                      <SettingsIcon className="h-5 w-5 text-slate-900" />
                   </div>
                </div>

                {/* Tab Row - Only on Home */}
                {currentPage === 'home' && (
                  <div className="flex border-b border-slate-100">
                     <div 
                       className="flex-1 flex justify-center hover:bg-slate-100 cursor-pointer transition-colors relative"
                       onClick={() => setActiveTab('recommend')}
                     >
                        <div className={`py-3 font-bold text-sm ${activeTab === 'recommend' ? 'text-black' : 'text-slate-500'}`}>
                           {t.recommend}
                           {activeTab === 'recommend' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-teal-500 rounded-full"></div>}
                        </div>
                     </div>
                     <div 
                       className="flex-1 flex justify-center hover:bg-slate-100 cursor-pointer transition-colors relative"
                       onClick={() => setActiveTab('nearby')}
                     >
                        <div className={`py-3 font-bold text-sm ${activeTab === 'nearby' ? 'text-black' : 'text-slate-500'}`}>
                           {t.nearby}
                           {activeTab === 'nearby' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-teal-500 rounded-full"></div>}
                        </div>
                     </div>
                  </div>
                )}
             </div>
             
             {renderMainContent()}
          </main>

          {renderRightSidebar()}
       </div>
       
       {/* Mobile Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-between px-6 py-3 lg:hidden z-50 pb-safe">
         <div className="cursor-pointer" onClick={() => setCurrentPage('home')}>
            <Home className={`h-7 w-7 ${currentPage === 'home' ? 'fill-black text-black' : 'text-slate-900'}`} strokeWidth={currentPage === 'home' ? 2.5 : 2} />
         </div>
         <div className="cursor-pointer text-slate-900" onClick={() => setCurrentPage('explore')}>
            <Search className={`h-7 w-7 ${currentPage === 'explore' ? 'fill-black text-black' : 'text-slate-900'}`} strokeWidth={currentPage === 'explore' ? 3 : 2} />
         </div>
         <div className="cursor-pointer text-slate-900" onClick={() => handleInteract('AI Assistant')}>
            {/* AI Assistant Icon */}
            <div className="h-7 w-7 border-2 border-teal-600 rounded-md flex items-center justify-center relative bg-teal-50">
               <BrainCircuit className="h-4 w-4 text-teal-700" />
            </div>
         </div>
         <div className="cursor-pointer text-slate-900" onClick={() => setCurrentPage('notifications')}>
             <FileText className={`h-7 w-7 ${currentPage === 'notifications' ? 'fill-black text-black' : 'text-slate-900'}`} />
         </div>
         <div className="cursor-pointer text-slate-900" onClick={() => setCurrentPage('messages')}>
             <Mail className={`h-7 w-7 ${currentPage === 'messages' ? 'fill-black text-black' : 'text-slate-900'}`} />
         </div>
       </div>

    </div>
  );
};

export default App;