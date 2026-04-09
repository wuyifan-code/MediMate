import React from 'react';
import { Bot, Globe2, LogOut, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { Language, PageType, UserInfo, UserRole } from '../../types';
import { buildNavigationItems } from './navConfig';
import { Badge, PrimaryButton } from '../ui';

interface DesktopSidebarProps {
  lang: Language;
  currentPage: PageType;
  role: UserRole;
  user: UserInfo | null;
  unreadCount?: number;
  onNavigate: (path: string) => void;
  onOpenAI: () => void;
  onOpenServiceSheet: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onToggleLanguage: () => void;
}

const copy = {
  zh: {
    guest: '访客模式',
    patient: '患者工作台',
    escort: '陪诊工作台',
    admin: '管理控制台',
    subtitle: '更清爽的医疗服务入口',
    login: '登录账户',
    register: '快速开始',
    services: '发起服务',
    assistant: 'AI 协调',
    signOut: '退出登录',
    language: '切换语言',
    trust: 'Trusted Care Workspace',
  },
  en: {
    guest: 'Guest access',
    patient: 'Patient workspace',
    escort: 'Escort workspace',
    admin: 'Admin console',
    subtitle: 'A calmer care coordination hub',
    login: 'Sign in',
    register: 'Get started',
    services: 'Start a request',
    assistant: 'AI copilot',
    signOut: 'Sign out',
    language: 'Switch language',
    trust: 'Trusted Care Workspace',
  },
} as const;

const getRoleLabel = (lang: Language, role: UserRole) => {
  const t = copy[lang];
  if (role === UserRole.PATIENT) return t.patient;
  if (role === UserRole.ESCORT) return t.escort;
  if (role === UserRole.ADMIN) return t.admin;
  return t.guest;
};

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  lang,
  currentPage,
  role,
  user,
  unreadCount = 0,
  onNavigate,
  onOpenAI,
  onOpenServiceSheet,
  onLogout,
  onOpenLogin,
  onToggleLanguage,
}) => {
  const t = copy[lang];
  const navigationItems = buildNavigationItems(lang);
  const initials = user?.profile?.name?.slice(0, 1) || user?.email?.slice(0, 1) || 'M';
  const displayName = user?.profile?.name || user?.email?.split('@')[0] || 'MediMate';

  return (
    <div className="app-sidebar">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-3 rounded-[26px] border border-white/70 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-lg">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950">MediMate</div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{t.trust}</div>
            </div>
          </div>

          <div className="app-user-pill p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-base font-semibold text-white shadow-lg">
                  {initials.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-slate-950 dark:text-white">{displayName}</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{getRoleLabel(lang, role)}</div>
                </div>
              </div>

              <Badge variant={role === UserRole.GUEST ? 'neutral' : 'accent'}>
                {role === UserRole.GUEST ? 'Guest' : 'Live'}
              </Badge>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.subtitle}</p>

            <div className="mt-4 grid gap-3">
              {role === UserRole.GUEST ? (
                <>
                  <PrimaryButton icon={Sparkles} onClick={onOpenLogin} block>
                    {t.login}
                  </PrimaryButton>
                  <PrimaryButton variant="secondary" icon={Plus} onClick={() => onNavigate('/register')} block>
                    {t.register}
                  </PrimaryButton>
                </>
              ) : (
                <>
                  <PrimaryButton icon={Plus} onClick={onOpenServiceSheet} block>
                    {t.services}
                  </PrimaryButton>
                  <PrimaryButton variant="secondary" icon={Bot} onClick={onOpenAI} block>
                    {t.assistant}
                  </PrimaryButton>
                </>
              )}
            </div>
          </div>
        </div>

        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.pageType === currentPage;
            const showBadge = item.pageType === 'messages' || item.pageType === 'notifications';
            const badgeCount =
              item.pageType === 'messages'
                ? unreadCount
                : item.pageType === 'notifications'
                ? Math.min(unreadCount, 9)
                : 0;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => onNavigate(item.path)}
                className={`app-nav-item w-full justify-between text-left ${isActive ? 'app-nav-item--active' : ''}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-[18px] ${
                      isActive
                        ? 'bg-white/80 text-teal-700 shadow-sm'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="truncate text-sm font-semibold">{item.label}</span>
                </span>

                {showBadge && badgeCount > 0 ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 text-xs font-semibold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="space-y-3">
        <button type="button" onClick={onToggleLanguage} className="app-nav-item w-full justify-between text-left">
          <span className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <Globe2 className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t.language}</span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{lang}</span>
        </button>

        {role !== UserRole.GUEST ? (
          <button type="button" onClick={onLogout} className="app-nav-item w-full justify-between text-left">
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-rose-50 text-rose-500">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t.signOut}</span>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
};
