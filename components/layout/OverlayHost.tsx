import React from 'react';
import { Bot, CalendarClock, Globe2, LogOut, Sparkles, X } from 'lucide-react';
import { Language, PageType, UserInfo, UserRole } from '../../types';
import { Login } from '../Login';
import { Register } from '../Register';
import { AIChatOverlay } from '../AIChatOverlay';
import { SheetModal } from '../ui';
import { buildNavigationItems } from './navConfig';

type ServiceTypeKey = 'FULL_PROCESS' | 'APPOINTMENT' | 'REPORT_PICKUP' | 'VIP_TRANSPORT';

interface OverlayHostProps {
  lang: Language;
  authView: 'login' | 'register' | null;
  role: UserRole;
  user: UserInfo | null;
  currentPage: PageType;
  mobileMenuOpen: boolean;
  showServiceSheet: boolean;
  showAIChat: boolean;
  unreadCount?: number;
  onCloseAuth: () => void;
  onAuthSuccess: (role: UserRole) => void;
  onOpenLogin: () => void;
  onNavigate: (path: string) => void;
  onCloseMobileMenu: () => void;
  onToggleLanguage: () => void;
  onLogout: () => void;
  onCloseServiceSheet: () => void;
  onSelectServiceType: (type: ServiceTypeKey) => void;
  onOpenAI: () => void;
  onCloseAI: () => void;
}

const copy = {
  zh: {
    title: '选择服务类型',
    description: '先确定本次需要的服务，我们会把你带到更顺滑的匹配流程中。',
    services: [
      { type: 'FULL_PROCESS', title: '全程陪诊', description: '从挂号、候诊到取药的完整陪同', accent: 'bg-teal-50 text-teal-700' },
      { type: 'APPOINTMENT', title: '代约挂号', description: '协助抢号、提醒与预约管理', accent: 'bg-sky-50 text-sky-700' },
      { type: 'REPORT_PICKUP', title: '代取报告', description: '代领报告并支持结果解读', accent: 'bg-amber-50 text-amber-700' },
      { type: 'VIP_TRANSPORT', title: '专车接送', description: '为行动不便或异地就医准备的接送服务', accent: 'bg-violet-50 text-violet-700' },
    ],
    language: '切换语言',
    assistant: '打开 AI 助理',
    signOut: '退出登录',
    login: '登录账户',
  },
  en: {
    title: 'Choose a service',
    description: 'Pick the request type first and we will guide you into a smoother matching flow.',
    services: [
      { type: 'FULL_PROCESS', title: 'Full escort', description: 'Support from registration through medication pickup', accent: 'bg-teal-50 text-teal-700' },
      { type: 'APPOINTMENT', title: 'Appointment booking', description: 'Booking help, reminders, and schedule handling', accent: 'bg-sky-50 text-sky-700' },
      { type: 'REPORT_PICKUP', title: 'Report pickup', description: 'Collect reports and help interpret results', accent: 'bg-amber-50 text-amber-700' },
      { type: 'VIP_TRANSPORT', title: 'Transport service', description: 'Private transport support for important visits', accent: 'bg-violet-50 text-violet-700' },
    ],
    language: 'Switch language',
    assistant: 'Open AI assistant',
    signOut: 'Sign out',
    login: 'Sign in',
  },
} as const;

export const OverlayHost: React.FC<OverlayHostProps> = ({
  lang,
  authView,
  role,
  user,
  currentPage,
  mobileMenuOpen,
  showServiceSheet,
  showAIChat,
  unreadCount = 0,
  onCloseAuth,
  onAuthSuccess,
  onOpenLogin,
  onNavigate,
  onCloseMobileMenu,
  onToggleLanguage,
  onLogout,
  onCloseServiceSheet,
  onSelectServiceType,
  onOpenAI,
  onCloseAI,
}) => {
  const t = copy[lang];
  const navigationItems = buildNavigationItems(lang);
  const initials = user?.profile?.name?.slice(0, 1) || user?.email?.slice(0, 1) || 'M';

  return (
    <>
      {authView === 'login' ? (
        <Login
          setRole={onAuthSuccess}
          onClose={onCloseAuth}
          onSwitchToRegister={() => onNavigate('/register')}
          lang={lang}
        />
      ) : null}

      {authView === 'register' ? (
        <Register
          onClose={onCloseAuth}
          onSwitchToLogin={() => onNavigate('/login')}
          lang={lang}
        />
      ) : null}

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={onCloseMobileMenu}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-lg"
          />

          <div className="absolute left-0 top-0 bottom-0 flex w-[88vw] max-w-[360px] flex-col border-r border-white/60 bg-white/92 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/92">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold text-white shadow-lg">
                  {initials.toUpperCase()}
                </div>
                <div>
                  <div className="text-base font-semibold text-slate-950 dark:text-white">
                    {user?.profile?.name || user?.email?.split('@')[0] || 'MediMate'}
                  </div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {role === UserRole.GUEST ? 'Guest' : 'Workspace'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onCloseMobileMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.pageType === currentPage;
                const badgeCount = item.pageType === 'messages' ? unreadCount : 0;

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      onNavigate(item.path);
                      onCloseMobileMenu();
                    }}
                    className={`app-nav-item w-full justify-between text-left ${isActive ? 'app-nav-item--active' : ''}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-sm font-semibold">{item.label}</span>
                    </span>
                    {badgeCount > 0 ? (
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-semibold text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto space-y-3">
              <button
                type="button"
                onClick={() => {
                  onOpenAI();
                  onCloseMobileMenu();
                }}
                className="app-nav-item w-full justify-between text-left"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.assistant}</span>
                </span>
              </button>

              <button type="button" onClick={onToggleLanguage} className="app-nav-item w-full justify-between text-left">
                <span className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Globe2 className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.language}</span>
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{lang}</span>
              </button>

              {role === UserRole.GUEST ? (
                <button
                  type="button"
                  onClick={() => {
                    onOpenLogin();
                    onCloseMobileMenu();
                  }}
                  className="app-nav-item w-full justify-between text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-teal-50 text-teal-700">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.login}</span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onCloseMobileMenu();
                  }}
                  className="app-nav-item w-full justify-between text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-rose-50 text-rose-500">
                      <LogOut className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.signOut}</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <SheetModal
        open={showServiceSheet}
        onClose={onCloseServiceSheet}
        title={t.title}
        description={t.description}
        side="bottom"
        maxWidthClassName="max-w-2xl"
      >
        <div className="grid gap-3">
          {t.services.map((service) => (
            <button
              key={service.type}
              type="button"
              onClick={() => onSelectServiceType(service.type as ServiceTypeKey)}
              className="flex items-start gap-4 rounded-[24px] border border-slate-200/80 bg-white/90 px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
            >
              <span className={`inline-flex h-11 min-w-11 items-center justify-center rounded-[18px] ${service.accent}`}>
                <CalendarClock className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-950 dark:text-white">{service.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400">{service.description}</span>
              </span>
            </button>
          ))}
        </div>
      </SheetModal>

      <AIChatOverlay isOpen={showAIChat} onClose={onCloseAI} lang={lang} />
    </>
  );
};
