import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const tokenStorage = {
  async get(key: string): Promise<string | null> {
    try {
      const SecureStore = await import('expo-secure-store');
      if (typeof SecureStore.getItemAsync === 'function') {
        return await SecureStore.getItemAsync(key);
      }
    } catch {}
    return localStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    try {
      const SecureStore = await import('expo-secure-store');
      if (typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(key, value); return;
      }
    } catch {}
    localStorage.setItem(key, value);
  },
  async remove(key: string): Promise<void> {
    try {
      const SecureStore = await import('expo-secure-store');
      if (typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(key); return;
      }
    } catch {}
    localStorage.removeItem(key);
  },
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => { if (error) reject(error); else resolve(token!); });
  failedQueue = [];
};

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await tokenStorage.get('accessToken');
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); })
          .then((token) => { originalRequest.headers.Authorization = `Bearer ${token}`; return api(originalRequest); })
          .catch(Promise.reject);
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = await tokenStorage.get('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        await tokenStorage.set('accessToken', accessToken);
        await tokenStorage.set('refreshToken', newRefreshToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await tokenStorage.remove('accessToken');
        await tokenStorage.remove('refreshToken');
        return Promise.reject(refreshError);
      } finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login:            (username: string, password: string) => api.post('/auth/login', { username, password }),
  logout:           (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  refresh:          (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  register:         (data: any) => api.post('/auth/register', data),
  profile:          () => api.get('/auth/profile'),
  updateProfile:    (data: any) => api.put('/auth/profile', data),
  changePassword:   (data: any) => api.post('/auth/change-password', data),
  forgotPassword:   (data: any) => api.post('/auth/forgot-password', data),
  resetPassword:    (data: any) => api.post('/auth/reset-password', data),
  getStaff:         (params?: any) => api.get('/auth/users', { params }),
  // 2FA
  sendOtp:          (data: any) => api.post('/auth/otp/send', data),
  verifyOtp:        (data: any) => api.post('/auth/otp/verify', data),
  // Sessions
  getSessions:      () => api.get('/auth/sessions'),
  revokeSession:    (id: string) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions:() => api.delete('/auth/sessions'),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard'),
};

export const customerApi = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getOne: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

export const vehicleApi = {
  getAll: (params?: any) => api.get('/vehicles', { params }),
  create: (data: any) => api.post('/vehicles', data),
  getServices: (params?: any) => api.get('/vehicles/services', { params }),
  createService: (data: any) => api.post('/vehicles/services', data),
  updateServiceStatus: (id: string, data: any) => api.patch(`/vehicles/services/${id}/status`, data),
};

export const stockApi = {
  getAll:          (params?: any)              => api.get('/stock', { params }),
  create:          (data: any)                 => api.post('/stock', data),
  createWithImage: (formData: FormData)        => api.post('/stock', formData, {
    headers: { 'Content-Type': undefined }, // Let React Native set boundary automatically
    transformRequest: (d: any) => d,        // Skip JSON.stringify for FormData
  }),
  update:          (id: string, data: any)     => api.put(`/stock/${id}`, data),
  updateWithImage: (id: string, formData: FormData) => api.put(`/stock/${id}`, formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: (d: any) => d,
  }),
  delete:          (id: string)                => api.delete(`/stock/${id}`),
  adjust:          (id: string, data: any)     => api.patch(`/stock/${id}/adjust`, data),
};

export const invoiceApi = {
  getAll: (params?: any) => api.get('/invoices', { params }),
  create: (data: any) => api.post('/invoices', data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  recordPayment: (id: string, data: any) => api.post(`/invoices/${id}/payment`, data),
};

export const appointmentApi = {
  getAll: (params?: any) => api.get('/appointments', { params }),
  create: (data: any) => api.post('/appointments', data),
  update: (id: string, data: any) => api.patch(`/appointments/${id}`, data),
  getActivityLogs: (params?: any) => api.get('/appointments/activity-logs', { params }),
};

export const scheduleApi = {
  getAll:  (params?: any)          => api.get('/schedules', { params }),
  create:  (data: any)             => api.post('/schedules', data),
  update:  (id: string, data: any) => api.patch(`/schedules/${id}`, data),
  delete:  (id: string)            => api.delete(`/schedules/${id}`),
};

export default api;
