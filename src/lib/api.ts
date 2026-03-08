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
        const isLoginPage = window.location.pathname === '/login';

        // If error is 401 and we haven't retried yet AND we're not on login page
        if (error.response?.status === 401 && !originalRequest._retry && !isLoginPage) {
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

  async createCustomerOrder(orderData: any) {
    const response = await this.client.post('/orders/customer', orderData);
    return response.data.data;
  }

  async updateOrderStatus(orderId: string, status: number) {
    const response = await this.client.patch(`/orders/${orderId}/status`, { status });
    return response.data.data;
  }

  async getContableStats(params?: { dateFrom?: string; dateTo?: string; paymentMethod?: number; orderType?: number }) {
    const response = await this.client.get('/orders/stats/contable', { params });
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
  async getProducts(params?: any) {
    const response = await this.client.get('/products', { params });
    return response.data.data;
  }

  async getProduct(id: string) {
    const response = await this.client.get(`/products/${id}`);
    return response.data.data;
  }

  async createProduct(productData: any) {
    const response = await this.client.post('/products', productData);
    return response.data.data;
  }

  async updateProduct(id: string, productData: any) {
    const response = await this.client.put(`/products/${id}`, productData);
    return response.data.data;
  }

  async deleteProduct(id: string, reason?: string) {
    const response = await this.client.delete(`/products/${id}`, {
      data: { reason }
    });
    return response.data;
  }

  async toggleProductAvailability(id: string) {
    const response = await this.client.patch(`/products/${id}/availability`);
    return response.data.data;
  }

  // Categories endpoints
  async getCategories() {
    const response = await this.client.get('/categories');
    return response.data.data;
  }

  async getCategory(id: string) {
    const response = await this.client.get(`/categories/${id}`);
    return response.data.data;
  }

  async createCategory(categoryData: any) {
    const response = await this.client.post('/categories', categoryData);
    return response.data.data;
  }

  async updateCategory(id: string, categoryData: any) {
    const response = await this.client.put(`/categories/${id}`, categoryData);
    return response.data.data;
  }

  async deleteCategory(id: string, reason?: string) {
    const response = await this.client.delete(`/categories/${id}`, {
      data: { reason }
    });
    return response.data;
  }

  async restoreCategory(id: string) {
    const response = await this.client.patch(`/categories/${id}/restore`);
    return response.data.data;
  }

  async getDeletedCategories() {
    const response = await this.client.get('/categories/deleted');
    return response.data.data;
  }

  // Config endpoints
  async getPaymentMethods() {
    const response = await this.client.get('/config/payment-methods');
    return response.data.data;
  }

  async getOrderTypes() {
    const response = await this.client.get('/config/order-types');
    return response.data.data;
  }

  async getOrderStatuses() {
    const response = await this.client.get('/config/order-statuses');
    return response.data.data;
  }

  async getAllConfig() {
    const response = await this.client.get('/config/all');
    return response.data.data;
  }

  // Settings endpoints
  async getSettings() {
    const response = await this.client.get('/settings');
    return response.data.data;
  }

  async updateSettings(settingsData: any) {
    const response = await this.client.put('/settings', settingsData);
    return response.data.data;
  }

  // Daily Menu endpoints
  async getDailyMenus() {
    const response = await this.client.get('/daily-menus');
    return response.data;
  }

  async getUpcomingDailyMenus() {
    const response = await this.client.get('/daily-menus/upcoming');
    return response.data;
  }

  async getPaginatedDailyMenus(params: {
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
    status?: 'all' | 'past' | 'enabled' | 'disabled';
  }) {
    const response = await this.client.get('/daily-menus/paginated', { params });
    return response.data;
  }

  async getDailyMenuCategories() {
    const response = await this.client.get('/daily-menus/categories');
    return response.data;
  }

  async getDailyMenuGuarniciones() {
    const response = await this.client.get('/daily-menus/guarniciones');
    return response.data;
  }

  async getActiveMenuForToday() {
    const response = await this.client.get('/daily-menus/today');
    return response.data;
  }

  async getSegundoAvailability() {
    const response = await this.client.get('/daily-menus/today/availability');
    return response.data;
  }

  async getDailyMenuById(id: string) {
    const response = await this.client.get(`/daily-menus/${id}`);
    return response.data;
  }

  async getDailyMenuByDate(date: string) {
    const response = await this.client.get(`/daily-menus/date/${date}`);
    return response.data;
  }

  async createDailyMenu(menuData: any) {
    const response = await this.client.post('/daily-menus', menuData);
    return response.data;
  }

  async updateDailyMenu(id: string, menuData: any) {
    const response = await this.client.put(`/daily-menus/${id}`, menuData);
    return response.data;
  }

  async toggleDailyMenuEnabled(id: string) {
    const response = await this.client.patch(`/daily-menus/${id}/toggle`);
    return response.data;
  }

  async deleteDailyMenu(id: string, reason?: string) {
    const response = await this.client.delete(`/daily-menus/${id}`, {
      data: { reason }
    });
    return response.data;
  }

  async applyTodaysMenu() {
    const response = await this.client.post('/daily-menus/apply-today');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export type { KeycloakUser };

