import axios from 'axios';
import { supabase, isSupabaseConfigured } from './supabase';

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
  get: async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && Object.keys(res.data).length > 0) return res.data;
    } catch (e) {
      console.warn('Backend settings get failed, trying Supabase directly', e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('settings').select('*');
        if (Array.isArray(data)) {
          return Object.fromEntries(data.map((r: any) => [r.key, r.value]));
        }
      } catch {}
    }
    return {};
  },
  update: (updates: Record<string, string>) => api.put('/settings', { updates }).then(r => r.data),
};

export const membersApi = {
  list: async () => {
    try {
      const res = await api.get('/members');
      if (Array.isArray(res.data)) return res.data;
    } catch (e) {
      console.warn('Backend members list failed, trying Supabase directly', e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('members').select('*').order('display_order');
        if (Array.isArray(data)) return data;
      } catch {}
    }
    return [];
  },
  create: (data: object) => api.post('/members', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/members/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/members/${id}`),
  getUploadUrl: () => api.post('/members/upload-url').then(r => r.data),
};

export const albumsApi = {
  list: async () => {
    try {
      const res = await api.get('/albums');
      if (Array.isArray(res.data)) return res.data;
    } catch (e) {
      console.warn('Backend albums list failed, trying Supabase directly', e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('albums').select('*').order('visit_date', { ascending: false });
        if (Array.isArray(data)) return data;
      } catch {}
    }
    return [];
  },
  get: async (id: string) => {
    try {
      const res = await api.get(`/albums/${id}`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`Backend album ${id} failed, trying Supabase directly`, e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data: album } = await supabase.from('albums').select('*').eq('id', id).single();
        if (album) {
          const { data: photos } = await supabase.from('album_photos').select('*').eq('album_id', id);
          return { ...album, photos: photos || [] };
        }
      } catch {}
    }
    return null;
  },
  create: (data: object) => api.post('/albums', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/albums/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  addPhoto: (albumId: string, data: object) => api.post(`/albums/${albumId}/photos`, data).then(r => r.data),
  deletePhoto: (albumId: string, photoId: string) => api.delete(`/albums/${albumId}/photos/${photoId}`),
  getUploadUrl: () => api.post('/albums/upload-url').then(r => r.data),
};

export const auditApi = {
  list: async () => {
    try {
      const res = await api.get('/audit-docs');
      if (Array.isArray(res.data)) return res.data;
    } catch (e) {
      console.warn('Backend audit-docs failed, trying Supabase directly', e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase.from('audit_docs').select('*').order('uploaded_at', { ascending: false });
        if (Array.isArray(data)) return data;
      } catch {}
    }
    return [];
  },
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
