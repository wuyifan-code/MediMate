import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { UserRole, PageType, Language, UserInfo } from '../types';
import { apiService } from '../services/apiService';
import { useMessages } from '../contexts/MessageContext';
import { ServicePublishModal } from './ServicePublishModal';
import {
  Home,
  Search,
  Mail,
  Bookmark,
  User,
  MoreHorizontal,
  PenSquare,
  Settings,
  HelpCircle,
  LogOut,
  FileText,
  Shield,
  Briefcase,
  PlusCircle,
  List,
  ChevronDown
} from 'lucide-react';

interface HeaderProps {
  role: UserRole;
  setRole: (role: UserRole) => void;
  currentPage: PageType;
  setPage: (page: PageType) => void;
  lang: Language;
  onInteract: (msg: string) => void;
  user?: UserInfo | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ role, setRole, currentPage, setPage, lang, onInteract, user: userProp, onLogout }) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showServiceMenu, setShowServiceMenu] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const { unreadCount: messageUnread, refreshUnreadCount } = useMessages();
  const serviceMenuRef = useRef<HTMLDivElement>(null);

  const user = useMemo(() => {
    if (userProp) {
      return userProp;
    }
    if (role !== UserRole.GUEST) {
      const storedUser = apiService.getUser();
      return storedUser as UserInfo | null;
    }
    return null;
  }, [userProp, role]);

  const translations = useMemo(() => ({
    zh: {
      home: '大厅',
      explore: '找医院',
      notifications: '订单消息',
      messages: '咨询',
      saved: '我的收藏',
      profile: '个人中心',
      more: '更多',
      settings: '设置',
      help: '客服中心',
      logout: '退出登录',
      book: '发布需求',
      online: '接单模式',
      signup: '登录 / 注册',
      guest: '游客',
      escort: '陪诊师',
      patient: '患者',
      admin: '管理后台',
      publishService: '发布服务',
      myServices: '我的服务',
      serviceMenu: '服务菜单'
    },
    en: {
      home: 'Lobby',
      explore: 'Hospitals',
      notifications: 'Orders',
      messages: 'Chats',
      saved: 'Saved',
      profile: 'Profile',
      more: 'More',
      settings: 'Settings',
      help: 'Support',
      logout: 'Log out',
      book: 'Post Request',
      online: 'Work Mode',
      signup: 'Sign Up / Login',
      guest: 'Guest',
      escort: 'Escort',
      patient: 'Patient',
      admin: 'Admin Panel',
      publishService: 'Publish Service',
      myServices: 'My Services',
      serviceMenu: 'Service Menu'
    }
  }), []);

  const t = translations[lang];

  const fetchNotificationCount = useCallback(async () => {
    if (role === UserRole.GUEST) {
      setNotificationUnread(0);
      return;
    }

    try {
      const notificationsData = await apiService.getNotifications(1, 1, true);
      setNotificationUnread(notificationsData?.total || 0);
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, [role]);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    const timer = setTimeout(() => {
      fetchNotificationCount();
    }, 0);
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotificationCount]);

  // Close service menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (serviceMenuRef.current && !serviceMenuRef.current.contains(event.target as Node)) {
        setShowServiceMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePublishSuccess = () => {
    setShowPublishModal(false);
    // Refresh service list - navigate to escort dashboard services tab
    setPage('escort-dashboard');
    onInteract('Service published successfully');
  };

  const handlePublishClick = () => {
    setShowServiceMenu(false);
    setShowPublishModal(true);
  };

  const handleMyServicesClick = () => {
    setShowServiceMenu(false);
    setPage('escort-dashboard');
  };

  const renderBadge = (count: number, onClick?: () => void) => {
    if (count <= 0) return null;

    return (
      <span
        onClick={onClick}
        className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white rounded-full shadow-md cursor-pointer transition-transform hover:scale-110 ${
          count > 99 ? 'px-1' : 'px-1.5'
        } bg-red-500`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  const renderDotBadge = (onClick?: () => void) => {
    return (
      <span
        onClick={onClick}
        className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full shadow-md cursor-pointer hover:scale-110 transition-transform"
      />
    );
  };

  // Map X icons to Medical context but keep the visual weight
  const navItems = [
    { id: 'home', icon: Home, label: t.home },
    { id: 'explore', icon: Search, label: t.explore },
    { id: 'notifications', icon: FileText, label: t.notifications, badge: notificationUnread, onBadgeClick: () => setPage('notifications') },
    { id: 'messages', icon: Mail, label: t.messages, badge: messageUnread, onBadgeClick: () => setPage('messages') },
    { id: 'saved', icon: Bookmark, label: t.saved },
    { id: 'profile', icon: User, label: t.profile },
  ];

  const handleNavClick = (id: string) => {
    setPage(id as PageType);
  };

  // Render escort action button with dropdown
  const renderEscortActionButton = () => {
    if (role !== UserRole.ESCORT) {
      return (
        <button 
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-full p-4 xl:px-8 xl:py-3.5 w-max xl:w-full font-bold text-lg shadow-lg transition-colors flex justify-center items-center"
          onClick={() => role === UserRole.GUEST ? setPage('login') : onInteract('New Order')}
        >
          <span className="hidden xl:block">
            {role === UserRole.PATIENT ? t.book : t.signup}
          </span>
          <PenSquare className="block xl:hidden h-6 w-6" />
        </button>
      );
    }

    return (
      <div className="relative" ref={serviceMenuRef}>
        <button 
          className="bg-teal-500 hover:bg-teal-600 text-white rounded-full p-4 xl:px-8 xl:py-3.5 w-max xl:w-full font-bold text-lg shadow-lg transition-colors flex justify-center items-center gap-2"
          onClick={() => setShowServiceMenu(!showServiceMenu)}
        >
          <span className="hidden xl:block flex items-center gap-2">
            {t.online}
            <ChevronDown className={`h-5 w-5 transition-transform ${showServiceMenu ? 'rotate-180' : ''}`} />
          </span>
          <Briefcase className="block xl:hidden h-6 w-6" />
        </button>

        {/* Service Menu Dropdown */}
        {showServiceMenu && (
          <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
            <div
              className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
              onClick={handlePublishClick}
            >
              <PlusCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span className="font-bold text-slate-900 dark:text-white">{t.publishService}</span>
            </div>
            <div
              className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors border-t border-slate-100 dark:border-slate-700"
              onClick={handleMyServicesClick}
            >
              <List className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              <span className="font-bold text-slate-900 dark:text-white">{t.myServices}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col h-full justify-between w-full relative">
        <div className="space-y-1 w-full">
          {/* Logo M - Click to refresh home */}
          <div 
            className="flex items-center cursor-pointer p-3 w-min rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-2" 
            onClick={() => setPage('home')}
          >
            <div className="h-8 w-8 text-black dark:text-white">
              {/* Custom M Logo */}
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-8 w-8 fill-current">
                <path d="M4 4h4l4 10 4-10h4v16h-4V11l-4 9-4-9v9H4V4z"/>
              </svg>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
              <motion.div 
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                whileTap={{ scale: 0.92, transition: { type: "spring", stiffness: 400, damping: 14 } }}
                className={`relative flex items-center gap-4 p-3 rounded-full cursor-pointer group w-max xl:w-full ${isActive ? 'font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 bg-teal-50 dark:bg-teal-900/40 rounded-full z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-center">
                  <motion.div
                    animate={{ 
                       scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <item.icon className={`h-7 w-7 ${isActive ? 'stroke-[2.5px] text-teal-600 dark:text-teal-400' : 'stroke-2 text-slate-900 dark:text-slate-300'}`} />
                  </motion.div>
                  {'badge' in item && item.badge !== undefined && (
                    item.badge > 0 ? (
                      renderBadge(item.badge, item.onBadgeClick)
                    ) : (
                      renderDotBadge(item.onBadgeClick)
                    )
                  )}
                </div>
                <span className={`hidden xl:block text-xl mr-4 z-10 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-slate-300'}`}>{item.label}</span>
              </motion.div>
            )})}
            
            {/* More Menu Trigger */}
            <div className="relative">
              <motion.div 
                whileTap={{ scale: 0.92, transition: { type: "spring", stiffness: 400, damping: 14 } }}
                className="flex items-center gap-4 p-3 rounded-full cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group w-max xl:w-full"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                <MoreHorizontal className="h-7 w-7 text-slate-900 dark:text-slate-300" />
                <span className="hidden xl:block text-xl mr-4 text-slate-900 dark:text-slate-300">{t.more}</span>
              </motion.div>

              {/* Dropdown Menu */}
              {showMoreMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                  {role === UserRole.ADMIN && (
                    <div
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                      onClick={() => { setPage('admin'); setShowMoreMenu(false); }}
                    >
                      <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <span className="font-bold text-slate-900 dark:text-white">{t.admin}</span>
                    </div>
                  )}
                  <div
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => { setPage('settings'); setShowMoreMenu(false); }}
                  >
                    <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white">{t.settings}</span>
                  </div>
                  <div
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                    onClick={() => { onInteract('Help Center'); setShowMoreMenu(false); }}
                  >
                    <HelpCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    <span className="font-bold text-slate-900 dark:text-white">{t.help}</span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Main Action Button (Post/Book) */}
          <div className="mt-4">
            {renderEscortActionButton()}
          </div>
        </div>

        {/* User Profile Bubble */}
        <div className="mt-auto">
          {role !== UserRole.GUEST ? (
            <motion.div
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-3 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer w-max xl:w-full transition-colors relative group"
              onClick={() => {
                const confirmLogout = window.confirm(t.logout + '?');
                if (confirmLogout && onLogout) {
                  onLogout();
                } else if (confirmLogout) {
                  setRole(UserRole.GUEST);
                }
              }}
            >
              <img src={user?.profile?.avatarUrl || "https://picsum.photos/100/100?random=50"} className="h-10 w-10 rounded-full bg-slate-200" alt="User" />
              <div className="hidden xl:block flex-1 leading-tight">
                <div className="font-bold text-slate-900 dark:text-white">{user?.profile?.name || (role === UserRole.PATIENT ? 'User_9527' : 'Escort Wang')}</div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">@{user?.email?.split('@')[0] || (role === UserRole.PATIENT ? 'patient' : 'wang_escort')}</div>
              </div>
              <LogOut className="hidden xl:block h-5 w-5 text-slate-400 group-hover:text-red-500" />
            </motion.div>
          ) : (
            <div
              className="flex items-center gap-3 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer w-max xl:w-full transition-colors"
              onClick={() => setPage('login')}
            >
              <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div className="hidden xl:block flex-1">
                <div className="font-bold text-slate-900 dark:text-white">{t.guest}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Service Publish Modal */}
      {showPublishModal && role === UserRole.ESCORT && (
        <ServicePublishModal
          lang={lang}
          onClose={() => setShowPublishModal(false)}
          onSuccess={handlePublishSuccess}
        />
      )}
    </>
  );
};
