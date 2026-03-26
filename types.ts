export enum UserRole {
  GUEST = 'GUEST',
  PATIENT = 'PATIENT',
  ESCORT = 'ESCORT',
  ADMIN = 'ADMIN'
}

export enum ServiceType {
  FULL_PROCESS = 'FULL_PROCESS', // 全程陪诊
  APPOINTMENT = 'APPOINTMENT', // 代约挂号
  REPORT_PICKUP = 'REPORT_PICKUP', // 代取报告
  VIP_TRANSPORT = 'VIP_TRANSPORT' // 专车接送
}

// Order status aligned with Prisma schema (11 statuses)
export type OrderStatus =
  | 'PENDING'    // 待支付
  | 'PAID'        // 已支付
  | 'CONFIRMED'   // 已确认
  | 'MATCHED'     // 已匹配陪诊师
  | 'IN_PROGRESS' // 服务中
  | 'EVIDENCE_COLLECTING' // 取证打卡中
  | 'MEMO_GENERATING'     // 报告生成中
  | 'COMPLETED'  // 已完成
  | 'CANCELLED'  // 已取消
  | 'REFUNDING'  // 退款中
  | 'REFUNDED';  // 已退款

// Payment status aligned with Prisma
export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED'
}

// Refund status aligned with Prisma
export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Payment method
export enum PaymentMethod {
  WECHAT = 'WECHAT',
  STRIPE = 'STRIPE',
  ALIPAY = 'ALIPAY'
}

export interface EscortProfile {
  id: string;
  userId?: string;
  rating: number;
  completedOrders: number;
  isVerified: boolean; // Aligned with Prisma
  specialties: string[];
  bio?: string;
  hourlyRate?: number;
  latitude?: number;
  longitude?: number;
  verificationLevel?: number; // Aligned with Prisma (was 'rank')
  trustScore?: number;
  evidenceCount?: number;
  lastEvidenceAt?: string;
  certificateNo?: string;
  // Derived from UserProfile relation
  name?: string;
  avatarUrl?: string;
  distance?: string; // Computed field, not stored
}

export interface Order {
  id: string;
  serviceType: ServiceType;
  hospital: string;
  date: string;
  status: OrderStatus;
  price: number;
}

export type PageType =
  | 'home'
  | 'explore'
  | 'notifications'
  | 'messages'
  | 'saved'
  | 'profile'
  | 'settings'
  | 'login'
  | 'register'
  | 'admin'
  | 'orders'
  | 'order-confirmation';

export type Language = 'zh' | 'en';

export interface UserInfo {
  id: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  created_at?: string;
  profile?: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    avatar_url?: string;
    bio?: string;
  };
}

export interface CreateOrderRequest {
  escortId: string;
  hospitalId?: string;
  serviceId?: string;
  serviceType: ServiceType;
  price: number;
  duration?: number;
  appointmentDate?: string;
  appointmentTime?: string;
  notes?: string;
  couponCode?: string;
  platformFee?: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// Hospital type
export interface Hospital {
  id: string;
  name: string;
  department: string;
  level: string; // e.g., "三甲"
  address: string;
  phone?: string;
  rating?: number;
  distance?: string;
}

// Appointment type
export interface Appointment {
  id: string;
  patientId: string;
  escortId?: string;
  serviceType: ServiceType;
  hospital: string;
  department?: string;
  date: string;
  time?: string;
  status: 'PENDING' | 'CONFIRMED' | 'MATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  price: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// Hospital search params
export interface HospitalSearchParams {
  keyword?: string;
  department?: string;
  city?: string;
  level?: string;
  minRating?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

// Escort search params
export interface EscortSearchParams {
  keyword?: string;
  specialty?: string;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

// Search suggestion
export interface SearchSuggestion {
  id: string;
  name: string;
  type: 'hospital' | 'escort';
  subtitle?: string;
  address?: string;
  rating?: number;
  hourlyRate?: number;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Search history item
export interface SearchHistoryItem {
  id: string;
  query: string;
  type: 'hospital' | 'escort' | 'all';
  timestamp: number;
}
