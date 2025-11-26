import axios, { AxiosInstance, AxiosError } from 'axios';
import { extractUserFromToken, isTokenExpired, KeycloakUser } from './keycloak';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Try to refresh the token
            const newAccessToken = await this.refreshAccessToken();
            
            // Update the failed request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            }
            
            // Retry the original request
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    // If a refresh is already in progress, wait for it
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data.data;

        // Store new tokens
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        localStorage.setItem('tokenExpiry', String(Date.now() + expiresIn * 1000));

        return accessToken;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('user');
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<KeycloakUser> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    });
    
    const { accessToken, refreshToken, expiresIn } = response.data.data;
    
    // Store tokens
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('tokenExpiry', String(Date.now() + expiresIn * 1000));
    
    // Extract user info from Keycloak JWT token
    const user = extractUserFromToken(accessToken);
    if (!user) {
      throw new Error('Failed to extract user information from token');
    }
    
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  }

  async logoutUser() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.logout();
    }
  }

  async getCurrentUser(): Promise<KeycloakUser | null> {
    const token = this.getAccessToken();
    if (!token) {
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(token)) {
      // Try to refresh
      try {
        await this.refreshAccessToken();
        const newToken = this.getAccessToken();
        if (newToken) {
          return extractUserFromToken(newToken);
        }
      } catch (error) {
        return null;
      }
    }

    // Extract user from current token
    return extractUserFromToken(token);
  }

  // Orders endpoints
  async getOrders(params?: any) {
    const response = await this.client.get('/orders', { params });
    return response.data.data;
  }

  async createOrder(orderData: any) {
    const response = await this.client.post('/orders', orderData);
    return response.data.data;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const response = await this.client.patch(`/orders/${orderId}/status`, { status });
    return response.data.data;
  }

  // Menus endpoints
  async getActiveMenus() {
    const response = await this.client.get('/menus/active');
    return response.data.data;
  }

  async getMenus() {
    const response = await this.client.get('/menus');
    return response.data.data;
  }

  // Products endpoints
  async getProducts() {
    const response = await this.client.get('/products');
    return response.data.data;
  }

  // Categories endpoints
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data.data;
  }
}

export const apiClient = new ApiClient();
export type { KeycloakUser };

