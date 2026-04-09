import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { 
  ArrowLeft, Globe, Check, Bell, Tag, MessageSquare, Settings as SettingsIcon, 
  Loader2, CheckCircle, Moon, Sun, Server, Trash, Monitor, ChevronRight
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useTheme } from '../contexts/ThemeContext';

interface NotificationSettings {
  orderNotifications: boolean;
  messageNotifications: boolean;
  systemNotifications: boolean;
  promotionalNotifications: boolean;
}

interface SettingsProps {
  currentLang: Language;
  setLang: (lang: Language) => void;
  onBack: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ currentLang, setLang, onBack }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    orderNotifications: true,
    messageNotifications: true,
    systemNotifications: true,
    promotionalNotifications: false
  });
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'language' | 'notifications' | 'display' | 'cache'>('language');
  const [clearingCache, setClearingCache] = useState(false);
  const [showClearSuccess, setShowClearSuccess] = useState(false);
  const [cacheSize, setCacheSize] = useState(0);

  const texts = {
    zh: {
      title: '设置',
      accessibility: '辅助功能、显示与语言',
      languages: '语言',
      displayLang: '显示语言',
      chinese: '简体中文',
      english: 'English',
      notifications: '通知设置',
      notificationPrefs: '通知偏好',
      orderNotifications: '订单通知',
      orderNotificationsDesc: '接收订单状态更新和提醒',
      messageNotifications: '消息通知',
      messageNotificationsDesc: '接收新消息提醒',
      systemNotifications: '系统通知',
      systemNotificationsDesc: '接收系统公告和重要通知',
      promotionalNotifications: '促销活动通知',
      promotionalNotificationsDesc: '接收优惠活动和促销信息',
      save: '保存设置',
      saving: '保存中...',
      saved: '设置已保存',
      on: '开启',
      off: '关闭',
      display: '显示设置',
      darkMode: '主题模式',
      darkModeDesc: '选择适合您的界面主题',
      light: '浅色',
      dark: '深色',
      system: '跟随系统',
      cache: '缓存管理',
      cacheManagement: '缓存管理',
      clearCache: '清除缓存',
      clearCacheDesc: '清理临时数据和缓存文件，保留登录状态和主题设置',
      clearing: '清理中...',
      cleared: '缓存已清理',
      currentCache: '当前缓存大小',
      storage: '存储'
    },
    en: {
      title: 'Settings',
      accessibility: 'Accessibility, display and languages',
      languages: 'Languages',
      displayLang: 'Display Language',
      chinese: 'Simplified Chinese',
      english: 'English',
      notifications: 'Notifications',
      notificationPrefs: 'Notification Preferences',
      orderNotifications: 'Order Notifications',
      orderNotificationsDesc: 'Receive order status updates and reminders',
      messageNotifications: 'Message Notifications',
      messageNotificationsDesc: 'Receive new message alerts',
      systemNotifications: 'System Notifications',
      systemNotificationsDesc: 'Receive system announcements and important notices',
      promotionalNotifications: 'Promotional Notifications',
      promotionalNotificationsDesc: 'Receive special offers and promotional information',
      save: 'Save Settings',
      saving: 'Saving...',
      saved: 'Settings Saved',
      on: 'On',
      off: 'Off',
      display: 'Display',
      darkMode: 'Theme',
      darkModeDesc: 'Choose your preferred theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
      cache: 'Cache',
      cacheManagement: 'Cache Management',
      clearCache: 'Clear Cache',
      clearCacheDesc: 'Clear temporary data and cache files, keep login status and theme settings',
      clearing: 'Clearing...',
      cleared: 'Cache Cleared',
      currentCache: 'Current Cache Size',
      storage: 'Storage'
    }
  };

  const t = texts[currentLang];

  useEffect(() => {
    const savedSettings = localStorage.getItem('notification_settings');
    if (savedSettings) {
      try {
        setNotificationSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse saved notification settings:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'cache') {
      calculateCacheSize();
    }
  }, [activeSection]);

  const calculateCacheSize = () => {
    let totalSize = 0;
    const cacheKeys = [
      'recent_searches',
      'recent_products',
      'recent_medicines',
      'search_history',
      'product_cache',
      'temp_data',
      'temp_files',
      'viewed_products',
      'viewed_medicines'
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && cacheKeys.some(cacheKey => key.includes(cacheKey))) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2;
        }
      }
    }
    setCacheSize(totalSize);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleClearCache = async () => {
    setClearingCache(true);

    const preservedKeys = [
      'auth_token',
      'user_info',
      'userId',
      'notification_settings',
      'theme',
      'language',
      'currentLang',
      'lastLogin'
    ];

    const cacheKeys = [
      'recent_searches',
      'recent_products',
      'recent_medicines',
      'search_history',
      'product_cache',
      'temp_data',
      'temp_files',
      'viewed_products',
      'viewed_medicines'
    ];

    await new Promise(resolve => setTimeout(resolve, 1000));

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const shouldPreserve = preservedKeys.some(preservedKey =>
          key === preservedKey || key.startsWith(preservedKey)
        );
        const shouldClear = cacheKeys.some(cacheKey =>
          key.includes(cacheKey)
        );

        if (!shouldPreserve && shouldClear) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });

    setCacheSize(0);
    setClearingCache(false);
    setShowClearSuccess(true);
    setTimeout(() => setShowClearSuccess(false), 3000);
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.updateNotificationSettings(notificationSettings);
      localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-24 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* iOS-Style Glass Header */}
      <div className="sticky top-0 z-40 bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800 px-4 h-14 flex items-center justify-between transition-colors duration-300">
        <button 
          onClick={onBack}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
        >
          <ArrowLeft className="h-6 w-6 text-slate-700 dark:text-slate-300" />
        </button>
        <h1 className="text-[17px] font-semibold text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2 tracking-tight">
          {t.title}
        </h1>
        <div className="w-9" />
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        
        {/* Segmented Control Navigation */}
        <div className="bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-2xl flex items-center shadow-inner overflow-x-auto hide-scrollbar whitespace-nowrap">
          {[
            { id: 'language', icon: Globe, label: t.languages },
            { id: 'notifications', icon: Bell, label: t.notifications },
            { id: 'display', icon: Monitor, label: t.display },
            { id: 'cache', icon: Server, label: t.cache }
          ].map((tab) => {
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex-1 relative py-2.5 px-3 rounded-[12px] text-xs sm:text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 min-w-[70px] ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm scale-100'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 scale-95'
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? '' : 'opacity-80'}`} />
                <span className="hidden xs:inline-block">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Section Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out">
          
          {/* Language Component */}
          {activeSection === 'language' && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4 mb-1">{t.displayLang}</h2>
              <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  onClick={() => setLang('zh')}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                      <span className="font-bold text-xs uppercase">ZH</span>
                    </div>
                    <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.chinese}</span>
                  </div>
                  {currentLang === 'zh' ? <Check className="h-5 w-5 text-teal-500" /> : <div className="w-5" />}
                </div>
                
                <div className="h-[1px] bg-slate-100 dark:bg-slate-700/50 ml-14"></div>
                
                <div
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors active:bg-slate-100 dark:active:bg-slate-700"
                  onClick={() => setLang('en')}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                      <span className="font-bold text-xs uppercase">EN</span>
                    </div>
                    <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.english}</span>
                  </div>
                  {currentLang === 'en' ? <Check className="h-5 w-5 text-teal-500" /> : <div className="w-5" />}
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 ml-4 pt-1 opacity-80">
                Manage which languages are used to personalize your MediMate experience.
              </p>
            </div>
          )}

          {/* Display Component */}
          {activeSection === 'display' && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4 mb-1">{t.darkMode}</h2>
              <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                <div className="p-4 grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 active:scale-95 ${
                      themeMode === 'light' 
                      ? 'bg-teal-50/70 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-700 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-700/30 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Sun className={`h-7 w-7 mb-2.5 transition-colors ${themeMode === 'light' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className={`text-[13px] font-medium transition-colors ${themeMode === 'light' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>{t.light}</span>
                  </button>

                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 active:scale-95 ${
                      themeMode === 'dark' 
                      ? 'bg-teal-50/70 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-700 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-700/30 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Moon className={`h-7 w-7 mb-2.5 transition-colors ${themeMode === 'dark' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className={`text-[13px] font-medium transition-colors ${themeMode === 'dark' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>{t.dark}</span>
                  </button>

                  <button
                    onClick={() => setThemeMode('system')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300 active:scale-95 ${
                      themeMode === 'system' 
                      ? 'bg-teal-50/70 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-700 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-700/30 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Monitor className={`h-7 w-7 mb-2.5 transition-colors ${themeMode === 'system' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className={`text-[13px] font-medium transition-colors ${themeMode === 'system' ? 'text-teal-700 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>{t.system}</span>
                  </button>
                </div>
              </div>
              {themeMode === 'system' && (
                <p className="text-xs text-slate-500 dark:text-slate-400 ml-4 pt-1 opacity-80">
                  {currentLang === 'zh' ? `当前跟随系统: ${theme === 'dark' ? '深色' : '浅色'}` : `Following system: ${theme === 'dark' ? 'Dark' : 'Light'}`}
                </p>
              )}
            </div>
          )}

          {/* Notifications Component */}
          {activeSection === 'notifications' && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4 mb-1">{t.notificationPrefs}</h2>
              <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                <div className="flex flex-col">
                  
                  {/* Item 1 */}
                  <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3.5 flex-1 pr-4">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <Tag className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.orderNotifications}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-1">{t.orderNotificationsDesc}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('orderNotifications')}
                      className={`relative inline-flex h-[28px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        notificationSettings.orderNotifications ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          notificationSettings.orderNotifications ? 'translate-x-[24px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                  </div>
                  
                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700/50 ml-[64px]"></div>

                  {/* Item 2 */}
                  <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3.5 flex-1 pr-4">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.messageNotifications}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-1">{t.messageNotificationsDesc}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('messageNotifications')}
                      className={`relative inline-flex h-[28px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        notificationSettings.messageNotifications ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          notificationSettings.messageNotifications ? 'translate-x-[24px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700/50 ml-[64px]"></div>

                  {/* Item 3 */}
                  <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3.5 flex-1 pr-4">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-sky-50 dark:bg-sky-500/10 text-sky-500 dark:text-sky-400 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.systemNotifications}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-1">{t.systemNotificationsDesc}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('systemNotifications')}
                      className={`relative inline-flex h-[28px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        notificationSettings.systemNotifications ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          notificationSettings.systemNotifications ? 'translate-x-[24px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700/50 ml-[64px]"></div>

                  {/* Item 4 */}
                  <div className="p-4 flex items-center justify-between active:bg-slate-50 dark:active:bg-slate-700/50 transition-colors">
                    <div className="flex items-center gap-3.5 flex-1 pr-4">
                      <div className="w-[34px] h-[34px] rounded-[10px] bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Tag className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[16px] leading-tight text-slate-800 dark:text-slate-200">{t.promotionalNotifications}</span>
                        <span className="text-[12px] text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-1">{t.promotionalNotificationsDesc}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle('promotionalNotifications')}
                      className={`relative inline-flex h-[28px] w-[50px] shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none ${
                        notificationSettings.promotionalNotifications ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${
                          notificationSettings.promotionalNotifications ? 'translate-x-[24px]' : 'translate-x-[2px]'
                        }`}
                      />
                    </button>
                  </div>

                </div>
              </div>

              {/* Enhanced Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-8 relative w-full overflow-hidden group bg-teal-500 hover:bg-teal-600 disabled:bg-teal-400 disabled:opacity-70 text-white font-medium py-3.5 px-6 rounded-[16px] transition-all duration-300 shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/40 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <div className="relative flex items-center gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      <span className="text-[16px]">{t.saving}</span>
                    </>
                  ) : showSuccess ? (
                    <>
                      <CheckCircle className="h-[18px] w-[18px] animate-bounce-slight" />
                      <span className="text-[16px] font-semibold">{t.saved}</span>
                    </>
                  ) : (
                    <span className="text-[16px] font-semibold tracking-wide">{t.save}</span>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Cache Component */}
          {activeSection === 'cache' && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-4 mb-1">{t.storage}</h2>
              <div className="bg-white dark:bg-slate-800 rounded-[20px] shadow-sm border border-slate-200/60 dark:border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">{t.currentCache}</p>
                    <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                      {formatBytes(cacheSize)}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-teal-50/70 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-800/50 flex items-center justify-center">
                    <Server className="h-7 w-7 text-teal-500" />
                  </div>
                </div>

                <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6 leading-relaxed opacity-90">
                  {t.clearCacheDesc}
                </p>

                <button
                  onClick={handleClearCache}
                  disabled={clearingCache || cacheSize === 0}
                  className="w-full bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:text-slate-400 dark:disabled:text-slate-500 text-rose-500 dark:text-rose-400 font-semibold py-3.5 rounded-[14px] transition-all duration-300 flex items-center justify-center gap-2 border border-rose-100 dark:border-rose-900/30 disabled:border-transparent active:scale-[0.98]"
                >
                  {clearingCache ? (
                    <>
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                      <span className="text-[15px]">{t.clearing}</span>
                    </>
                  ) : showClearSuccess ? (
                    <>
                      <CheckCircle className="h-[18px] w-[18px] text-emerald-500" />
                      <span className="text-[15px] text-emerald-500">{t.cleared}</span>
                    </>
                  ) : (
                    <>
                      <Trash className="h-[18px] w-[18px]" />
                      <span className="text-[15px]">{t.clearCache}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};
