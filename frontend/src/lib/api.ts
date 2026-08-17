import axios from 'axios';
import { supabase } from './supabase';

let rawBase = (import.meta.env.VITE_API_BASE_URL as string) || '/api';
rawBase = rawBase.replace(/\/+$/, '');
if ((rawBase.startsWith('http://') || rawBase.startsWith('https://')) && !rawBase.endsWith('/api')) {
  rawBase = `${rawBase}/api`;
}
const BASE = rawBase;

const api = axios.create({ baseURL: BASE });

// Attach Supabase auth token to all requests
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
});

export default api;

// --- Typed API helpers ---

export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data),
  update: (updates: Record<string, string>) => api.put('/settings', { updates }).then(r => r.data),
};

export const membersApi = {
  list: () => api.get('/members').then(r => r.data),
  create: (data: object) => api.post('/members', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/members/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/members/${id}`),
  getUploadUrl: () => api.post('/members/upload-url').then(r => r.data),
};

export const albumsApi = {
  list: () => api.get('/albums').then(r => r.data),
  get: (id: string) => api.get(`/albums/${id}`).then(r => r.data),
  create: (data: object) => api.post('/albums', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/albums/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  addPhoto: (albumId: string, data: object) => api.post(`/albums/${albumId}/photos`, data).then(r => r.data),
  deletePhoto: (albumId: string, photoId: string) => api.delete(`/albums/${albumId}/photos/${photoId}`),
  getUploadUrl: () => api.post('/albums/upload-url').then(r => r.data),
};

export const auditApi = {
  list: () => api.get('/audit-docs').then(r => r.data),
  create: (data: object) => api.post('/audit-docs', data).then(r => r.data),
  delete: (id: string) => api.delete(`/audit-docs/${id}`),
  getUploadUrl: () => api.post('/audit-docs/upload-url').then(r => r.data),
};

export const donationsApi = {
  totals: () => api.get('/donations/totals').then(r => r.data),
  submit: (data: object) => api.post('/donations', data).then(r => r.data),
  list: () => api.get('/donations').then(r => r.data),
  updateStatus: (id: string, status: 'verified' | 'rejected') =>
    api.patch(`/donations/${id}/status`, { status }).then(r => r.data),
  recordScreenshot: (id: string, screenshot_url: string) =>
    api.patch(`/donations/${id}/screenshot-url`, { screenshot_url }).then(r => r.data),
};

export const contactApi = {
  submit: (data: object) => api.post('/contact', data).then(r => r.data),
  list: () => api.get('/contact').then(r => r.data),
  markRead: (id: string) => api.patch(`/contact/${id}/read`),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then(r => r.data),
  listAdmins: () => api.get('/admin/admins').then(r => r.data),
  addAdmin: (data: object) => api.post('/admin/admins', data).then(r => r.data),
  removeAdmin: (id: string) => api.delete(`/admin/admins/${id}`),
  me: () => api.get('/admin/me').then(r => r.data),
};
