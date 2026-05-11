import axios from 'axios';

// In dev, leave baseURL relative so Vite's proxy in vite.config.js handles it.
// In prod, set VITE_API_URL to your backend origin (e.g. https://medizen-api.onrender.com).
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      // Token expired — clear and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) =>
    api.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Chat
export const chatAPI = {
  publicMessage: (content) => api.post('/chat/public', { content }),
  getSessions: () => api.get('/chat/sessions'),
  createSession: (title) => api.post('/chat/sessions', { title }),
  getMessages: (sessionId) => api.get(`/chat/sessions/${sessionId}/messages`),
  sendMessage: (content, sessionId) => api.post('/chat/message', { content, session_id: sessionId }),
  deleteSession: (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
};

// Analysis
export const analyzeAPI = {
  image: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/analyze/image', fd);
  },
  prescription: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/analyze/prescription', fd);
  },
  report: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/analyze/report', fd);
  },
  history: () => api.get('/analyze/history'),
  getUpload: (id) => api.get(`/analyze/history/${id}`),
  deleteUpload: (id) => api.delete(`/analyze/history/${id}`),
  clearHistory: () => api.delete('/analyze/history'),
};

// Donors
export const donorAPI = {
  search: (params) => api.get('/donors', { params }),
  register: (data) => api.post('/donors/register', data),
  myProfile: () => api.get('/donors/me'),
  update: (data) => api.put('/donors/me', data),
  getById: (id) => api.get(`/donors/${id}`),
};

// Nearby
export const nearbyAPI = {
  get: (params) => api.get('/nearby', { params }),
  getById: (id) => api.get(`/nearby/${id}`),
};

// Medicines — uses medicines.csv as single source of truth
export const medicinesAPI = {
  search: (params) => api.get('/medicines', { params }),
  lookup: (q) => api.get('/medicines/lookup', { params: { q } }),
  info: (brandName) => api.get(`/medicines/info/${encodeURIComponent(brandName)}`),
  dosageForms: () => api.get('/medicines/dosage-forms'),
};
