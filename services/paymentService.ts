/**
 * Payment Service
 * Payment and refund related API calls
 */
import { axiosInstance, extractPayload } from './baseApiClient';
import { ApiResponse } from '../types';

// Create Stripe payment intent
export async function createStripePaymentIntent(orderId: string, currency?: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const response = await axiosInstance.post<ApiResponse<{ clientSecret: string; paymentIntentId: string }> | { clientSecret: string; paymentIntentId: string }>('/payments/stripe/create-intent', {
    orderId,
    currency: currency || 'cny',
  });
  const payload = extractPayload<{ clientSecret: string; paymentIntentId: string }>(response.data);
  if (payload) {
    return payload;
  }
  throw new Error((response.data as ApiResponse<{ clientSecret: string; paymentIntentId: string }>).message || 'Failed to create payment intent');
}

// Confirm Stripe payment
export async function confirmStripePayment(paymentIntentId: string): Promise<{ success: boolean; orderId: string }> {
  const response = await axiosInstance.post<ApiResponse<{ success: boolean; orderId: string }> | { success: boolean; orderId: string }>('/payments/stripe/confirm', {
    paymentIntentId,
  });
  const payload = extractPayload<{ success: boolean; orderId: string }>(response.data);
  if (payload) {
    return payload;
  }
  throw new Error((response.data as ApiResponse<{ success: boolean; orderId: string }>).message || 'Failed to confirm payment');
}

// Create WeChat payment order
export async function createWechatPayment(orderId: string): Promise<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }> {
  const response = await axiosInstance.post<ApiResponse<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }> | { wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>('/payments/wechat/create-order', {
    orderId,
  });
  const payload = extractPayload<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>(response.data);
  if (payload) {
    return payload;
  }
  throw new Error((response.data as ApiResponse<{ wechatOrderId: string; qrCodeUrl: string; codeUrl?: string }>).message || 'Failed to create WeChat payment');
}

// Query WeChat payment status
export async function queryWechatPayment(orderId: string): Promise<any> {
  try {
    const response = await axiosInstance.get<ApiResponse<any> | any>(`/payments/wechat/query/${orderId}`);
    return extractPayload<any>(response.data);
  } catch (error) {
    console.error('Failed to query WeChat payment:', error);
    return null;
  }
}

// Get payment by order ID
export async function getPaymentByOrderId(orderId: string): Promise<any> {
  try {
    const response = await axiosInstance.get<ApiResponse<any> | any>(`/payments/${orderId}`);
    return extractPayload<any>(response.data);
  } catch (error) {
    console.error('Failed to get payment:', error);
    return null;
  }
}

// Request refund (Legacy)
export async function requestRefund(paymentId: string, amount?: number): Promise<{ success: boolean; refundedAmount: number }> {
  const response = await axiosInstance.post<ApiResponse<{ success: boolean; refundedAmount: number }>>('/payments/refund', {
    paymentId,
    amount,
  });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to process refund');
}

// Create refund request
export async function createRefund(data: {
  orderId: string;
  reason: string;
  reasonType?: string;
  description?: string;
  amount?: number;
}): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>('/payments/refunds', data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to create refund request');
}

// Get my refunds
export async function getMyRefunds(page = 1, limit = 20): Promise<any> {
  try {
    const response = await axiosInstance.get<ApiResponse<any>>(`/payments/refunds/my?page=${page}&limit=${limit}`);
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
export async function getRefund(refundId: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/payments/refunds/${refundId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get refund details');
}

// Get refund status
export async function getRefundStatus(refundId: string): Promise<any> {
  return getRefund(refundId);
}
