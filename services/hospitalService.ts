/**
 * Hospital Service
 * Hospital related API calls
 */
import { axiosInstance, extractPayload } from './baseApiClient';
import { ApiResponse, Hospital, HospitalSearchParams, SearchSuggestion, PaginatedResponse } from '../types';

// Get hospitals list
export async function getHospitals(params?: HospitalSearchParams): Promise<Hospital[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<Hospital[]>>('/hospitals', { params });
    return response.data.success && response.data.data ? response.data.data : [];
  } catch (error) {
    console.error('Failed to get hospitals:', error);
    return [];
  }
}

// Get hospital details
export async function getHospitalById(hospitalId: string): Promise<any> {
  const response = await axiosInstance.get<ApiResponse<any>>(`/hospitals/${hospitalId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'Failed to get hospital');
}

// Search hospitals with pagination
export async function searchHospitals(params?: HospitalSearchParams): Promise<PaginatedResponse<Hospital>> {
  const response = await axiosInstance.get<ApiResponse<PaginatedResponse<Hospital>>>('/hospitals', { params });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
}

// Get hospital search suggestions
export async function getHospitalSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
  const response = await axiosInstance.get<ApiResponse<SearchSuggestion[]>>('/hospitals/suggestions', {
    params: { q: query, limit },
  });
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}

// Get popular hospitals
export async function getPopularHospitals(limit: number = 10): Promise<Hospital[]> {
  const response = await axiosInstance.get<ApiResponse<Hospital[]> | Hospital[]>('/hospitals/popular', {
    params: { limit },
  });
  return extractPayload<Hospital[]>(response.data) || [];
}

// Get all departments
export async function getDepartments(): Promise<string[]> {
  const response = await axiosInstance.get<ApiResponse<string[]>>('/hospitals/departments');
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  return [];
}
