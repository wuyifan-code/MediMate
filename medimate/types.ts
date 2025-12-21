export enum UserRole {
  GUEST = 'GUEST',
  PATIENT = 'PATIENT',
  ESCORT = 'ESCORT'
}

export enum ServiceType {
  FULL_PROCESS = 'FULL_PROCESS', // 全程陪诊
  APPOINTMENT = 'APPOINTMENT', // 代约挂号
  REPORT_PICKUP = 'REPORT_PICKUP', // 代取报告
  VIP_TRANSPORT = 'VIP_TRANSPORT' // 专车接送
}

export interface EscortProfile {
  id: string;
  name: string;
  rating: number;
  completedOrders: number;
  isCertified: boolean; // 2025 Standard
  specialties: string[];
  imageUrl: string;
  distance: string;
}

export interface Order {
  id: string;
  serviceType: ServiceType;
  hospital: string;
  date: string;
  status: 'PENDING' | 'MATCHED' | 'COMPLETED';
  price: number;
}

export type PageType = 'home' | 'explore' | 'notifications' | 'messages' | 'saved' | 'profile' | 'settings' | 'login';

export type Language = 'zh' | 'en';