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

class ApiService {
  private axiosInstance: AxiosInstance;
  private readonly TOKEN_KEY = 'medimate_auth_token';
  private readonly USER_KEY = 'medimate_user';

  constructor() {
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
      (error: AxiosError<ApiResponse>): Promise<AxiosError> => {
        // 统一错误处理
        if (error.response) {
          // 服务器返回错误状态码
          console.error('API Error:', error.response.data);
          
          // 处理401未授权错误
          if (error.response.status === 401) {
            this.logout();
            // 可以在这里添加重定向到登录页的逻辑
          }
        } else if (error.request) {
          // 请求已发送但没有收到响应
          console.error('API Error: No response received', error.request);
        } else {
          // 请求配置错误
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
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
      throw error;
    }
  }

  // 注册
  public async register(data: RegisterData): Promise<AuthResponse> {
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
      throw error;
    }
  }

  // 登出
  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // 获取医院列表
  public async getHospitals(params?: any): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>('/hospitals', { params });
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get hospitals:', error);
      return [];
    }
  }

  // 获取陪诊师列表
  public async getEscorts(params?: any): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>('/escorts', { params });
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
  public async getNearbyEscorts(latitude: number, longitude: number, radius?: number): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>('/escorts/nearby', {
        params: { latitude, longitude, radius },
      });
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get nearby escorts:', error);
      return [];
    }
  }

  // 创建预约
  public async createAppointment(data: any): Promise<any> {
    try {
      const response = await this.axiosInstance.post<ApiResponse<any>>('/appointments', data);
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to create appointment');
      }
    } catch (error) {
      throw error;
    }
  }

  // 获取用户预约列表
  public async getUserAppointments(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get<ApiResponse<any[]>>('/appointments/user');
      return response.data.success && response.data.data ? response.data.data : [];
    } catch (error) {
      console.error('Failed to get user appointments:', error);
      return [];
    }
  }
}

// 创建并导出单例实例
export const apiService = new ApiService();
