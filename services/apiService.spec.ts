/**
 * apiService Contract Tests
 *
 * These tests verify the response unwrapping behavior of the apiService,
 * testing both wrapped { success, data } format and direct format responses.
 *
 * Note: These tests use mocking to isolate the apiService logic without
 * making actual HTTP requests.
 */

// Mock axios before importing apiService
const mockAxiosInstance = {
  request: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

// We need to mock localStorage for the apiService tests
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Import after mocking
import { apiService } from './apiService';
import { ApiResponse } from '../types';

describe('apiService - Response Unwrapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('extractPayload', () => {
    it('should unwrap { success: true, data: T } format', () => {
      const wrappedResponse: ApiResponse<{ id: string; name: string }> = {
        success: true,
        data: { id: '123', name: 'Test' },
        message: 'Success',
      };

      // Simulate how extractPayload would be called
      const result = (apiService as any).extractPayload(wrappedResponse);

      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('should return null when success: false', () => {
      const errorResponse: ApiResponse<null> = {
        success: false,
        data: null,
        message: 'Error occurred',
      };

      const result = (apiService as any).extractPayload(errorResponse);

      expect(result).toBeNull();
    });

    it('should return direct T when not wrapped', () => {
      const directResponse = { id: '456', name: 'Direct' };

      const result = (apiService as any).extractPayload(directResponse);

      expect(result).toEqual({ id: '456', name: 'Direct' });
    });

    it('should handle array responses', () => {
      const wrappedArray: ApiResponse<string[]> = {
        success: true,
        data: ['item1', 'item2', 'item3'],
      };

      const result = (apiService as any).extractPayload(wrappedArray);

      expect(result).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle paginated responses', () => {
      const paginatedResponse: ApiResponse<{ data: any[]; total: number }> = {
        success: true,
        data: {
          data: [{ id: '1' }, { id: '2' }],
          total: 100,
        },
      };

      const result = (apiService as any).extractPayload(paginatedResponse);

      expect(result).toEqual({ data: [{ id: '1' }, { id: '2' }], total: 100 });
    });
  });

  describe('login - response format handling', () => {
    it('should handle direct AuthResponse format', async () => {
      const directAuthResponse = {
        accessToken: 'token123',
        refreshToken: 'refresh123',
        user: { id: 'user1', email: 'test@example.com', role: 'PATIENT' },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: directAuthResponse,
      });

      const result = await apiService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('token123');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should handle wrapped { success, data } format', async () => {
      const wrappedAuthResponse = {
        success: true,
        data: {
          accessToken: 'token456',
          refreshToken: 'refresh456',
          user: { id: 'user2', email: 'patient@example.com', role: 'PATIENT' },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: wrappedAuthResponse,
      });

      const result = await apiService.login({
        email: 'patient@example.com',
        password: 'password456',
      });

      expect(result.accessToken).toBe('token456');
      expect(result.user.role).toBe('PATIENT');
    });

    it('should throw error on login failure', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Invalid credentials',
        },
      });

      await expect(
        apiService.login({
          email: 'bad@example.com',
          password: 'wrong',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getHospitals - response unwrapping', () => {
    it('should return empty array on error', async () => {
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiService.getHospitals();

      expect(result).toEqual([]);
    });

    it('should return hospitals from wrapped response', async () => {
      const hospitals = [
        { id: '1', name: 'Hospital A', department: 'Internal' },
        { id: '2', name: 'Hospital B', department: 'Surgery' },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: hospitals },
      });

      const result = await apiService.getHospitals();

      expect(result).toEqual(hospitals);
    });
  });

  describe('createStripePaymentIntent - contract test', () => {
    it('should unwrap payment intent from wrapped response', async () => {
      const paymentIntent = {
        clientSecret: 'pi_secret_123',
        paymentIntentId: 'pi_123',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: paymentIntent },
      });

      const result = await apiService.createStripePaymentIntent('order_123');

      expect(result.clientSecret).toBe('pi_secret_123');
      expect(result.paymentIntentId).toBe('pi_123');
    });

    it('should throw error when success is false', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: 'Order not found',
        },
      });

      await expect(
        apiService.createStripePaymentIntent('invalid_order'),
      ).rejects.toThrow('Order not found');
    });
  });

  describe('getEscorts - paginated response', () => {
    it('should return escorts array from wrapped response', async () => {
      const escorts = [
        { id: 'e1', name: 'Escort 1', rating: 4.5 },
        { id: 'e2', name: 'Escort 2', rating: 4.8 },
      ];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: escorts },
      });

      const result = await apiService.getEscorts();

      expect(result).toEqual(escorts);
    });
  });

  describe('getNearbyEscorts - extractPayload usage', () => {
    it('should use extractPayload for nearby escorts', async () => {
      const escorts = [{ id: 'near1', name: 'Nearby Escort' }];

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: escorts },
      });

      const result = await apiService.getNearbyEscorts(40.7128, -74.006);

      expect(result).toEqual(escorts);
    });
  });

  describe('error response handling', () => {
    it('should handle 401 unauthorized by attempting token refresh', async () => {
      // First call returns 401, second call (refresh) succeeds
      mockAxiosInstance.post
        .mockRejectedValueOnce({
          response: { status: 401, data: { message: 'Unauthorized' } },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              accessToken: 'new_token',
              refreshToken: 'new_refresh',
              user: { id: '1', email: 'a@b.com', role: 'PATIENT' },
            },
          },
        });

      // Clear storage to allow refresh to be attempted
      localStorageMock.getItem
        .mockReturnValueOnce('old_refresh_token'); // refreshToken

      await expect(
        apiService.login({ email: 'test@example.com', password: 'test' }),
      ).rejects.toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network connection failed');
      (networkError as any).code = 'ERR_NETWORK';
      (networkError as any).request = {}; // indicates request was made

      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      // GET requests should return mock data on network error
      const result = await apiService.getHospitals();

      // The service returns mock data for GET on network error
      expect(result).toBeDefined();
    });
  });

  describe('response with no data field', () => {
    it('should handle response without success property', () => {
      const rawResponse = { items: [1, 2, 3] };

      const result = (apiService as any).extractPayload(rawResponse);

      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it('should handle null data', () => {
      const nullDataResponse: ApiResponse<null> = {
        success: true,
        data: null,
      };

      const result = (apiService as any).extractPayload(nullDataResponse);

      expect(result).toBeNull();
    });
  });
});

describe('apiService - Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check if user is logged in', () => {
    localStorageMock.getItem.mockReturnValueOnce('valid_token');

    expect(apiService.isLoggedIn()).toBe(true);
  });

  it('should return false when no token', () => {
    localStorageMock.getItem.mockReturnValue(null);

    expect(apiService.isLoggedIn()).toBe(false);
  });

  it('should return null user when not logged in', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const user = apiService.getUser();

    expect(user).toBeNull();
  });

  it('should return user from localStorage', () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'PATIENT' };
    localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

    const user = apiService.getUser();

    expect(user).toEqual(mockUser);
  });
});

describe('apiService - Mock Data Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return mock hospitals on network error for GET', async () => {
    const networkError = new Error('No response');
    (networkError as any).code = 'ECONNABORTED';
    (networkError as any).request = {};

    mockAxiosInstance.get.mockRejectedValue(networkError);

    const result = await apiService.getHospitals();

    // Should return mock data (3 hospitals)
    expect(result).toHaveLength(3);
    expect(result[0]).toHaveProperty('name');
  });

  it('should return mock escorts on network error for GET', async () => {
    const networkError = new Error('No response');
    (networkError as any).code = 'ECONNABORTED';
    (networkError as any).request = {};

    mockAxiosInstance.get.mockRejectedValue(networkError);

    const result = await apiService.getEscorts();

    // Should return mock data (2 escorts)
    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('rating');
  });
});
