import axios from 'axios';

// Normalize API URL to guarantee it ends with /api without trailing slashes
const rawEnvUrl = import.meta.env.VITE_API_URL || 'http://localhost:8085/api';
let cleanUrl = rawEnvUrl.trim().replace(/\/+$/, '');
if (!cleanUrl.endsWith('/api')) {
  cleanUrl += '/api';
}
const API_URL = cleanUrl;

console.log('[SyncTask API] Configured Base API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for Render cold-starts
});

// Request interceptor to add JWT token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authorization failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const isAuthRequest = error.config && error.config.url && error.config.url.includes('/auth/');
      if (!isAuthRequest) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  register: async (username, email, password) => {
    const response = await api.post('/auth/register', { username, email, password });
    return response.data;
  },
  sendOtp: async (username) => {
    const response = await api.post('/auth/forgot-password/send-otp', { username });
    return response.data;
  },
  resetPassword: async (username, otp, newPassword) => {
    const response = await api.post('/auth/forgot-password/reset', { username, otp, newPassword });
    return response.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
  updateProfile: async (newUsername) => {
    const response = await api.post('/auth/update-profile', { newUsername });
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        u.username = response.data.username || newUsername;
        localStorage.setItem('user', JSON.stringify(u));
      }
    }
    return response.data;
  },
  googleAuth: async (credential) => {
    const response = await api.post('/auth/google', { credential });
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },
  deleteAccount: async () => {
    const response = await api.delete('/auth/delete-account');
    return response.data;
  },
  notifyAction: async (action, username) => {
    const response = await api.post('/auth/notify-action', { action, username });
    return response.data;
  },
  logout: () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        api.post('/auth/notify-action', { action: 'Sign Out / Logout', username: u.username });
      } catch (e) {}
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
};

// Task endpoints
export const taskService = {
  getAllTasks: async () => {
    const response = await api.get('/tasks');
    return response.data;
  },
  getTaskById: async (id) => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },
  updateTask: async (id, taskData) => {
    const response = await api.put(`/tasks/${id}`, taskData);
    return response.data;
  },
  deleteTask: async (id) => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  }
};

// AI Suggestion endpoint
export const aiService = {
  getSuggestions: async (title) => {
    const response = await api.get('/ai/suggest', { params: { title } });
    return response.data;
  },
  getSummary: async () => {
    const response = await api.get('/ai/summary');
    return response.data;
  }
};

// Blockchain Ledger Audit endpoints
export const auditService = {
  getLedger: async () => {
    const response = await api.get('/audit');
    return response.data;
  },
  verifyLedger: async () => {
    const response = await api.get('/audit/verify');
    return response.data;
  },
  repairLedger: async () => {
    const response = await api.post('/audit/repair');
    return response.data;
  }
};

export default api;
