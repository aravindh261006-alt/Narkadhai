import axios from 'axios';
import { supabase, isSupabaseConfigured } from './supabase';

let rawBase = (import.meta.env.VITE_API_BASE_URL as string) || '';
if (!rawBase || rawBase === '/api') {
  // If running in production browser on Vercel or custom domain and no explicit base URL is set, target Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    rawBase = 'https://narkadhai.onrender.com/api';
  } else {
    rawBase = '/api';
  }
}
rawBase = rawBase.replace(/\/+$/, '');
if ((rawBase.startsWith('http://') || rawBase.startsWith('https://')) && !rawBase.endsWith('/api')) {
  rawBase = `${rawBase}/api`;
}
const BASE = rawBase;

const api = axios.create({ baseURL: BASE });

// Attach Supabase auth token to all requests
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', `Bearer ${data.session.access_token}`);
      } else {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${data.session.access_token}`;
      }
    }
  } catch (err) {
    console.warn('Failed to attach Supabase session token:', err);
  }
  return config;
});

export default api;

// --- Typed API helpers ---

export const settingsApi = {
  get: async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) return res.data;
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
      if (res.data && typeof res.data === 'object') {
        if (Array.isArray(res.data.photos)) {
          res.data.photos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        }
        return res.data;
      }
    } catch (e) {
      console.warn(`Backend album ${id} failed, trying Supabase directly`, e);
    }
    if (isSupabaseConfigured) {
      try {
        const { data: album } = await supabase.from('albums').select('*').eq('id', id).single();
        if (album) {
          let photos: any[] = [];
          try {
            const { data } = await supabase
              .from('album_photos')
              .select('*')
              .eq('album_id', id)
              .order('display_order', { ascending: true })
              .order('created_at', { ascending: true });
            photos = data || [];
          } catch {
            const { data } = await supabase.from('album_photos').select('*').eq('album_id', id);
            photos = data || [];
          }
          photos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
          return { ...album, photos };
        }
      } catch {}
    }
    return null;
  },
  create: (data: object) => api.post('/albums', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/albums/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/albums/${id}`),
  addPhoto: (albumId: string, data: object) => api.post(`/albums/${albumId}/photos`, data).then(r => r.data),
  reorderPhotos: async (albumId: string, orderedPhotos: { id: string; display_order: number }[]) => {
    try {
      return await api.put(`/albums/${albumId}/photos/reorder`, {
        photos: orderedPhotos.map(p => ({ photo_id: p.id, display_order: p.display_order })),
      });
    } catch (err) {
      if (isSupabaseConfigured) {
        console.warn('Backend reorderPhotos failed, attempting direct Supabase update', err);
        await Promise.all(
          orderedPhotos.map(p =>
            supabase.from('album_photos').update({ display_order: p.display_order }).eq('id', p.id)
          )
        );
        return;
      }
      throw err;
    }
  },
  deletePhoto: async (albumId: string, photoId: string) => {
    try {
      return await api.delete(`/albums/${albumId}/photos/${photoId}`);
    } catch (err) {
      if (isSupabaseConfigured) {
        console.warn('Backend deletePhoto failed, attempting direct Supabase deletion', err);
        const { data: photo } = await supabase.from('album_photos').select('photo_url').eq('id', photoId).single();
        const { data: album } = await supabase.from('albums').select('cover_photo_url').eq('id', albumId).single();
        await supabase.from('album_photos').delete().eq('id', photoId);
        if (photo?.photo_url && album?.cover_photo_url && photo.photo_url === album.cover_photo_url) {
          const { data: remaining } = await supabase
            .from('album_photos')
            .select('photo_url, media_type')
            .eq('album_id', albumId)
            .order('created_at', { ascending: true });
          const nextImg = (remaining || []).find(r => r.media_type !== 'video')?.photo_url || (remaining || [])[0]?.photo_url || null;
          await supabase.from('albums').update({ cover_photo_url: nextImg }).eq('id', albumId);
        }
        return;
      }
      throw err;
    }
  },
  getUploadUrl: () => api.post('/albums/upload-url').then(r => r.data),
};

export const donationsApi = {
  totals: () => api.get('/donations/totals').then(r => r.data),
  submit: (data: object) => api.post('/donations', data).then(r => r.data),
  list: () => api.get('/donations').then(r => r.data),
  updateStatus: (id: string, status: 'verified' | 'rejected') =>
    api.patch(`/donations/${id}/status`, { status }).then(r => r.data),
  recordScreenshot: (id: string, screenshot_url: string) =>
    api.patch(`/donations/${id}/screenshot-url`, { screenshot_url }).then(r => r.data),
  sendThankYou: (id: string, data: { to_email: string; subject: string; body: string }) =>
    api.post(`/donations/${id}/send-thank-you`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/donations/${id}`),
};

export const communityMessagesApi = {
  listApproved: () => api.get('/community-messages/approved').then(r => r.data),
  submit: (data: { name: string; message: string; website?: string }) =>
    api.post('/community-messages', data).then(r => r.data),
  listAll: () => api.get('/community-messages').then(r => r.data),
  updateStatus: (id: string, is_approved: boolean) =>
    api.patch(`/community-messages/${id}/status`, { is_approved }).then(r => r.data),
  delete: (id: string) => api.delete(`/community-messages/${id}`),
};

export const contactApi = {
  submit: (data: object) => api.post('/contact', data).then(r => r.data),
  list: () => api.get('/contact').then(r => r.data),
  markRead: (id: string) => api.patch(`/contact/${id}/read`).then(r => r.data),
  delete: (id: string) => api.delete(`/contact/${id}`),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard').then(r => r.data),
  listAdmins: () => api.get('/admin/admins').then(r => r.data),
  addAdmin: (data: object) => api.post('/admin/admins', data).then(r => r.data),
  removeAdmin: (id: string) => api.delete(`/admin/admins/${id}`),
  me: () => api.get('/admin/me').then(r => r.data),
  verifyAccess: () => api.get('/admin/verify-access').then(r => r.data),
  checkAuthorized: async (email: string): Promise<{ authorized: boolean; role?: string }> => {
    try {
      const res = await api.post('/admin/check-authorized', { email });
      return res.data;
    } catch (e) {
      console.warn('Backend check-authorized call failed, attempting Supabase fallback if available', e);
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase.rpc('is_admin_authorized', { check_email: email });
          if (!error && typeof data === 'boolean') {
            return { authorized: data };
          }
        } catch {}
      }
      return { authorized: false };
    }
  },
  changeEmail: (new_email: string) => api.post('/admin/change-email', { new_email }).then(r => r.data),
  changePassword: (new_password: string) => api.post('/admin/change-password', { new_password }).then(r => r.data),
};
