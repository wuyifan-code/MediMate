/**
 * Order Service
 * Order and appointment related API calls
 */
import { axiosInstance, extractPayload } from './baseApiClient';
import { ApiResponse, Appointment, CreateOrderRequest, Order, OrderStatus, PaginatedResponse } from '../types';

// Create appointment/order
export async function createOrder(data: CreateOrderRequest): Promise<Appointment> {
  const response = await axiosInstance.post<ApiResponse<Appointment>>('/orders', data);
  const payload = extractPayload<Appointment>(response.data);
  if (payload) {
    return payload;
  }
  throw new Error(response.data.message || 'Failed to create appointment');
}

// Get user appointments (orders)
export async function getUserAppointments(): Promise<Appointment[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<Appointment[]>>('/orders');
    return response.data.success && response.data.data ? response.data.data : [];
  } catch (error) {
    console.error('Failed to get user appointments:', error);
    return [];
  }
}

// Get order details
export async function getOrderDetails(orderId: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/orders/${orderId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get order details');
}

// Get my orders (patient or escort)
export async function getMyOrders(params?: { status?: string; page?: number; limit?: number }): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const response = await axiosInstance.get<ApiResponse<any>>(`/orders?${queryParams}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
}

// Accept order (for escort)
export async function acceptOrder(orderId: string): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/accept`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to accept order');
}

// Cancel order
export async function cancelOrder(orderId: string, reason?: string): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/cancel`, { reason });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to cancel order');
}

// Start service (for escort)
export async function startService(orderId: string): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/start`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to start service');
}

// Complete service (for escort)
export async function completeService(orderId: string): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>(`/orders/${orderId}/complete`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to complete service');
}

// Update order
export async function updateOrder(orderId: string, data: { status?: string; notes?: string }): Promise<any> {
  const response = await axiosInstance.patch<ApiResponse<any>>(`/orders/${orderId}`, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to update order');
}

// Get orders by escort
export async function getOrdersByEscort(escortId: string, params?: { status?: string; page?: number; limit?: number }): Promise<any> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.limit) queryParams.append('limit', String(params.limit));

  const response = await axiosInstance.get<ApiResponse<any>>(`/orders/escort/${escortId}?${queryParams}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
}
