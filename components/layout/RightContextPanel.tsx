import React from 'react';
import {
  ArrowRight,
  Bot,
  CalendarClock,
  Hospital as HospitalIcon,
  MessageSquareMore,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { EscortProfile, Hospital, Language, UserInfo } from '../../types';
import { SearchBar } from '../SearchBar';
import { Badge, PrimaryButton, SectionHeader, SurfaceCard } from '../ui';

interface RightContextPanelProps {
  lang: Language;
  user: UserInfo | null;
  popularHospitals: Hospital[];
  popularEscorts: EscortProfile[];
  onSearch: (query: string, type: 'hospital' | 'escort' | 'all' | 'web') => void;
  onStartConversation: (escortId: string) => void;
  onOpenServiceSheet: () => void;
  onOpenAI: () => void;
  onNavigate: (path: string) => void;
}

const copy = {
  zh: {
    panelTitle: '今日协同',
    panelCaption: '把搜索、咨询和下单放进同一条更顺滑的操作路径里。',
    quickActions: '高频操作',
    hospitals: '热门医院',
    escorts: '推荐陪诊师',
    services: '发起服务',
    assistant: 'AI 助理',
    orders: '订单总览',
    coordination: '协调面板',
    verified: '已认证',
    book: '联系',
    loadMore: '查看更多',
  },
  en: {
    panelTitle: 'Today’s coordination',
    panelCaption: 'Keep search, messaging, and order creation inside one smoother flow.',
    quickActions: 'Frequent actions',
    hospitals: 'Popular hospitals',
    escorts: 'Recommended escorts',
    services: 'Start service',
    assistant: 'AI assistant',
    orders: 'Order overview',
    coordination: 'Coordination panel',
    verified: 'Verified',
    book: 'Contact',
    loadMore: 'See more',
  },
} as const;

export const RightContextPanel: React.FC<RightContextPanelProps> = ({
  lang,
  user,
  popularHospitals,
  popularEscorts,
  onSearch,
  onStartConversation,
  onOpenServiceSheet,
  onOpenAI,
  onNavigate,
}) => {
  const t = copy[lang];

  const fallbackHospitals =
    popularHospitals.length > 0
      ? popularHospitals
      : [
          {
            id: 'fallback-hospital-1',
            name: lang === 'zh' ? '北京协和医院' : 'PUMCH',
            department: lang === 'zh' ? '综合医院' : 'General',
            level: lang === 'zh' ? '三甲' : 'Tier 3A',
            address: '',
            rating: 4.9,
          },
          {
            id: 'fallback-hospital-2',
            name: lang === 'zh' ? '华山医院' : 'Huashan Hospital',
            department: lang === 'zh' ? '神经外科' : 'Neurology',
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
            id: 'fallback-escort-1',
            name: lang === 'zh' ? '王淑芬' : 'Shufen Wang',
            rating: 4.9,
            completedOrders: 236,
            isVerified: true,
            specialties: [lang === 'zh' ? '门诊陪同' : 'Outpatient'],
            avatarUrl: 'https://picsum.photos/80/80?random=331',
          },
          {
            id: 'fallback-escort-2',
            name: lang === 'zh' ? '张伟' : 'Wei Zhang',
            rating: 4.8,
            completedOrders: 182,
            isVerified: true,
            specialties: [lang === 'zh' ? '报告取送' : 'Reports'],
            avatarUrl: 'https://picsum.photos/80/80?random=332',
          },
        ];

  return (
    <div className="space-y-4">
      <SurfaceCard className="app-panel-section overflow-hidden p-5">
        <Badge variant="accent">{t.coordination}</Badge>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{t.panelTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.panelCaption}</p>

        <div className="mt-5">
          <SearchBar
            lang={lang}
            onSearch={onSearch}
            placeholder={lang === 'zh' ? '搜索医院、陪诊师、科室' : 'Search hospitals, escorts, departments'}
          />
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={onOpenServiceSheet}
            className="context-list-item rounded-[22px] border border-slate-200/80 bg-white/80 text-left shadow-sm"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-teal-50 text-teal-700">
                <CalendarClock className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950 dark:text-white">{t.services}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'zh' ? '先选服务，再进入匹配流程' : 'Choose a service and continue to matching'}
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onOpenAI}
            className="context-list-item rounded-[22px] border border-slate-200/80 bg-white/80 text-left shadow-sm"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-950 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950 dark:text-white">{t.assistant}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'zh' ? '询问挂号、流程或费用问题' : 'Ask about clinics, flows, or pricing'}
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/orders')}
            className="context-list-item rounded-[22px] border border-slate-200/80 bg-white/80 text-left shadow-sm"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Sparkles className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950 dark:text-white">{t.orders}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {user
                    ? lang === 'zh'
                      ? '统一查看状态、支付和提醒'
                      : 'See status, payments, and reminders'
                    : lang === 'zh'
                    ? '登录后查看完整订单流转'
                    : 'Sign in to view full order flow'}
                </span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="app-panel-section overflow-hidden p-5">
        <SectionHeader
          kicker={t.quickActions}
          title={t.hospitals}
          description={lang === 'zh' ? '更常被搜索的就医机构。' : 'Most frequently searched care destinations.'}
        />

        <div className="mt-4 space-y-2">
          {fallbackHospitals.slice(0, 4).map((hospital, index) => (
            <button
              key={hospital.id}
              type="button"
              onClick={() => onSearch(hospital.name, 'hospital')}
              className="context-list-item w-full rounded-[20px] bg-white/80 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <HospitalIcon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-950 dark:text-white">
                    {index + 1}. {hospital.name}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {hospital.level} · {hospital.department} · {hospital.rating?.toFixed(1) ?? '4.8'}
                  </span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="app-panel-section overflow-hidden p-5">
        <SectionHeader
          kicker={t.quickActions}
          title={t.escorts}
          description={
            lang === 'zh'
              ? '可信任、响应更及时的陪诊服务者。'
              : 'Trusted escorts with faster response and strong service records.'
          }
        />

        <div className="mt-4 space-y-3">
          {fallbackEscorts.slice(0, 3).map((escort) => (
            <div key={escort.id} className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <img
                  src={escort.avatarUrl || `https://picsum.photos/80/80?random=${escort.id}`}
                  alt={escort.name || 'Escort'}
                  className="h-12 w-12 rounded-[18px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">{escort.name}</span>
                    {escort.isVerified ? <Badge variant="success">{t.verified}</Badge> : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>{escort.rating?.toFixed(1) ?? '4.8'}</span>
                    <span>·</span>
                    <span>{escort.completedOrders ?? 0}</span>
                    <span>{lang === 'zh' ? '单' : 'orders'}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <PrimaryButton
                      variant="secondary"
                      icon={MessageSquareMore}
                      onClick={() => onStartConversation(escort.id)}
                      className="px-3 py-2 text-xs"
                    >
                      {t.book}
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => onSearch(escort.name || '', 'escort')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 transition hover:text-teal-600"
                    >
                      <Shield className="h-3.5 w-3.5" />
                      {t.loadMore}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
};
