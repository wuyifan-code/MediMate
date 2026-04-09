import {
  Bell,
  Compass,
  House,
  MessageSquareText,
  Settings,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { Language, PageType } from '../../types';

export interface NavigationItem {
  pageType: PageType;
  path: string;
  label: string;
  icon: typeof House;
}

export const buildNavigationItems = (lang: Language): NavigationItem[] => {
  const labels = {
    zh: {
      home: '工作台',
      explore: '探索',
      notifications: '提醒',
      messages: '消息',
      orders: '订单',
      profile: '我的',
      settings: '设置',
    },
    en: {
      home: 'Home',
      explore: 'Explore',
      notifications: 'Alerts',
      messages: 'Messages',
      orders: 'Orders',
      profile: 'Profile',
      settings: 'Settings',
    },
  }[lang];

  return [
    { pageType: 'home', path: '/', label: labels.home, icon: House },
    { pageType: 'explore', path: '/explore', label: labels.explore, icon: Compass },
    { pageType: 'notifications', path: '/notifications', label: labels.notifications, icon: Bell },
    { pageType: 'messages', path: '/messages', label: labels.messages, icon: MessageSquareText },
    { pageType: 'orders', path: '/orders', label: labels.orders, icon: ShoppingBag },
    { pageType: 'profile', path: '/profile', label: labels.profile, icon: UserRound },
    { pageType: 'settings', path: '/settings', label: labels.settings, icon: Settings },
  ];
};
