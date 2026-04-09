import { Language, PageType } from '../../types';

export type LayoutVariant = 'shell' | 'immersive' | 'auth';
export type TransitionPreset = 'fade-up' | 'slide-left' | 'slide-right' | 'modal';

export interface RouteMeta {
  key: string;
  pageType: PageType;
  title: string;
  subtitle?: string;
  layoutVariant: LayoutVariant;
  showRightPanel: boolean;
  showBottomDock: boolean;
  immersive: boolean;
  transitionPreset: TransitionPreset;
}

const fallbackTitles = {
  zh: {
    home: '服务工作台',
    explore: '探索服务',
    notifications: '消息中心',
    messages: '咨询消息',
    saved: '我的收藏',
    profile: '个人资料',
    settings: '设置',
    login: '登录',
    register: '注册',
    admin: '管理后台',
    orders: '订单管理',
    'order-confirmation': '确认订单',
    search: '搜索结果',
  },
  en: {
    home: 'Care Workspace',
    explore: 'Explore Services',
    notifications: 'Notification Center',
    messages: 'Messages',
    saved: 'Saved',
    profile: 'Profile',
    settings: 'Settings',
    login: 'Login',
    register: 'Register',
    admin: 'Admin',
    orders: 'Orders',
    'order-confirmation': 'Confirm Order',
    search: 'Search Results',
  },
} as const;

export const routeToPageType = (path: string): PageType => {
  if (path === '/' || path === '/home') return 'home';
  if (path === '/explore') return 'explore';
  if (path === '/notifications') return 'notifications';
  if (path.startsWith('/messages')) return 'messages';
  if (path === '/saved') return 'saved';
  if (path.startsWith('/profile')) return 'profile';
  if (path === '/settings') return 'settings';
  if (path === '/login') return 'login';
  if (path === '/register') return 'register';
  if (path === '/admin') return 'admin';
  if (path.startsWith('/order-confirmation')) return 'order-confirmation';
  if (path === '/orders' || path.startsWith('/orders')) return 'orders';
  return 'home';
};

export const resolveRouteMeta = (path: string, lang: Language, searchMode = false): RouteMeta => {
  const t = fallbackTitles[lang];

  if (searchMode) {
    return {
      key: 'search',
      pageType: 'explore',
      title: t.search,
      subtitle: lang === 'zh' ? '在同一套壳层中查看检索结果。' : 'Browse search results in the same workspace.',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-left',
    };
  }

  const pageType = routeToPageType(path);

  const metaMap: Record<PageType, RouteMeta> = {
    home: {
      key: 'home',
      pageType: 'home',
      title: t.home,
      subtitle: lang === 'zh' ? '更轻盈的医疗陪护入口与工作台。' : 'A lighter workspace for care coordination.',
      layoutVariant: 'shell',
      showRightPanel: true,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'fade-up',
    },
    explore: {
      key: 'explore',
      pageType: 'explore',
      title: t.explore,
      subtitle: lang === 'zh' ? '查找医院、陪诊师和热门服务。' : 'Discover hospitals, escorts, and trending services.',
      layoutVariant: 'shell',
      showRightPanel: true,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-left',
    },
    notifications: {
      key: 'notifications',
      pageType: 'notifications',
      title: t.notifications,
      subtitle: lang === 'zh' ? '订单、支付和提醒统一汇总。' : 'Orders, payments, and reminders in one place.',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-left',
    },
    messages: {
      key: 'messages',
      pageType: 'messages',
      title: t.messages,
      subtitle: lang === 'zh' ? '更顺滑的会话流和消息反馈。' : 'Smoother conversations and messaging flow.',
      layoutVariant: 'immersive',
      showRightPanel: false,
      showBottomDock: true,
      immersive: true,
      transitionPreset: 'slide-left',
    },
    saved: {
      key: 'saved',
      pageType: 'saved',
      title: t.saved,
      subtitle: '',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-left',
    },
    profile: {
      key: 'profile',
      pageType: 'profile',
      title: t.profile,
      subtitle: '',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-right',
    },
    settings: {
      key: 'settings',
      pageType: 'settings',
      title: t.settings,
      subtitle: '',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: false,
      immersive: false,
      transitionPreset: 'slide-right',
    },
    login: {
      key: 'login',
      pageType: 'login',
      title: t.login,
      subtitle: '',
      layoutVariant: 'auth',
      showRightPanel: false,
      showBottomDock: false,
      immersive: true,
      transitionPreset: 'modal',
    },
    register: {
      key: 'register',
      pageType: 'register',
      title: t.register,
      subtitle: '',
      layoutVariant: 'auth',
      showRightPanel: false,
      showBottomDock: false,
      immersive: true,
      transitionPreset: 'modal',
    },
    admin: {
      key: 'admin',
      pageType: 'admin',
      title: t.admin,
      subtitle: '',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: false,
      immersive: false,
      transitionPreset: 'slide-left',
    },
    orders: {
      key: 'orders',
      pageType: 'orders',
      title: t.orders,
      subtitle: '',
      layoutVariant: 'shell',
      showRightPanel: false,
      showBottomDock: true,
      immersive: false,
      transitionPreset: 'slide-left',
    },
    'order-confirmation': {
      key: 'order-confirmation',
      pageType: 'order-confirmation',
      title: t['order-confirmation'],
      subtitle: '',
      layoutVariant: 'immersive',
      showRightPanel: false,
      showBottomDock: false,
      immersive: true,
      transitionPreset: 'slide-left',
    },
  };

  return metaMap[pageType];
};
