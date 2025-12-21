import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { UserRole } from '../types';

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
  role: UserRole;
}

// 定义用户注册类型
interface RegisterData extends LoginCredentials {
  name: string;
  phone: string;
}

// 定义用户信息类型
interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
}

// 定义认证响应类型
interface AuthResponse {
  token: string;
  user: UserInfo;
  expiresAt: number;
}

// 定义重试配置接口
interface RetryConfig {
  maxRetries: number;       // 最大重试次数
  retryDelay: number;       // 初始重试延迟(毫秒)
  exponentialBackoff: boolean; // 是否使用指数退避
  retryableStatusCodes: number[]; // 可重试的HTTP状态码
}

// 默认重试配置
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableStatusCodes: [429, 500, 502, 503, 504]
};

class ApiServiceWithRetry {
  private axiosInstance: AxiosInstance;
  private readonly TOKEN_KEY = 'medimate_auth_token';
  private readonly USER_KEY = 'medimate_user';
  private retryConfig: RetryConfig;
  private pendingRequests: Map<string, Promise<any>> = new Map(); // 请求缓存，防止重复请求
  private requestCache: Map<string, { data: any; timestamp: number }> = new Map(); // 响应缓存
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 缓存有效期5分钟

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    // 合并默认配置和自定义配置
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    // 创建axios实例
    this.axiosInstance = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 配置请求拦截器
    this.setupRequestInterceptor();
    
    // 配置响应拦截器
    this.setupResponseInterceptor();
  }

  // 请求拦截器
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config: AxiosRequestConfig): AxiosRequestConfig => {
        // 获取token并添加到请求头
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError): Promise<AxiosError> => {
        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  // 响应拦截器
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>): AxiosResponse<ApiResponse> => {
        return response;
      },
      (error: AxiosError<ApiResponse>): Promise<AxiosError> => {
        // 增强错误信息
        const enhancedError = this.enhanceError(error);
        
        // 处理401未授权错误
        if (error.response && error.response.status === 401) {
          this.logout();
          // 可以在这里添加重定向到登录页的逻辑
          console.warn('认证已过期，请重新登录');
        }
        
        return Promise.reject(enhancedError);
      }
    );
  }

  // 增强错误信息
  private enhanceError(error: AxiosError<ApiResponse>): AxiosError {
    if (!error.message) {
      error.message = '未知API错误';
    }
    
    // 为常见错误类型添加更友好的错误信息
    if (error.code === 'ECONNABORTED') {
      error.message = '请求超时，请检查网络连接';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      error.message = '无法连接到服务器，请稍后再试';
    }
    
    // 如果服务器返回了具体错误信息，则使用服务器的错误信息
    if (error.response && error.response.data && error.response.data.error) {
      error.message = error.response.data.error;
    }
    
    return error;
  }

  // 带重试机制的请求方法
  private async requestWithRetry<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    let lastError: Error | null = null;
    const cacheKey = `${method}:${url}:${JSON.stringify(config?.params || {})}`;
    
    // 检查是否有缓存可用（仅对GET请求有效）
    if (method === 'get' && this.isCacheValid(cacheKey)) {
      console.log(`从缓存获取: ${url}`);
      return this.requestCache.get(cacheKey)?.data as T;
    }
    
    // 检查是否有相同请求正在进行中，防止重复请求
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`等待正在进行的请求: ${url}`);
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // 创建请求Promise并添加到pendingRequests
    const requestPromise = this.executeWithRetry<T>(method, url, config, lastError);
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      
      // 对GET请求结果进行缓存
      if (method === 'get') {
        this.requestCache.set(cacheKey, { data: result, timestamp: Date.now() });
        this.cleanupCache(); // 清理过期缓存
      }
      
      return result;
    } finally {
      // 请求完成后从pendingRequests中移除
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  // 执行请求并处理重试逻辑
  private async executeWithRetry<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    config?: AxiosRequestConfig,
    lastError?: Error | null
  ): Promise<T> {
    let attempts = 0;
    
    while (attempts <= this.retryConfig.maxRetries) {
      try {
        // 执行请求
        const response = await this.axiosInstance[method]<ApiResponse<T>>(url, config);
        
        if (response.data.success && response.data.data !== undefined) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || '请求失败');
        }
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        // 判断是否应该重试
        if (attempts <= this.retryConfig.maxRetries && this.shouldRetry(error)) {
          // 计算重试延迟
          const delay = this.calculateRetryDelay(attempts);
          console.log(`请求失败，${delay}ms后重试 (${attempts}/${this.retryConfig.maxRetries}):`, error.message);
          
          // 等待指定时间后重试
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // 达到最大重试次数或不应该重试，抛出最终错误
          throw lastError;
        }
      }
    }
    
    // 这种情况理论上不会到达，但为了TypeScript类型安全
    throw lastError || new Error('请求失败，未知原因');
  }
  
  // 判断是否应该重试
  private shouldRetry(error: AxiosError): boolean {
    // 网络错误总是重试
    if (!error.response) {
      return true;
    }
    
    // 检查HTTP状态码是否在可重试列表中
    const statusCode = error.response.status;
    return this.retryConfig.retryableStatusCodes.includes(statusCode);
  }
  
  // 计算重试延迟时间
  private calculateRetryDelay(attempt: number): number {
    if (this.retryConfig.exponentialBackoff) {
      // 指数退避: 基础延迟 * (2 ^ (尝试次数 - 1))
      return this.retryConfig.retryDelay * Math.pow(2, attempt - 1);
    } else {
      // 固定延迟
      return this.retryConfig.retryDelay;
    }
  }
  
  // 检查缓存是否有效
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.requestCache.get(cacheKey);
    if (!cached) return false;
    
    const isNotExpired = Date.now() - cached.timestamp < this.CACHE_DURATION;
    return isNotExpired;
  }
  
  // 清理过期缓存
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.requestCache.delete(key);
      }
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

  // 存储用户信息
  private setUser(user: UserInfo): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  // 获取用户信息
  public getUser(): UserInfo | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  // 检查是否已登录
  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // 登录
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // 登录请求不使用缓存和重试（避免重复创建会话）
    try {
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        this.setToken(token);
        this.setUser(user);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      throw this.enhanceError(error as AxiosError);
    }
  }

  // 注册
  public async register(data: RegisterData): Promise<AuthResponse> {
    // 注册请求不使用缓存和重试
    try {
      const response = await this.axiosInstance.post<ApiResponse<AuthResponse>>('/auth/register', data);
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        this.setToken(token);
        this.setUser(user);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      throw this.enhanceError(error as AxiosError);
    }
  }

  // 登出
  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // 清空缓存
    this.requestCache.clear();
    this.pendingRequests.clear();
  }

  // 获取医院列表（使用缓存和重试）
  public async getHospitals(params?: any): Promise<any[]> {
    try {
      return await this.requestWithRetry<any[]>('get', '/hospitals', { params });
    } catch (error) {
      console.error('Failed to get hospitals:', error);
      return [];
    }
  }

  // 获取陪诊师列表（使用缓存和重试）
  public async getEscorts(params?: any): Promise<any[]> {
    try {
      return await this.requestWithRetry<any[]>('get', '/escorts', { params });
    } catch (error) {
      console.error('Failed to get escorts:', error);
      return [];
    }
  }

  // 获取推荐服务（使用缓存和重试）
  public async getRecommendedServices(params?: any): Promise<any[]> {
    try {
      return await this.requestWithRetry<any[]>('get', '/services/recommended', { params });
    } catch (error) {
      console.error('Failed to get recommended services:', error);
      return [];
    }
  }

  // 获取附近陪诊师（使用缓存和重试）
  public async getNearbyEscorts(latitude: number, longitude: number, radius?: number): Promise<any[]> {
    try {
      return await this.requestWithRetry<any[]>('get', '/escorts/nearby', {
        params: { latitude, longitude, radius },
      });
    } catch (error) {
      console.error('Failed to get nearby escorts:', error);
      return [];
    }
  }

  // 创建预约
  public async createAppointment(data: any): Promise<any> {
    try {
      return await this.requestWithRetry<any>('post', '/appointments', { data });
    } catch (error) {
      console.error('Failed to create appointment:', error);
      throw error;
    }
  }

  // 获取用户预约列表（使用缓存和重试）
  public async getUserAppointments(): Promise<any[]> {
    try {
      return await this.requestWithRetry<any[]>('get', '/appointments/user');
    } catch (error) {
      console.error('Failed to get user appointments:', error);
      return [];
    }
  }
  
  // 清除特定API的缓存
  public clearCacheForEndpoint(endpoint: string): void {
    for (const key of this.requestCache.keys()) {
      if (key.includes(endpoint)) {
        this.requestCache.delete(key);
      }
    }
  }
  
  // 清除所有缓存
  public clearAllCache(): void {
    this.requestCache.clear();
  }
}

// 创建并导出单例实例，可传入自定义重试配置
export const apiServiceWithRetry = new ApiServiceWithRetry();

// 导出一个可配置的工厂函数，允许创建自定义配置的实例
export const createApiServiceWithRetry = (retryConfig?: Partial<RetryConfig>) => {
  return new ApiServiceWithRetry(retryConfig);
};
