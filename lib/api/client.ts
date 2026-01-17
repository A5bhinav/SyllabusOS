import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// Create axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Get auth token from Supabase session when auth is implemented
    // const session = await getSupabaseSession();
    // if (session?.access_token) {
    //   config.headers.Authorization = `Bearer ${session.access_token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle common error cases
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          // TODO: Handle redirect when auth is implemented
          console.error('Unauthorized - please log in');
          break;
        case 403:
          console.error('Forbidden - insufficient permissions');
          break;
        case 404:
          console.error('Resource not found');
          break;
        case 500:
          console.error('Server error - please try again later');
          break;
        default:
          console.error('API error:', data?.message || error.message);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network error - please check your connection');
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Generic API request wrapper
export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error) {
    // Error is already handled by interceptor, just rethrow
    throw error;
  }
}

export default apiClient;
