import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { UserRole, Hospital, Appointment, HospitalSearchParams, EscortSearchParams, EscortProfile, SearchSuggestion, PaginatedResponse, CreateOrderRequest } from '../types';

// 定义API响应类型
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 定义用户凭证类型
interface LoginCredentials {
  email: string;
  password: string;
  role?: UserRole;
}

// 定义用户注册类型
interface RegisterData {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  phone?: string;
}

// 定义用户信息类型
interface UserInfo {
  id: string;
  email: string;
  role: UserRole;
  profile?: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
    bio?: string;
  };
}

// 定义认证响应类型
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

class ApiService {
  private axiosInstance: AxiosInstance;
  private readonly TOKEN_KEY = 'medimate_access_token';
  private readonly REFRESH_TOKEN_KEY = 'medimate_refresh_token';
  private readonly USER_KEY = 'medimate_user';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;

  constructor() {
    // 创建axios实例 - default to local NestJS server
    this.axiosInstance = axios.create({
      // Production must receive VITE_API_URL from the deployment environment.
      // The same-origin fallback keeps local development convenient without
      // pointing public visitors at their own localhost.
      baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api'),
      timeout: 10000, // 10秒超时
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      transformRequest: [
        (data: any, headers: any) => {
          return JSON.stringify(data);
        },
      ],
    });

    // 配置请求拦截器
    this.setupRequestInterceptor();

    // 配置响应拦截器
    this.setupResponseInterceptor();
  }

  // 带重试的请求方法
  private extractPayload<T>(payload: ApiResponse<T> | T): T {
    if (
      payload &&
      typeof payload === 'object' &&
      'success' in (payload as Record<string, unknown>)
    ) {
      return ((payload as ApiResponse<T>).data ?? null) as T;
    }

    return payload as T;
  }

  private normalizeUserProfile(user: any): any {
    if (!user) return user;

    const profile = user.profile
      ? {
          ...user.profile,
          avatar_url: user.profile.avatar_url || user.profile.avatarUrl,
          avatarUrl: user.profile.avatarUrl || user.profile.avatar_url,
        }
      : undefined;

    const escortProfile = user.escortProfile
      ? {
          ...user.escortProfile,
          completedOrders: user.escortProfile.completedOrders ?? user.escortProfile.completed_orders,
          isVerified: user.escortProfile.isVerified ?? user.escortProfile.is_verified ?? user.escortProfile.isCertified,
          hourlyRate: user.escortProfile.hourlyRate ?? user.escortProfile.hourly_rate,
          verificationLevel: user.escortProfile.verificationLevel ?? user.escortProfile.rank,
          // Derive name and avatarUrl from related user profile
          name: user.profile?.name,
          avatarUrl: user.profile?.avatarUrl || user.profile?.avatar_url,
        }
      : undefined;

    return {
      ...user,
      created_at: user.created_at || user.createdAt,
      createdAt: user.createdAt || user.created_at,
      updated_at: user.updated_at || user.updatedAt,
      updatedAt: user.updatedAt || user.updated_at,
      profile,
      escortProfile,
    };
  }

  private async requestWithRetry<T>(
    config: AxiosRequestConfig,
    retries = this.MAX_RETRIES
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.axiosInstance.request<T>(config);
    } catch (error: any) {
      // 如果是网络错误或超时，且还有重试次数，则重试
      if (retries > 0 && (!error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
        console.log(`Request failed, retrying... (${this.MAX_RETRIES - retries + 1}/${this.MAX_RETRIES})`);
        await this.delay(this.RETRY_DELAY * (this.MAX_RETRIES - retries + 1));
        return this.requestWithRetry<T>(config, retries - 1);
      }
      throw error;
    }
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 请求拦截器
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // 获取token并添加到请求头
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError): Promise<AxiosError> => {
        return Promise.reject(error);
      }
    );
  }

  // 响应拦截器
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>): AxiosResponse<ApiResponse> => {
        return response;
      },
      async (error: AxiosError<ApiResponse>): Promise<any> => {
        // 统一错误处理
        if (error.response) {
          // 服务器返回错误状态码
          console.error('API Error:', error.response.data);

          // 处理401未授权错误 - 尝试刷新token
          if (error.response.status === 401) {
            const refreshed = await this.refreshToken();
            if (refreshed) {
              // 重试请求
              return this.axiosInstance.request(error.config!);
            }
            this.logout();
          }
          return Promise.reject(error);
        } else if (error.request) {
          // 请求已发送但没有收到响应
          console.error('API Error: No response received (backend server may be down)');
          
          const networkError = new Error('网络连接失败，请检查后端服务是否运行') as any;
          networkError.isNetworkError = true;
          networkError.code = error.code;
          return Promise.reject(networkError);
        } else {
          // 请求配置错误
          console.error('API Error:', error.message);
          return Promise.reject(error);
        }
      }
    );
  }

  // Legacy mock fixtures remain available for an explicit contest fixture mode.
  private getMockData(url: string): any {
    // 根据请求路径返回不同的模拟数据
    if (url.includes('/hospitals')) {
      return [
        {
          id: '1',
          name: '北京协和医院',
          department: '内科',
          level: '三甲',
          address: '北京市东城区帅府园1号',
          phone: '010-69156114',
          rating: 4.8,
          imageUrl: 'https://picsum.photos/400/200?random=1'
        },
        {
          id: '2',
          name: '复旦大学附属华山医院',
          department: '外科',
          level: '三甲',
          address: '上海市静安区乌鲁木齐中路12号',
          phone: '021-52889999',
          rating: 4.7,
          imageUrl: 'https://picsum.photos/400/200?random=2'
        },
        {
          id: '3',
          name: '中山大学附属第一医院',
          department: '儿科',
          level: '三甲',
          address: '广州市中山二路58号',
          phone: '020-87755766',
          rating: 4.9,
          imageUrl: 'https://picsum.photos/400/200?random=3'
        }
      ];
    } else if (url.includes('/escorts')) {
      return [
        {
          id: '1',
          userId: 'user1',
          rating: 4.9,
          completedOrders: 156,
          isVerified: true,
          specialties: ['儿科', '骨科'],
          bio: '有5年陪诊经验，专业护理背景',
          hourlyRate: 150,
          user: {
            id: 'user1',
            name: '王淑芬',
            avatarUrl: 'https://picsum.photos/100/100?random=20'
          }
        },
        {
          id: '2',
          userId: 'user2',
          rating: 4.8,
          completedOrders: 89,
          isVerified: true,
          specialties: ['内科', '妇科'],
          bio: '专业医疗背景，细心负责',
          hourlyRate: 120,
          user: {
            id: 'user2',
            name: '张伟',
            avatarUrl: 'https://picsum.photos/100/100?random=21'
          }
        }
      ];
    } else if (url.includes('/services/recommended')) {
      return [
        {
          id: '1',
          name: '全程陪诊',
          description: '从挂号到取药的全程陪伴',
          basePrice: 300,
          type: 'FULL_PROCESS'
        },
        {
          id: '2',
          name: '代约挂号',
          description: '帮助预约专家号',
          basePrice: 100,
          type: 'APPOINTMENT'
        },
        {
          id: '3',
          name: '代取报告',
          description: '代取检查报告并解读',
          basePrice: 80,
          type: 'REPORT_PICKUP'
        },
        {
          id: '4',
          name: '专车接送',
          description: '舒适专车接送服务',
          basePrice: 200,
          type: 'VIP_TRANSPORT'
        }
      ];
    } else if (url.includes('/auth/login') || url.includes('/auth/register')) {
      return {
        accessToken: 'mock-token-123',
        refreshToken: 'mock-refresh-token-456',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          role: 'PATIENT'
        }
      };
    } else if (url.includes('/orders')) {
      return [];
    } else if (url.includes('/notifications')) {
      return {
        data: [],
        total: 0,
        page: 1,
        limit: 20
      };
    } else if (url.includes('/reviews')) {
      return [];
    } else {
      return null;
    }
  }

  // 获取token
  private getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  // 存储token
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  // 存储refresh token
  private setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  // 存储用户信息
  private setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // 获取用户信息
  public getUser(): UserInfo | null {
    try {
      const userJson = localStorage.getItem(this.USER_KEY);
      if (!userJson) return null;
      const user = JSON.parse(userJson);
      // Validate that user has required fields
      if (user && user.role) {
        return user;
      }
      localStorage.removeItem(this.USER_KEY);
      return null;
    } catch {
      localStorage.removeItem(this.USER_KEY);
      return null;
    }
  }

  // 检查是否已登录
  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // 刷新 token
  private async refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/refresh', {
        refreshToken,
      });

      if (response.data.success && response.data.data) {
        this.setToken(response.data.data.accessToken);
        this.setRefreshToken(response.data.data.refreshToken);
        this.setUser(response.data.data.user);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
    return false;
  }

  // 登录
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // 只发送 email 和 password 字段，不发送 role 字段
    const { email, password } = credentials;
    const response = await this.axiosInstance.post<any>('/auth/login', { email, password });
    // 处理后端直接返回 AuthResponse 的情况
    if (response.data.accessToken && response.data.refreshToken && response.data.user) {
      const { accessToken, refreshToken, user } = response.data;
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      this.setUser(user);
      return response.data;
    }
    // 处理包装后的响应格式
    else if (response.data.success && response.data.data) {
      const { accessToken, refreshToken, user } = response.data.data;
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      this.setUser(user);
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  }

  // 注册
  public async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.axiosInstance.post<any>('/auth/register', data);
    // 处理后端直接返回 AuthResponse 的情况
    if (response.data.accessToken && response.data.refreshToken && response.data.user) {
      const { accessToken, refreshToken, user } = response.data;
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      this.setUser(user);
      return response.data;
    }
    // 处理包装后的响应格式
    else if (response.data.success && response.data.data) {
      const { accessToken, refreshToken, user } = response.data.data;
      this.setToken(accessToken);
      this.setRefreshToken(refreshToken);
      this.setUser(user);
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  }

  // 登出
  public async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/auth/logout');
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // 获取医院列表
  public async getHospitals(params?: HospitalSearchParams): Promise<Hospital[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<Hospital[]>>('/hospitals', { params });
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get hospitals:', error);
      return [];
    }
  }

  // 获取陪诊师列表
  public async getEscorts(params?: { latitude?: number; longitude?: number; rating?: number }): Promise<EscortProfile[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<EscortProfile[]>>('/escorts', { params });
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get escorts:', error);
      return [];
    }
  }

  // 获取推荐服务
  public async getRecommendedServices(params?: any): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>('/services/recommended', { params });
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get recommended services:', error);
      return [];
    }
  }

  // 获取附近陪诊师
  public async getNearbyEscorts(latitude: number, longitude: number, radius?: number): Promise<EscortProfile[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<EscortProfile[]> | EscortProfile[]>('/escorts/nearby', {
        params: { latitude, longitude, radius },
      });
      return this.extractPayload<EscortProfile[]>(response.data) || [];
    } catch (error) {
      console.error('Failed to get nearby escorts:', error);
      return [];
    }
  }

  // 创建预约
  public async createAppointment(data: CreateOrderRequest): Promise<Appointment> {
    const response = await this.axiosInstance.post<ApiResponse<Appointment>>('/orders', data);
    const payload = this.extractPayload<Appointment>(response.data);
    if (payload) {
      return payload;
    }
    throw new Error(response.data.message || 'Failed to create appointment');
  }

  // 获取用户预约列表
  public async getUserAppointments(): Promise<Appointment[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<Appointment[]>>('/orders');
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get user appointments:', error);
      return [];
    }
  }

  // ========== PAYMENTS ==========

  // Create Stripe payment intent
  public async createStripePaymentIntent(orderId: string, currency?: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
    const response = await this.axiosInstance.post<ApiResponse<{ clientSecret: string; paymentIntentId: string }> | { clientSecret: string; paymentIntentId: string }>('/payments/stripe/create-intent', {
      orderId,
      currency: currency || 'cny',
    });
    const payload = this.extractPayload<{ clientSecret: string; paymentIntentId: string }>(response.data);
    if (payload) {
      return payload;
    }
    throw new Error((response.data as ApiResponse<{ clientSecret: string; paymentIntentId: string }>).message || 'Failed to create payment intent');
  }

  // Confirm Stripe payment
  public async confirmStripePayment(paymentIntentId: string): Promise<{ success: boolean; orderId: string }> {
    const response = await this.axiosInstance.post<ApiResponse<{ success: boolean; orderId: string }> | { success: boolean; orderId: string }>('/payments/stripe/confirm', {
      paymentIntentId,
    });
    const payload = this.extractPayload<{ success: boolean; orderId: string }>(response.data);
    if (payload) {
      return payload;
    }
    throw new Error((response.data as ApiResponse<{ success: boolean; orderId: string }>).message || 'Failed to confirm payment');
  }

  // Create WeChat payment order
  public async createWechatPayment(orderId: string): Promise<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }> {
    const response = await this.axiosInstance.post<ApiResponse<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }> | { wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>('/payments/wechat/create-order', {
      orderId,
    });
    const payload = this.extractPayload<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>(response.data);
    if (payload) {
      return payload;
    }
    throw new Error((response.data as ApiResponse<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>).message || 'Failed to create WeChat payment');
  }

  // Query WeChat payment status
  public async queryWechatPayment(orderId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any> | any>(`/payments/wechat/query/${orderId}`);
      return this.extractPayload<any>(response.data);
    } catch (error) {
      console.error('Failed to query WeChat payment:', error);
      return null;
    }
  }

  // Request refund (Legacy)
  public async requestRefund(paymentId: string, amount?: number): Promise<{ success: boolean; refundedAmount: number }> {
    const response = await this.axiosInstance.post<ApiResponse<{ success: boolean; refundedAmount: number }>>('/payments/refund', {
      paymentId,
      amount,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to process refund');
  }

  // Create refund request
  public async createRefund(data: {
    orderId: string;
    reason: string;
    reasonType?: string;
    description?: string;
    amount?: number;
  }): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/payments/refunds', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create refund request');
  }

  // Get my refunds
  public async getMyRefunds(page = 1, limit = 20): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/payments/refunds/my?page=${page}&limit=${limit}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    } catch (error) {
      console.error('Failed to get my refunds:', error);
      return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
    }
  }

  // Get refund details
  public async getRefund(refundId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/payments/refunds/${refundId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get refund details');
  }

  // Get payment by order ID
  public async getPaymentByOrderId(orderId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any> | any>(`/payments/${orderId}`);
      return this.extractPayload<any>(response.data);
    } catch (error) {
      console.error('Failed to get payment:', error);
      return null;
    }
  }

  // Get AI Web Search Synthesis
  public async getWebSearchSynthesis(query: string, lang: 'zh' | 'en'): Promise<any> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<any>>('/ai/web-search', { query, lang });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to get web search synthesis');
    } catch (error) {
      console.error('Failed to get web search synthesis:', error);
      // Return fallback data
      return {
        synthesisText: lang === 'zh' ? '由于网络异常或未配置 API Key，检索引擎离线。请在后端 .env 中配置 MINIMAX_API_KEY。' : 'Search engine offline due to network issue or missing API Key. Please configure MINIMAX_API_KEY in the backend .env file.',
        keyInfo: [
          { title: lang === 'zh' ? '状态' : 'Status', val: lang === 'zh' ? '离线 (Offline)' : 'Offline' }
        ],
        sources: [lang === 'zh' ? '本地回退处理方案' : 'Local Fallback']
      };
    }
  }

  // ========== ADMIN ==========

  // Update user (admin)
  public async updateUser(userId: string, data: {
    name?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/users/${userId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update user');
  }

  // Get user details (admin)
  public async getUserDetails(userId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/users/${userId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get user details');
  }

  // Get dashboard stats
  public async getAdminDashboard(): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/admin/dashboard');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get dashboard stats');
  }

  // Get revenue stats
  public async getAdminRevenue(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/revenue?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get revenue stats');
  }

  // Get users
  public async getAdminUsers(page = 1, limit = 20, search?: string, role?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/users?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get users');
  }

  // Update user role
  public async updateUserRole(userId: string, role: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/users/${userId}/role`, { role });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update user role');
  }

  // Disable user
  public async disableUser(userId: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/users/${userId}/disable`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to disable user');
  }

  // Enable user
  public async enableUser(userId: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/users/${userId}/enable`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to enable user');
  }

  // Get orders
  public async getAdminOrders(page = 1, limit = 20, status?: string, search?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/orders?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get orders');
  }

  // Get order details (admin)
  public async getAdminOrder(orderId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/orders/${orderId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get order details');
  }

  // Update order status
  public async updateOrderStatus(orderId: string, status: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/orders/${orderId}/status`, { status });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update order status');
  }

  // Cancel order (admin)
  public async cancelOrderAdmin(orderId: string, reason?: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/admin/orders/${orderId}/cancel`, { reason });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to cancel order');
  }

  // Assign escort to order
  public async assignEscort(orderId: string, escortId: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/admin/orders/${orderId}/assign`, { escortId });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to assign escort');
  }

  // Get escorts
  public async getAdminEscorts(page = 1, limit = 20, status?: string, search?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/escorts?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get escorts');
  }

  // Verify escort
  public async verifyEscort(escortId: string, approved: boolean, reason?: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/escorts/${escortId}/verify`, { approved, reason });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to verify escort');
  }

  // Get complaints
  public async getComplaints(page = 1, limit = 20, status?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (status) params.append('status', status);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/complaints?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get complaints');
  }

  // Handle complaint
  public async handleComplaint(complaintId: string, action: 'RESOLVED' | 'REJECTED', note?: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/complaints/${complaintId}/handle`, {
      action,
      note,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to handle complaint');
  }

  // ========== REVIEWS ==========

  // Create a review
  public async createReview(orderId: string, targetId: string, rating: number, comment?: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/reviews', {
      orderId,
      targetId,
      rating,
      comment,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create review');
  }

  // Get reviews by order
  public async getReviewsByOrder(orderId: string): Promise<any[]> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>(`/reviews/order/${orderId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Get reviews for an escort
  public async getReviewsByTarget(targetId: string, page = 1, limit = 20): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/reviews/target/${targetId}?page=${page}&limit=${limit}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get reviews');
  }

  // Check if can review
  public async checkCanReview(orderId: string): Promise<{ canReview: boolean; targetId?: string; reason?: string }> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/reviews/can-review/${orderId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { canReview: false, reason: 'Failed to check' };
  }

  // ========== NOTIFICATIONS ==========

  // Get notifications
  public async getNotifications(page = 1, limit = 20, unreadOnly = false, type?: string): Promise<any> {
    let url = `/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`;
    if (type) url += `&type=${type}`;
    
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>(url);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to get notifications');
    } catch (error) {
      console.error('Failed to get notifications:', error);
      // 返回空数据
      return { notifications: [], unreadCount: 0, pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  // Get unread notification count
  public async getUnreadNotificationCount(): Promise<number> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      if (response.data.success && response.data.data) {
        return response.data.data.count;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  // Get notification stats
  public async getNotificationStats(): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>('/notifications/stats');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { total: 0, unread: 0, byType: {} };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return { total: 0, unread: 0, byType: {} };
    }
  }

  // Mark notification as read
  public async markNotificationAsRead(notificationId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<any>>(`/notifications/${notificationId}/read`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to mark as read');
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  public async markAllNotificationsAsRead(): Promise<any> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<any>>('/notifications/read-all');
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to mark all as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  public async deleteNotification(notificationId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<any>>(`/notifications/${notificationId}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to delete notification');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  }

  // Delete multiple notifications
  public async deleteNotifications(notificationIds: string[]): Promise<any> {
    try {
      const response = await this.axiosInstance.delete<ApiResponse<any>>('/notifications/batch', {
        data: { ids: notificationIds }
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to delete notifications');
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      throw error;
    }
  }

  // Update notification settings
  public async updateNotificationSettings(settings: {
    orderNotifications: boolean;
    messageNotifications: boolean;
    systemNotifications: boolean;
    promotionalNotifications: boolean;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.patch<ApiResponse<any>>('/users/notification-settings', settings);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return settings;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return settings;
    }
  }

  // ========== USER PROFILE ==========

  // Get current user profile
  public async getUserProfile(): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any> | any>('/users/me');
    const payload = this.extractPayload<any>(response.data);
    if (payload) {
      return this.normalizeUserProfile(payload);
    }
    throw new Error((response.data as ApiResponse<any>).message || 'Failed to get user profile');
  }

  // Update user profile
  public async updateUserProfile(data: { name?: string; phone?: string; avatar_url?: string; bio?: string; gender?: string; age?: number }): Promise<any> {
    const { avatar_url, ...rest } = data;
    const response = await this.axiosInstance.patch<ApiResponse<any> | any>('/users/profile', {
      ...rest,
      avatarUrl: avatar_url,
    });
    const payload = this.extractPayload<any>(response.data);
    if (payload) {
      return this.normalizeUserProfile(payload);
    }
    throw new Error((response.data as ApiResponse<any>).message || 'Failed to update user profile');
  }

  // Get escort profile
  public async getEscortProfile(): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>('/users/escort-profile');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return null;
  }

  // Update escort profile
  public async updateEscortProfile(data: { bio?: string; hourly_rate?: number; certificate_no?: string; specialties?: string[] }): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>('/users/escort-profile', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update escort profile');
  }

  // ========== ORDERS ==========

  // Get order details
  public async getOrderDetails(orderId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/orders/${orderId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get order details');
  }

  // Get my orders (patient or escort)
  public async getMyOrders(params?: { status?: string; page?: number; limit?: number }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/orders?${queryParams}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  // Accept order (for escort)
  public async acceptOrder(orderId: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/accept`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to accept order');
  }

  // Cancel order
  public async cancelOrder(orderId: string, reason?: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/cancel`, { reason });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to cancel order');
  }

  // Start service (for escort)
  public async startService(orderId: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/start`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to start service');
  }

  // Complete service (for escort)
  public async completeService(orderId: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/complete`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to complete service');
  }

  // Update order status
  public async updateOrder(orderId: string, data: { status?: string; notes?: string }): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/orders/${orderId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update order');
  }

  // ========== MESSAGES ==========

  // Get conversations list
  public async getConversations(): Promise<any[]> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>('/messages/conversations');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Start or get existing conversation with a user
  public async startConversation(userId: string): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/messages/conversations', { userId });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to start conversation');
  }

  // Get unread message count
  public async getUnreadCount(): Promise<number> {
    const response = await this.axiosInstance.get<ApiResponse<{ count: number }>>('/messages/unread-count');
    if (response.data.success && response.data.data) {
      return response.data.data.count;
    }
    return 0;
  }

  // Get conversation messages with a partner
  public async getConversationMessages(partnerId: string, page = 1, limit = 50): Promise<any[]> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>(`/messages/${partnerId}?page=${page}&limit=${limit}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Send a message via HTTP (fallback when WebSocket is not available)
  public async sendMessage(data: {
    receiverId: string;
    content: string;
    orderId?: string;
    type?: string;
    imageUrl?: string;
  }): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/messages', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to send message');
  }

  // Search messages
  public async searchMessages(query: string): Promise<any[]> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>(`/messages/search?q=${encodeURIComponent(query)}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Mark message as read
  public async markMessageRead(messageId: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/messages/${messageId}/read`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to mark message as read');
  }

  // Mark conversation as read
  public async markConversationRead(partnerId: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/messages/conversations/${partnerId}/read`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to mark conversation as read');
  }

  // Delete a message
  public async deleteMessage(messageId: string): Promise<any> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/messages/${messageId}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to delete message');
  }

  // ========== HOSPITALS ==========

  // Get hospital details
  public async getHospital(hospitalId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/hospitals/${hospitalId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get hospital');
  }

  // Search hospitals with pagination
  public async searchHospitals(params?: HospitalSearchParams): Promise<PaginatedResponse<Hospital>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<Hospital>>>('/hospitals', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  // Get hospital search suggestions
  public async getHospitalSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const response = await this.axiosInstance.get<ApiResponse<SearchSuggestion[]>>('/hospitals/suggestions', {
      params: { q: query, limit }
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Get popular hospitals
  public async getPopularHospitals(limit: number = 10): Promise<Hospital[]> {
    const response = await this.axiosInstance.get<ApiResponse<Hospital[]> | Hospital[]>('/hospitals/popular', {
      params: { limit }
    });
    return this.extractPayload<Hospital[]>(response.data) || [];
  }

  // Get all departments
  public async getDepartments(): Promise<string[]> {
    const response = await this.axiosInstance.get<ApiResponse<string[]>>('/hospitals/departments');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // ========== ESCORTS ==========

  // Search escorts with pagination
  public async searchEscorts(params?: EscortSearchParams): Promise<PaginatedResponse<EscortProfile>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<EscortProfile>>>('/escorts', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  // Get escort search suggestions
  public async getEscortSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    const response = await this.axiosInstance.get<ApiResponse<SearchSuggestion[]>>('/escorts/suggestions', {
      params: { q: query, limit }
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Get popular escorts
  public async getPopularEscorts(limit: number = 10): Promise<EscortProfile[]> {
    const response = await this.axiosInstance.get<ApiResponse<EscortProfile[]> | EscortProfile[]>('/escorts/popular', {
      params: { limit }
    });
    return this.extractPayload<EscortProfile[]>(response.data) || [];
  }

  // Get all specialties
  public async getSpecialties(): Promise<string[]> {
    const response = await this.axiosInstance.get<ApiResponse<string[]>>('/escorts/specialties');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Get escort details
  public async getEscortDetails(escortId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/escorts/${escortId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get escort details');
  }

  // Update escort location
  public async updateEscortLocation(latitude: number, longitude: number): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/escorts/location', { latitude, longitude });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update location');
  }

  // ========== REVIEWS ==========

  // Get my reviews
  public async getMyReviews(page = 1, limit = 20): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/reviews/author?page=${page}&limit=${limit}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get my reviews');
  }

  // Upload image
  public async uploadImage(formData: FormData): Promise<{ url: string }> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<{ url: string }>>('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to upload image');
    } catch (error) {
      console.error('Upload image error:', error);
      const mockUrl = `https://picsum.photos/400/400?random=${Date.now()}`;
      return { url: mockUrl };
    }
  }

  // Get favorites
  public async getFavorites(page = 1, limit = 20): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>(`/favorites?page=${page}&limit=${limit}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get favorites:', error);
      return [];
    }
  }

  // Add to favorites
  public async addFavorite(targetId: string, type: 'escort' | 'service'): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/favorites', {
      targetId,
      type,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to add favorite');
  }

  // Remove from favorites
  public async removeFavorite(favoriteId: string): Promise<any> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/favorites/${favoriteId}`);
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to remove favorite');
  }

  // ========== WITHDRAW ==========

  // Withdraw request
  public async withdraw(data: {
    amount: number;
    method: 'alipay' | 'wechat' | 'bank';
    account: string;
    realName: string;
    password?: string;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<any>>('/withdraw', data);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Withdraw failed');
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    }
  }

  // Get withdraw records
  public async getWithdrawRecords(page = 1, limit = 20): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/withdraw/records?page=${page}&limit=${limit}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { data: [], total: 0, page: 1, limit: 20 };
    } catch (error) {
      console.error('Failed to get withdraw records:', error);
      return { data: [], total: 0, page: 1, limit: 20 };
    }
  }

  // ========== REFUNDS ==========

  // Get refunds list (admin)
  public async getRefunds(page = 1, limit = 20, status?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (status) params.append('status', status);
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/refunds?${params}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    } catch (error) {
      console.error('Failed to get refunds:', error);
      return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
    }
  }

  // Get refund details (admin)
  public async getRefundDetails(refundId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/refunds/${refundId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get refund details');
  }

  // Approve refund
  public async approveRefund(refundId: string, note?: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/refunds/${refundId}/approve`, { note });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to approve refund');
  }

  // Reject refund
  public async rejectRefund(refundId: string, note?: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/admin/refunds/${refundId}/reject`, { note });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to reject refund');
  }

  // ========== ADMIN STATISTICS ==========

  // Get user statistics
  public async getUserStats(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/statistics/users?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get user stats');
  }

  // Get order statistics
  public async getOrderStats(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/statistics/orders?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get order stats');
  }

  // Get revenue statistics
  public async getRevenueStatistics(startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/statistics/revenue?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get revenue stats');
  }

  // Export data
  public async exportData(type: 'users' | 'orders' | 'escorts', format: 'csv' | 'excel' = 'csv', startDate?: string, endDate?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/admin/export/${type}?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to export data');
  }

  // ========== ESCORT SERVICE PUBLISHING ==========

  // Create escort service
  public async createEscortService(data: {
    serviceType: string;
    title?: string;
    description?: string;
    pricePerHour: number;
    startDate: string;
    endDate: string;
    availableWeekdays: number[];
    timeSlots: { start: string; end: string }[];
    hospitalIds?: string[];
    areas?: string[];
    tags?: string[];
    maxDailyOrders?: number;
  }): Promise<any> {
    const response = await this.axiosInstance.post<ApiResponse<any>>('/escorts/services', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to create service');
  }

  // Get my escort services
  public async getMyEscortServices(): Promise<any[]> {
    const response = await this.axiosInstance.get<ApiResponse<any[]>>('/escorts/services/my');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  }

  // Get all active services (for patients)
  public async getAllEscortServices(params?: {
    serviceType?: string;
    area?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<any>> {
    const response = await this.axiosInstance.get<ApiResponse<PaginatedResponse<any>>>('/escorts/services/all', { params });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
  }

  // Get service by ID
  public async getEscortServiceById(serviceId: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/escorts/services/${serviceId}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get service');
  }

  // Update escort service
  public async updateEscortService(serviceId: string, data: Partial<{
    serviceType: string;
    title?: string;
    description?: string;
    pricePerHour: number;
    startDate: string;
    endDate: string;
    availableWeekdays: number[];
    timeSlots: { start: string; end: string }[];
    hospitalIds?: string[];
    areas?: string[];
    tags?: string[];
    maxDailyOrders?: number;
  }>): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/escorts/services/${serviceId}`, data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to update service');
  }

  // Toggle service status
  public async toggleEscortServiceStatus(serviceId: string): Promise<any> {
    const response = await this.axiosInstance.patch<ApiResponse<any>>(`/escorts/services/${serviceId}/toggle`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to toggle service status');
  }

  // Delete escort service
  public async deleteEscortService(serviceId: string): Promise<any> {
    const response = await this.axiosInstance.delete<ApiResponse<any>>(`/escorts/services/${serviceId}`);
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to delete service');
  }

  // Get service availability
  public async getServiceAvailability(serviceId: string, date: string): Promise<any> {
    const response = await this.axiosInstance.get<ApiResponse<any>>(`/escorts/services/${serviceId}/availability`, {
      params: { date }
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.message || 'Failed to get availability');
  }

  // ========== DIGITAL EVIDENCE (TRUST PROTOCOL) ==========

  // Submit digital evidence
  public async submitEvidence(data: {
    orderId: string;
    nodeName: string;
    type: string;
    url?: string;
    content?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<any>>('/digital-evidence/submit', data);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.message || 'Failed to submit evidence');
    } catch (error) {
      console.error('Failed to submit evidence:', error);
      throw error;
    }
  }

  // Get evidences by order
  public async getEvidencesByOrder(orderId: string): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>(`/digital-evidence/order/${orderId}`);
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get evidences:', error);
      return [];
    }
  }

  // Verify evidence hash
  public async verifyEvidence(evidenceId: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<any>>(`/digital-evidence/verify/${evidenceId}`);
      if (response.data.success) {
        return response.data.data;
      }
      return { valid: false, reason: 'Verification failed' };
    } catch (error) {
      console.error('Failed to verify evidence:', error);
      return { valid: false, reason: 'Verification error' };
    }
  }

  // Get trust score
  public async getTrustScore(escortId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any>>(`/trust/score/${escortId}`);
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('Failed to get trust score:', error);
      return null;
    }
  }
}

// 创建并导出单例实例
export const apiService = new ApiService();
