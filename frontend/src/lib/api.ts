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

// Backend API client with 5-second timeout to avoid waiting on Render cold starts
const api = axios.create({ baseURL: BASE, timeout: 5000 });

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

// --- Storage & TTL Cache Helpers ---

const SETTINGS_CACHE_KEY = 'narkadhai_settings_cache';
const MEMBERS_CACHE_KEY = 'narkadhai_members_cache';
const ALBUMS_CACHE_KEY = 'narkadhai_albums_cache';

// Cache TTLs
const SETTINGS_TTL = 5 * 60 * 1000; // 5 minutes
const MEMBERS_TTL = 10 * 60 * 1000; // 10 minutes
const ALBUMS_TTL = 5 * 60 * 1000;   // 5 minutes

function readStorageCache<T>(key: string, ttl: number): T | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.timestamp === 'number' && Date.now() - parsed.timestamp < ttl) {
      return parsed.data as T;
    }
  } catch (e) {
    console.warn(`Failed to read cache for ${key}:`, e);
  }
  return null;
}

function writeStorageCache<T>(key: string, data: T) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    }
  } catch (e) {
    console.warn(`Failed to write cache for ${key}:`, e);
  }
}

function removeStorageCache(key: string) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
}

// In-memory cache mirrors storage for instant access
let cachedSettings: { data: Record<string, any>; timestamp: number } | null = null;
let cachedMembers: { data: any[]; timestamp: number } | null = null;
let cachedAlbums: { data: any[]; timestamp: number } | null = null;

export const clearSettingsCache = () => {
  cachedSettings = null;
  removeStorageCache(SETTINGS_CACHE_KEY);
};

export const clearMembersCache = () => {
  cachedMembers = null;
  removeStorageCache(MEMBERS_CACHE_KEY);
};

export const clearAlbumsCache = () => {
  cachedAlbums = null;
  removeStorageCache(ALBUMS_CACHE_KEY);
};

export const getCachedSettings = (): Record<string, any> | null => {
  if (cachedSettings && Date.now() - cachedSettings.timestamp < SETTINGS_TTL) {
    return cachedSettings.data;
  }
  const fromStorage = readStorageCache<Record<string, any>>(SETTINGS_CACHE_KEY, SETTINGS_TTL);
  if (fromStorage) {
    cachedSettings = { data: fromStorage, timestamp: Date.now() };
    return fromStorage;
  }
  return null;
};

export const getCachedMembers = (): any[] | null => {
  if (cachedMembers && Date.now() - cachedMembers.timestamp < MEMBERS_TTL) {
    return cachedMembers.data;
  }
  const fromStorage = readStorageCache<any[]>(MEMBERS_CACHE_KEY, MEMBERS_TTL);
  if (fromStorage) {
    cachedMembers = { data: fromStorage, timestamp: Date.now() };
    return fromStorage;
  }
  return null;
};

export const getCachedAlbums = (): any[] | null => {
  if (cachedAlbums && Date.now() - cachedAlbums.timestamp < ALBUMS_TTL) {
    return cachedAlbums.data;
  }
  const fromStorage = readStorageCache<any[]>(ALBUMS_CACHE_KEY, ALBUMS_TTL);
  if (fromStorage) {
    cachedAlbums = { data: fromStorage, timestamp: Date.now() };
    return fromStorage;
  }
  return null;
};

// --- Typed API helpers ---

export const settingsApi = {
  get: async (forceRefresh = false): Promise<Record<string, any>> => {
    if (!forceRefresh) {
      const existing = getCachedSettings();
      if (existing && Object.keys(existing).length > 0) return existing;
    }
    // 1. Fetch directly from Supabase (bypasses Render cold starts)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value');
        if (!error && Array.isArray(data)) {
          const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
          cachedSettings = { data: map, timestamp: Date.now() };
          writeStorageCache(SETTINGS_CACHE_KEY, map);
          return map;
        }
      } catch (err) {
        console.warn('Direct Supabase settings fetch failed, trying backend fallback:', err);
      }
    }
    // 2. Fallback to backend with 5s timeout
    try {
      const res = await api.get('/settings', { timeout: 5000 });
      if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
        cachedSettings = { data: res.data, timestamp: Date.now() };
        writeStorageCache(SETTINGS_CACHE_KEY, res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend settings get failed:', e);
    }
    return getCachedSettings() || {};
  },
  update: async (updates: Record<string, string>) => {
    clearSettingsCache();
    try {
      const res = await api.put('/settings', { updates });
      clearSettingsCache();
      return res.data;
    } catch (err) {
      if (isSupabaseConfigured) {
        console.warn('Backend settings update failed, attempting direct Supabase upsert:', err);
        const entries = Object.entries(updates).map(([key, value]) => ({ key, value: String(value) }));
        await supabase.from('settings').upsert(entries, { onConflict: 'key' });
        clearSettingsCache();
        return { message: 'Updated via direct Supabase' };
      }
      throw err;
    }
  },
};

export const membersApi = {
  list: async (forceRefresh = false): Promise<any[]> => {
    if (!forceRefresh) {
      const existing = getCachedMembers();
      if (existing) return existing;
    }
    // 1. Fetch directly from Supabase (bypasses Render cold starts)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, role, bio, photo_url, display_order')
          .order('display_order', { ascending: true });
        if (!error && Array.isArray(data)) {
          cachedMembers = { data, timestamp: Date.now() };
          writeStorageCache(MEMBERS_CACHE_KEY, data);
          return data;
        }
      } catch (err) {
        console.warn('Direct Supabase members list failed, trying backend fallback:', err);
      }
    }
    // 2. Fallback to backend with 5s timeout
    try {
      const res = await api.get('/members', { timeout: 5000 });
      if (Array.isArray(res.data)) {
        cachedMembers = { data: res.data, timestamp: Date.now() };
        writeStorageCache(MEMBERS_CACHE_KEY, res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend members list failed:', e);
    }
    return getCachedMembers() || [];
  },
  create: (data: object) => {
    clearMembersCache();
    return api.post('/members', data).then(r => { clearMembersCache(); return r.data; });
  },
  update: (id: string, data: object) => {
    clearMembersCache();
    return api.put(`/members/${id}`, data).then(r => { clearMembersCache(); return r.data; });
  },
  delete: (id: string) => {
    clearMembersCache();
    return api.delete(`/members/${id}`).then(r => { clearMembersCache(); return r; });
  },
  getUploadUrl: () => api.post('/members/upload-url').then(r => r.data),
};

export const albumsApi = {
  list: async (forceRefresh = false): Promise<any[]> => {
    if (!forceRefresh) {
      const existing = getCachedAlbums();
      if (existing) return existing;
    }
    // 1. Fetch directly from Supabase (bypasses Render cold starts)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('albums')
          .select('id, home_name, visit_date, description, cover_photo_url')
          .order('visit_date', { ascending: false });
        if (!error && Array.isArray(data)) {
          cachedAlbums = { data, timestamp: Date.now() };
          writeStorageCache(ALBUMS_CACHE_KEY, data);
          return data;
        }
      } catch (err) {
        console.warn('Direct Supabase albums list failed, trying backend fallback:', err);
      }
    }
    // 2. Fallback to backend with 5s timeout
    try {
      const res = await api.get('/albums', { timeout: 5000 });
      if (Array.isArray(res.data)) {
        cachedAlbums = { data: res.data, timestamp: Date.now() };
        writeStorageCache(ALBUMS_CACHE_KEY, res.data);
        return res.data;
      }
    } catch (e) {
      console.warn('Backend albums list failed:', e);
    }
    return getCachedAlbums() || [];
  },
  get: async (id: string): Promise<any> => {
    // 1. Fetch directly from Supabase (bypasses Render cold starts)
    if (isSupabaseConfigured) {
      try {
        const { data: album, error: albumErr } = await supabase
          .from('albums')
          .select('*')
          .eq('id', id)
          .single();
        if (!albumErr && album) {
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
      } catch (err) {
        console.warn(`Direct Supabase album get (${id}) failed, trying backend fallback:`, err);
      }
    }
    // 2. Fallback to backend with 5s timeout
    try {
      const res = await api.get(`/albums/${id}`, { timeout: 5000 });
      if (res.data && typeof res.data === 'object') {
        if (Array.isArray(res.data.photos)) {
          res.data.photos.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        }
        return res.data;
      }
    } catch (e) {
      console.warn(`Backend album ${id} failed:`, e);
    }
    return null;
  },
  create: (data: object) => {
    clearAlbumsCache();
    return api.post('/albums', data).then(r => { clearAlbumsCache(); return r.data; });
  },
  update: (id: string, data: object) => {
    clearAlbumsCache();
    return api.put(`/albums/${id}`, data).then(r => { clearAlbumsCache(); return r.data; });
  },
  delete: (id: string) => {
    clearAlbumsCache();
    return api.delete(`/albums/${id}`).then(r => { clearAlbumsCache(); return r; });
  },
  addPhoto: (albumId: string, data: object) => {
    clearAlbumsCache();
    return api.post(`/albums/${albumId}/photos`, data).then(r => { clearAlbumsCache(); return r.data; });
  },
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
  listApproved: async () => {
    // 1. Fetch directly from Supabase (bypasses Render cold starts)
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('community_messages')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false });
        if (!error && Array.isArray(data)) {
          return data;
        }
      } catch (err) {
        console.warn('Direct Supabase community messages fetch failed, trying backend fallback:', err);
      }
    }
    // 2. Fallback to backend with 5s timeout
    try {
      const res = await api.get('/community-messages/approved', { timeout: 5000 });
      return res.data;
    } catch (e) {
      console.warn('Backend community messages listApproved failed:', e);
      return [];
    }
  },
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
      const res = await api.post('/admin/check-authorized', { email }, { timeout: 5000 });
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

