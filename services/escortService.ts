/**
 * Escort Service
 * Escort (陪诊师) related API calls
 */
import { axiosInstance, extractPayload } from './baseApiClient';
import { ApiResponse, EscortProfile, EscortSearchParams, SearchSuggestion, PaginatedResponse } from '../types';

// Get escorts list
export async function getEscorts(params?: { latitude?: number; longitude?: number; rating?: number }): Promise<EscortProfile[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<EscortProfile[]>>('/escorts', { params });
    return response.data.success && response.data.data ? response.data.data : [];
  } catch (error) {
    console.error('Failed to get escorts:', error);
    return [];
  }
}

// Get nearby escorts
export async function getNearbyEscorts(latitude: number, longitude: number, radius?: number): Promise<EscortProfile[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<EscortProfile[]> | EscortProfile[]>('/escorts/nearby', {
      params: { latitude, longitude, radius },
    });
    return extractPayload<EscortProfile[]>(response.data) || [];
  } catch (error) {
    console.error('Failed to get nearby escorts:', error);
    return [];
  }
}

// Get available escorts
export async function getAvailableEscorts(params?: { latitude?: number; longitude?: number; rating?: number }): Promise<EscortProfile[]> {
  return getEscorts(params);
}

// Search escorts with pagination
export async function searchEscorts(params?: EscortSearchParams): Promise<PaginatedResponse<EscortProfile>> {
  const response = await axiosInstance.get<ApiResponse<PaginatedResponse<EscortProfile>>>('/escorts', { params });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
}

// Get escort search suggestions
export async function getEscortSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
  const response = await axiosInstance.get<ApiResponse<SearchSuggestion[]>>('/escorts/suggestions', {
    params: { q: query, limit },
  });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Get popular escorts
export async function getPopularEscorts(limit: number = 10): Promise<EscortProfile[]> {
  const response = await axiosInstance.get<ApiResponse<EscortProfile[]> | EscortProfile[]>('/escorts/popular', {
    params: { limit },
  });
  return extractPayload<EscortProfile[]>(response.data) || [];
}

// Get all specialties
export async function getSpecialties(): Promise<string[]> {
  const response = await axiosInstance.get<ApiResponse<string[]>>('/escorts/specialties');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Get escort details
export async function getEscortById(escortId: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/escorts/${escortId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get escort details');
}

// Update escort location
export async function updateEscortLocation(latitude: number, longitude: number): Promise<any> {
  const response = await axiosInstance.post<ApiResponse<any>>('/escorts/location', { latitude, longitude });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to update location');
}

// Get recommended services - backend not implemented
export async function getRecommendedServices(_params?: any): Promise<any[]> {
  console.warn('[escortService] /services/recommended endpoint not implemented, returning empty array');
  return [];
}

// ========== ESCORT SERVICE PUBLISHING ==========

// Create escort service
export async function createEscortService(data: {
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
  const response = await axiosInstance.post<ApiResponse<any>>('/escorts/services', data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to create service');
}

// Get my escort services
export async function getMyEscortServices(): Promise<any[]> {
  const response = await axiosInstance.get<ApiResponse<any[]>>('/escorts/services/my');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Get all active services (for patients)
export async function getAllEscortServices(params?: {
  serviceType?: string;
  area?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<any>> {
  const response = await axiosInstance.get<ApiResponse<PaginatedResponse<any>>>('/escorts/services/all', { params });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
}

// Get service by ID
export async function getEscortServiceById(serviceId: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/escorts/services/${serviceId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get service');
}

// Update escort service
export async function updateEscortService(serviceId: string, data: Partial<{
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
  const response = await axiosInstance.patch<ApiResponse<any>>(`/escorts/services/${serviceId}`, data);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to update service');
}

// Toggle service status
export async function toggleEscortServiceStatus(serviceId: string): Promise<any> {
  const response = await axiosInstance.patch<ApiResponse<any>>(`/escorts/services/${serviceId}/toggle`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to toggle service status');
}

// Delete escort service
export async function deleteEscortService(serviceId: string): Promise<any> {
  const response = await axiosInstance.delete<ApiResponse<any>>(`/escorts/services/${serviceId}`);
  if (response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to delete service');
}

// Get service availability
export async function getServiceAvailability(serviceId: string, date: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/escorts/services/${serviceId}/availability`, {
    params: { date },
  });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get availability');
}
