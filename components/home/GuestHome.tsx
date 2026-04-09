import React, { Suspense } from 'react';
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Compass,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TimerReset,
} from 'lucide-react';
import { EscortProfile, Hospital, Language, UserInfo, UserRole } from '../../types';
import { SearchBar } from '../SearchBar';
import { Badge, PrimaryButton, SectionHeader, SurfaceCard } from '../ui';

interface GuestHomeProps {
  lang: Language;
  role: UserRole;
  user: UserInfo | null;
  popularHospitals: Hospital[];
  popularEscorts: EscortProfile[];
  onSearch: (query: string, type: 'hospital' | 'escort' | 'all') => void;
  onNavigate: (path: string) => void;
  onOpenServiceSheet: () => void;
  onOpenAI: () => void;
  onStartConversation: (escortId: string) => void;
  onOpenLogin: () => void;
  patientDashboard?: React.ReactNode;
  escortDashboard?: React.ReactNode;
  adminDashboard?: React.ReactNode;
}

const copy = {
  zh: {
    heroTitle: '把就医协同做得更安静，也更高效。',
    heroDescription: '以更柔和的界面组织搜索、咨询、下单和追踪，让每一步都更好理解，也更容易继续。',
    searchPlaceholder: '搜索医院、科室、陪诊服务',
    primary: '开始服务',
    secondary: '打开 AI 助理',
    trust: 'Care orchestration',
    quickSection: '高频入口',
    pathwaySection: '服务节奏',
    trendingSection: '热门目的地',
    escortSection: '值得信任的陪诊师',
    openLogin: '登录继续',
    orders: '查看订单',
    speakNow: '立即咨询',
    connect: '联系',
    signInHint: '登录后可以直接保存资料、查看订单和发起匹配。',
    serviceCards: [
      { title: '快速挂号协同', description: '预约、候诊与提醒更集中地放在一起。', icon: CalendarClock },
      { title: '报告与取药跟进', description: '把代取报告和代办事项压缩进同一流程。', icon: TimerReset },
      { title: '跨院转诊支持', description: '提前整理路线、材料和咨询窗口。', icon: Compass },
    ],
    pathwayCards: [
      { title: '搜索与判断', description: '从医院、科室和陪诊师中快速建立第一步判断。', icon: Stethoscope },
      { title: '确认服务类型', description: '用更少的选择完成服务意图的确认。', icon: ShieldCheck },
      { title: '持续跟踪', description: '在订单、消息和提醒中保持连续感。', icon: HeartHandshake },
    ],
  },
  en: {
    heroTitle: 'Make care coordination calmer and easier to act on.',
    heroDescription: 'A gentler workspace for search, consultation, booking, and follow-up so every next step feels more obvious.',
    searchPlaceholder: 'Search hospitals, departments, and escort services',
    primary: 'Start a service',
    secondary: 'Open AI assistant',
    trust: 'Care orchestration',
    quickSection: 'Fast entry points',
    pathwaySection: 'Flow rhythm',
    trendingSection: 'Popular destinations',
    escortSection: 'Trusted escorts',
    openLogin: 'Sign in',
    orders: 'View orders',
    speakNow: 'Ask now',
    connect: 'Contact',
    signInHint: 'Sign in to save your profile, track orders, and move faster.',
    serviceCards: [
      { title: 'Booking coordination', description: 'Keep scheduling, reminders, and prep work in one place.', icon: CalendarClock },
      { title: 'Reports and medication', description: 'Combine pickups and next-step follow-up in a single path.', icon: TimerReset },
      { title: 'Cross-hospital support', description: 'Organize travel, materials, and service windows before you go.', icon: Compass },
    ],
    pathwayCards: [
      { title: 'Search and decide', description: 'Start with hospitals, departments, and escort profiles in one pass.', icon: Stethoscope },
      { title: 'Confirm service type', description: 'Choose the request type with less visual noise.', icon: ShieldCheck },
      { title: 'Stay in motion', description: 'Keep messages, reminders, and orders connected.', icon: HeartHandshake },
    ],
  },
} as const;

export const GuestHome: React.FC<GuestHomeProps> = ({
  lang,
  role,
  user,
  popularHospitals,
  popularEscorts,
  onSearch,
  onNavigate,
  onOpenServiceSheet,
  onOpenAI,
  onStartConversation,
  onOpenLogin,
  patientDashboard,
  escortDashboard,
  adminDashboard,
}) => {
  const t = copy[lang];

  if (role === UserRole.PATIENT && patientDashboard) {
    return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>{patientDashboard}</Suspense>;
  }

  if (role === UserRole.ESCORT && escortDashboard) {
    return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>{escortDashboard}</Suspense>;
  }

  if (role === UserRole.ADMIN && adminDashboard) {
    return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading...</div>}>{adminDashboard}</Suspense>;
  }

  const fallbackHospitals =
    popularHospitals.length > 0
      ? popularHospitals
      : [
          {
            id: 'home-hospital-1',
            name: lang === 'zh' ? '北京协和医院' : 'PUMCH',
            department: lang === 'zh' ? '综合医院' : 'General',
            level: lang === 'zh' ? '三甲' : 'Tier 3A',
            address: '',
            rating: 4.9,
          },
          {
            id: 'home-hospital-2',
            name: lang === 'zh' ? '华山医院' : 'Huashan Hospital',
            department: lang === 'zh' ? '神经外科' : 'Neurology',
            level: lang === 'zh' ? '三甲' : 'Tier 3A',
            address: '',
            rating: 4.8,
          },
          {
            id: 'home-hospital-3',
            name: lang === 'zh' ? '中山一院' : 'First Affiliated Hospital',
            department: lang === 'zh' ? '心内科' : 'Cardiology',
            level: lang === 'zh' ? '三甲' : 'Tier 3A',
            address: '',
            rating: 4.8,
          },
        ];

  const fallbackEscorts =
    popularEscorts.length > 0
      ? popularEscorts
      : [
          {
            id: 'home-escort-1',
            name: lang === 'zh' ? '王淑芬' : 'Shufen Wang',
            rating: 4.9,
            completedOrders: 236,
            isVerified: true,
            specialties: [lang === 'zh' ? '全程陪诊' : 'Full escort'],
            avatarUrl: 'https://picsum.photos/120/120?random=421',
          },
          {
            id: 'home-escort-2',
            name: lang === 'zh' ? '陈琳' : 'Lin Chen',
            rating: 4.8,
            completedOrders: 168,
            isVerified: true,
            specialties: [lang === 'zh' ? '报告解读' : 'Reports'],
            avatarUrl: 'https://picsum.photos/120/120?random=422',
          },
        ];

  return (
    <div className="space-y-6 p-4 pb-28 md:p-6">
      <SurfaceCard className="overflow-hidden p-6 md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <Badge variant="accent">{t.trust}</Badge>
            <div className="max-w-2xl">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl dark:text-white">
                {t.heroTitle}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500 md:text-base dark:text-slate-400">
                {t.heroDescription}
              </p>
            </div>

            <div className="max-w-xl">
              <SearchBar lang={lang} onSearch={onSearch} placeholder={t.searchPlaceholder} />
            </div>

            <div className="flex flex-wrap gap-3">
              <PrimaryButton icon={CalendarClock} onClick={onOpenServiceSheet}>
                {t.primary}
              </PrimaryButton>
              <PrimaryButton variant="secondary" icon={Bot} onClick={onOpenAI}>
                {t.secondary}
              </PrimaryButton>
              {user ? (
                <PrimaryButton variant="ghost" icon={Sparkles} onClick={() => onNavigate('/orders')}>
                  {t.orders}
                </PrimaryButton>
              ) : (
                <PrimaryButton variant="ghost" icon={ArrowRight} onClick={onOpenLogin}>
                  {t.openLogin}
                </PrimaryButton>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {t.serviceCards.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white shadow-sm">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="overflow-hidden p-6">
          <SectionHeader kicker={t.quickSection} title={t.pathwaySection} description={t.signInHint} />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {t.pathwayCards.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={
                  index === 1
                    ? onOpenServiceSheet
                    : index === 2
                    ? () => onNavigate('/notifications')
                    : () => onNavigate('/explore')
                }
                className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-teal-50 text-teal-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{item.description}</p>
              </button>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden p-6">
          <SectionHeader
            kicker={t.quickSection}
            title={t.escortSection}
            description={
              lang === 'zh'
                ? '精选响应速度快、评价稳定的服务者。'
                : 'Curated escorts with steady ratings and quick responses.'
            }
          />

          <div className="mt-5 space-y-3">
            {fallbackEscorts.slice(0, 2).map((escort) => (
              <div key={escort.id} className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-start gap-3">
                  <img
                    src={escort.avatarUrl || `https://picsum.photos/120/120?random=${escort.id}`}
                    alt={escort.name || 'Escort'}
                    className="h-14 w-14 rounded-[18px] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">{escort.name}</span>
                      {escort.isVerified ? <Badge variant="success">verified</Badge> : null}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {escort.rating?.toFixed(1)} · {escort.completedOrders ?? 0} {lang === 'zh' ? '单服务' : 'services'}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <PrimaryButton variant="secondary" onClick={() => onStartConversation(escort.id)} className="px-3 py-2 text-xs">
                        {t.connect}
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={onOpenAI}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-600"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        {t.speakNow}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="overflow-hidden p-6">
        <SectionHeader
          kicker={t.quickSection}
          title={t.trendingSection}
          description={
            lang === 'zh'
              ? '把高频就医目的地整理得更紧凑，也更容易比较。'
              : 'A tighter view of high-frequency destinations that are easier to compare.'
          }
        />

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {fallbackHospitals.slice(0, 3).map((hospital, index) => (
            <button
              key={hospital.id}
              type="button"
              onClick={() => onSearch(hospital.name, 'hospital')}
              className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70"
            >
              <div className="flex items-center justify-between">
                <Badge variant="neutral">{index + 1}</Badge>
                <span className="text-xs font-semibold text-teal-700">{hospital.rating?.toFixed(1)}</span>
              </div>
              <h3 className="mt-5 text-base font-semibold text-slate-950 dark:text-white">{hospital.name}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {hospital.level} · {hospital.department}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <ArrowRight className="h-3.5 w-3.5" />
                {lang === 'zh' ? '查看相关服务' : 'View related services'}
              </div>
            </button>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
};
