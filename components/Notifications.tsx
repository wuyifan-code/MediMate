import React, { useState, useEffect, useRef } from 'react';
import { Language, UserInfo } from '../types';
import { apiService } from '../services/apiService';
import {
  Bell,
  CheckCircle,
  CreditCard,
  MessageCircle,
  Trash2,
  Loader2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  Inbox,
  Filter,
  ChevronRight,
  Package,
  Shield,
  Sparkles,
  Zap
} from 'lucide-react';

interface NotificationsProps {
  lang: Language;
  user?: UserInfo | null;
  onNavigate?: (type: string, id: string) => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  is_read?: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
  created_at?: string;
  priority?: 'high' | 'normal' | 'low';
}

// 通知类型映射
const NOTIFICATION_TYPES = {
  ORDER: 'order',
  ORDER_STATUS: 'order',
  PAYMENT: 'payment',
  MESSAGE: 'message',
  SYSTEM: 'system',
  REVIEW: 'review',
  REFUND: 'refund',
  PROMOTION: 'promotion',
  SECURITY: 'security',
};

// Mock 通知数据
const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-001',
    type: 'ORDER_STATUS',
    title: '订单状态更新',
    content: '您的订单 #ORD20240320001 已完成服务，请对陪诊师进行评价',
    isRead: false,
    priority: 'high',
    data: { orderId: 'order-001', orderNo: 'ORD20240320001' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-002',
    type: 'PAYMENT',
    title: '支付成功',
    content: '您已成功支付订单 #ORD20240318002，金额 ¥280',
    isRead: true,
    priority: 'normal',
    data: { orderId: 'order-002', orderNo: 'ORD20240318002', amount: 280 },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-003',
    type: 'MESSAGE',
    title: '新消息',
    content: '王医生给您发送了一条消息："明天上午9点在医院门口见"',
    isRead: false,
    priority: 'high',
    data: { messageId: 'msg-001', senderId: 'escort-001', senderName: '王医生' },
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-004',
    type: 'PROMOTION',
    title: '限时优惠',
    content: '春季健康季，陪诊服务限时8折优惠，快来预约吧！',
    isRead: false,
    priority: 'low',
    data: { type: 'promotion', code: 'SPRING20' },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-005',
    type: 'SECURITY',
    title: '账号安全提醒',
    content: '您的账号在新设备上登录，如非本人操作请立即修改密码',
    isRead: false,
    priority: 'high',
    data: { type: 'security_alert', device: 'iPhone 15 Pro' },
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-006',
    type: 'REFUND',
    title: '退款申请已通过',
    content: '您的订单 #ORD20240315001 退款申请已通过，款项将原路退回',
    isRead: true,
    priority: 'normal',
    data: { orderId: 'order-003', orderNo: 'ORD20240315001', status: 'APPROVED' },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'notif-007',
    type: 'SYSTEM',
    title: '系统公告',
    content: 'MediMate 医伴平台全新升级，新增在线支付功能，欢迎使用！',
    isRead: true,
    priority: 'low',
    data: { type: 'system_announcement' },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Pull to refresh hook
const usePullToRefresh = (onRefresh: () => Promise<void>) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && window.scrollY === 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  };

  const handleTouchEnd = async () => {
    isDragging.current = false;
    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(0);
      await onRefresh();
      setIsRefreshing(false);
    } else {
      setPullDistance(0);
    }
  };

  return { isRefreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd };
};

export const Notifications: React.FC<NotificationsProps> = ({ lang, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'high'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [, setUseMockData] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getNotificationDataValue = (notification: Notification, key: string): string | undefined => {
    const value = notification.data?.[key];
    return typeof value === 'string' ? value : undefined;
  };

  const refreshData = async () => {
    await loadNotifications();
  };

  const { isRefreshing, pullDistance, handleTouchStart, handleTouchMove, handleTouchEnd } = usePullToRefresh(refreshData);

  useEffect(() => {
    loadNotifications();

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedType]);

  const handleNotificationClick = async (notification: Notification) => {
    try {
      setClickedId(notification.id);

      const isRead = notification.isRead ?? notification.is_read;
      if (!isRead) {
        await apiService.markNotificationAsRead(notification.id);
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, isRead: true, is_read: true } : n
        ));
      }

      let navigateType = '';
      let navigateId = '';

      const mappedType = NOTIFICATION_TYPES[notification.type as keyof typeof NOTIFICATION_TYPES] || notification.type.toLowerCase();

      switch (mappedType) {
        case 'order':
          navigateType = 'order';
          navigateId = getNotificationDataValue(notification, 'orderId') || notification.id;
          break;
        case 'payment':
          navigateType = 'payment';
          navigateId = getNotificationDataValue(notification, 'orderId') || notification.id;
          break;
        case 'refund':
          navigateType = 'refund';
          navigateId = getNotificationDataValue(notification, 'orderId') || notification.id;
          break;
        case 'message':
          navigateType = 'chat';
          navigateId =
            getNotificationDataValue(notification, 'senderId') ||
            getNotificationDataValue(notification, 'userId') ||
            getNotificationDataValue(notification, 'chatId') ||
            notification.id;
          break;
        case 'review':
          navigateType = 'review';
          navigateId = getNotificationDataValue(notification, 'orderId') || notification.id;
          break;
        case 'system':
        case 'promotion':
        case 'security':
          navigateType = mappedType;
          navigateId = notification.id;
          break;
        default:
          navigateType = mappedType;
          navigateId =
            getNotificationDataValue(notification, 'orderId') ||
            getNotificationDataValue(notification, 'id') ||
            notification.id;
      }

      if (onNavigate) {
        onNavigate(navigateType, navigateId);
      }

      setTimeout(() => {
        setClickedId(null);
      }, 200);

    } catch (error) {
      console.error('Failed to handle notification click:', error);
      setClickedId(null);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      setUseMockData(false);

      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('Notifications loading timeout, switching to mock data');
        setUseMockData(true);
        setNotifications(filterNotifications(MOCK_NOTIFICATIONS));
        setLoading(false);
        setError('数据加载超时，已显示演示数据');
      }, 5000);

      const data = await apiService.getNotifications(1, 50, activeTab === 'unread');

      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }

      const notifications = data?.notifications || data?.data?.notifications || [];

      if (notifications.length > 0) {
        const normalizedNotifications = notifications.map((n: Record<string, unknown>) => ({
          ...n,
          isRead: (n.isRead as boolean) ?? (n.is_read as boolean) ?? false,
          createdAt: (n.createdAt as string) || (n.created_at as string) || new Date().toISOString(),
        }));
        setNotifications(filterNotifications(normalizedNotifications));
      } else {
        setUseMockData(true);
        setNotifications(filterNotifications(MOCK_NOTIFICATIONS));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setUseMockData(true);
      setNotifications(filterNotifications(MOCK_NOTIFICATIONS));
      setError('无法连接到服务器，已显示演示数据');
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = (notifs: Notification[]) => {
    let filtered = notifs;

    if (activeTab === 'unread') {
      filtered = filtered.filter(n => !(n.isRead ?? n.is_read));
    } else if (activeTab === 'high') {
      filtered = filtered.filter(n => n.priority === 'high' || !(n.isRead ?? n.is_read));
    }

    if (selectedType) {
      const mappedType = NOTIFICATION_TYPES[selectedType as keyof typeof NOTIFICATION_TYPES] || selectedType.toLowerCase();
      filtered = filtered.filter(n => {
        const nMappedType = NOTIFICATION_TYPES[n.type as keyof typeof NOTIFICATION_TYPES] || n.type.toLowerCase();
        return nMappedType === mappedType;
      });
    }

    return filtered.sort((a, b) => {
      const aUnread = !(a.isRead ?? a.is_read);
      const bUnread = !(b.isRead ?? b.is_read);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setProcessing(id);
      await apiService.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, isRead: true, is_read: true } : n
      ));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setProcessing('all');
      await apiService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setProcessing(id);
      await apiService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    } finally {
      setProcessing(null);
    }
  };

  const CustomIcons: Record<string, React.FC<any>> = {
    order: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 21L4 16.5V7.5L12 3L20 7.5V16.5L12 21Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 3V21" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M4 7.5L12 11.5L20 7.5" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    payment: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 10H21" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M7 14H11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    message: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M20 12C20 16.4183 16.4183 20 12 20C10.8242 20 9.70823 19.7461 8.7 19.2929L4 21L5.34068 16.6358C4.5106 15.3448 4 13.7381 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12H8.01M12 12H12.01M16 12H16.01" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    system: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.3 21C10.5693 21.4651 10.9669 21.847 11.4426 22.0969C11.9182 22.3468 12.4503 22.4532 12.9715 22.4026C13.4928 22.352 13.9796 22.1469 14.3686 21.8143C14.7577 21.4817 15.0306 21.0375 15.15 20.55" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    promotion: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3"/>
      </svg>
    ),
    security: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M12 22S8 18 8 12V5L12 3L16 5V12C16 18 12 22 12 22Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 8V12" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="12" cy="15" r="0.75" fill="currentColor" fillOpacity="0.3"/>
      </svg>
    ),
    refund: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <path d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M16 8V12H20" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    review: (props) => (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.25" strokeOpacity="0.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  };

  const getIconConfig = (type: string) => {
    const mappedType = NOTIFICATION_TYPES[type as keyof typeof NOTIFICATION_TYPES] || type.toLowerCase();
    const IconComponent = CustomIcons[mappedType] || CustomIcons.system;
    return { icon: IconComponent };
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return lang === 'zh' ? '刚刚' : 'Just now';

    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (minutes < 60) return lang === 'zh' ? `${minutes}分钟前` : `${minutes}m ago`;
    if (hours < 24) return lang === 'zh' ? `${hours}小时前` : `${hours}h ago`;
    if (days < 7) return lang === 'zh' ? `${days}天前` : `${days}d ago`;
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const t = {
    zh: {
      title: '消息中心',
      all: '全部',
      unread: '未读',
      important: '重要',
      noNotifications: '暂无通知',
      markAllRead: '全部已读',
      loading: '加载中...',
      retry: '重试',
      useDemo: '使用演示数据',
      filter: '筛选',
      clearFilter: '清除筛选',
      emptyDesc: '您还没有收到任何通知',
      pullToRefresh: '下拉刷新',
      newNotifications: '条新消息'
    },
    en: {
      title: 'Notifications',
      all: 'All',
      unread: 'Unread',
      important: 'Important',
      noNotifications: 'No notifications',
      markAllRead: 'Mark all read',
      loading: 'Loading...',
      retry: 'Retry',
      useDemo: 'Use Demo Data',
      filter: 'Filter',
      clearFilter: 'Clear Filter',
      emptyDesc: 'You haven\'t received any notifications yet',
      pullToRefresh: 'Pull to refresh',
      newNotifications: 'new messages'
    }
  }[lang];

  const unreadCount = notifications.filter(n => !(n.isRead ?? n.is_read)).length;
  const highPriorityCount = notifications.filter(n => n.priority === 'high' && !(n.isRead ?? n.is_read)).length;

  const notificationTypes = [
    { key: 'order', label: lang === 'zh' ? '订单' : 'Orders', icon: Package },
    { key: 'payment', label: lang === 'zh' ? '支付' : 'Payments', icon: CreditCard },
    { key: 'message', label: lang === 'zh' ? '消息' : 'Messages', icon: MessageCircle },
    { key: 'promotion', label: lang === 'zh' ? '优惠' : 'Promos', icon: Sparkles },
    { key: 'security', label: lang === 'zh' ? '安全' : 'Security', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-teal-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Bell className="h-6 w-6 text-teal-500" />
          </div>
        </div>
        <span className="text-slate-500 mt-4">{t.loading}</span>
        <button
          onClick={() => {
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
            }
            setUseMockData(true);
            setNotifications(MOCK_NOTIFICATIONS);
            setLoading(false);
          }}
          className="mt-4 px-4 py-2 text-sm text-teal-600 hover:text-teal-700 font-medium hover:bg-teal-50 rounded-full transition-colors"
        >
          {t.useDemo}
        </button>
      </div>
    );
  }

  return (
    <div
      className="pb-20 min-h-screen bg-slate-50/50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center transition-transform duration-200 pointer-events-none"
        style={{ transform: `translateY(${pullDistance}px)`, height: pullDistance > 0 ? '60px' : '0' }}
      >
        <div className="bg-white rounded-full shadow-lg p-3">
          {isRefreshing ? (
            <Loader2 className="h-5 w-5 animate-spin text-teal-500" />
          ) : (
            <RefreshCw className="h-5 w-5 text-slate-400" style={{ opacity: pullDistance / 60, transform: `rotate(${(pullDistance / 60) * 360}deg)` }} />
          )}
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Bell className="h-5 w-5 text-white" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{t.title}</h1>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount}${t.newNotifications}` : lang === 'zh' ? '全部已读' : 'All read'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={processing === 'all'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium hover:bg-teal-50 rounded-full transition-colors"
              >
                {processing === 'all' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{t.markAllRead}</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`p-2 rounded-full transition-colors ${showFilterMenu || selectedType ? 'bg-teal-100 text-teal-600' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                <Filter className="h-5 w-5" />
              </button>

              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t.filter}
                  </div>
                  {notificationTypes.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedType(selectedType === key ? null : key);
                        setShowFilterMenu(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center gap-2 text-sm transition-colors ${selectedType === key ? 'bg-teal-50 text-teal-600' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {selectedType === key && <Check className="h-4 w-4 ml-auto" />}
                    </button>
                  ))}
                  {selectedType && (
                    <>
                      <div className="border-t border-slate-100 my-1"></div>
                      <button
                        onClick={() => {
                          setSelectedType(null);
                          setShowFilterMenu(false);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        {t.clearFilter}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-2">
          {[
            { key: 'all', label: t.all, count: notifications.length },
            { key: 'unread', label: t.unread, count: unreadCount },
            { key: 'high', label: t.important, count: highPriorityCount },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as 'all' | 'unread' | 'high')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-white/20' : 'bg-slate-200'}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800">{error}</span>
          </div>
          <button
            onClick={loadNotifications}
            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 font-medium"
          >
            <RefreshCw className="h-3 w-3" />
            {t.retry}
          </button>
        </div>
      )}

      {/* Notification List */}
      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Inbox className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">{t.noNotifications}</h3>
            <p className="text-sm text-slate-500">{t.emptyDesc}</p>
          </div>
        ) : (
          notifications.map((notification, index) => {
            const { icon: Icon } = getIconConfig(notification.type);
            const isClicked = clickedId === notification.id;
            const isRead = notification.isRead ?? notification.is_read;
            const createdAt = notification.createdAt || notification.created_at;
            const isHighPriority = notification.priority === 'high' && !isRead;

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`group relative bg-white rounded-2xl transition-all duration-200 cursor-pointer overflow-hidden border border-slate-100 ${
                  isClicked ? 'scale-[0.98] bg-slate-50' : 'hover-lift'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-4 flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {!isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-teal-500 rounded-full"></span>
                        )}
                        <h3 className={`font-semibold text-slate-900 truncate ${!isRead ? 'text-base' : 'text-sm'}`}>
                          {notification.title}
                        </h3>
                        {isHighPriority && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 flex-shrink-0">
                            重要
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatTime(createdAt)}
                      </span>
                    </div>

                    <p className={`mt-1 text-slate-600 line-clamp-2 ${!isRead ? 'text-sm' : 'text-xs'}`}>
                      {notification.content}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            disabled={processing === notification.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {processing === notification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            {lang === 'zh' ? '标为已读' : 'Mark read'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleDelete(notification.id, e)}
                          disabled={processing === notification.id}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          {processing === notification.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Click outside to close filter menu */}
      {showFilterMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowFilterMenu(false)}
        ></div>
      )}
    </div>
  );
};
