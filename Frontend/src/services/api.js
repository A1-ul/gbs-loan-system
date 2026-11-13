import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawApiHost = import.meta.env.VITE_API_HOST;
export const API_ORIGIN = rawApiUrl && /^https?:\/\//i.test(rawApiUrl)
  ? new URL(rawApiUrl).origin
  : rawApiHost
    ? (/^https?:\/\//i.test(rawApiHost) ? rawApiHost.replace(/\/$/, '') : `https://${rawApiHost.replace(/\/$/, '')}`)
    : '';
const API_BASE = rawApiUrl || (API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1');

// Separate Session Storage Keys — strict separation between Tenant Users & Developer Landlord
const TENANT_TOKEN_KEY = 'gbs_tenant_token';
const TENANT_USER_KEY = 'gbs_tenant_user';
const DEV_TOKEN_KEY = 'gbs_developer_token';
const DEV_USER_KEY = 'gbs_developer_user';

export function getDeviceFingerprint() {
  let fp = localStorage.getItem('gbs_device_fp');
  if (!fp) {
    const raw = [navigator.userAgent, navigator.language, screen.width, screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
    fp = `dev-${Math.abs(hash).toString(16)}`;
    localStorage.setItem('gbs_device_fp', fp);
  }
  return fp;
}

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TENANT_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Device-Fingerprint'] = getDeviceFingerprint();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data || {};
    const status = error?.response?.status;
    if (status === 401 && data.code !== 'VOICE_VERIFICATION_FAILED') {
      // Do not silently auto-login; dispatch clean session event
      window.dispatchEvent(new CustomEvent('gbs:session-expired', { detail: { status, code: data.code, message: data.message } }));
    } else if (status === 402 || data.code === 'TENANT_SUBSCRIPTION_EXPIRED') {
      window.dispatchEvent(new CustomEvent('gbs:tenant-locked', { detail: data }));
    } else if (status === 403 && data.code === 'TENANT_PENDING_APPROVAL') {
      window.dispatchEvent(new CustomEvent('gbs:tenant-pending', { detail: data }));
    } else if (status === 503 && data.code === 'SYSTEM_LOCKED') {
      window.dispatchEvent(new CustomEvent('gbs:system-locked', { detail: data }));
    }
    return Promise.reject({
      status,
      code: data.code,
      message: data.message || error.message || 'API Request failed',
      data: data.data || null,
      response: error?.response,
    });
  }
);

// Isolated Developer Portal API Client (NEVER reads gbs_tenant_token)
export const devApi = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

devApi.interceptors.request.use((config) => {
  const devToken = localStorage.getItem(DEV_TOKEN_KEY);
  if (devToken) {
    config.headers.Authorization = `Bearer ${devToken}`;
  }
  config.headers['X-Device-Fingerprint'] = getDeviceFingerprint();
  return config;
});

devApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data || {};
    const status = error?.response?.status;
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('gbs:dev-session-expired', { detail: data }));
    }
    return Promise.reject({
      status,
      code: data.code,
      message: data.message || error.message || 'Developer API error',
      data: data.data || null,
      response: error?.response,
    });
  }
);

export const sessionStore = {
  getTenantToken: () => localStorage.getItem(TENANT_TOKEN_KEY),
  getTenantUser: () => {
    try {
      return JSON.parse(localStorage.getItem(TENANT_USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setTenantSession: (token, user, refreshToken = null) => {
    localStorage.setItem(TENANT_TOKEN_KEY, token);
    localStorage.setItem(TENANT_USER_KEY, JSON.stringify(user));
    if (refreshToken) localStorage.setItem('gbs_refresh_token', refreshToken);
  },
  clearTenantSession: () => {
    localStorage.removeItem(TENANT_TOKEN_KEY);
    localStorage.removeItem(TENANT_USER_KEY);
    localStorage.removeItem('gbs_refresh_token');
  },
  getDevToken: () => localStorage.getItem(DEV_TOKEN_KEY),
  getDevUser: () => {
    try {
      return JSON.parse(localStorage.getItem(DEV_USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setDevSession: (token, developer) => {
    localStorage.setItem(DEV_TOKEN_KEY, token);
    localStorage.setItem(DEV_USER_KEY, JSON.stringify(developer));
  },
  clearDevSession: () => {
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_USER_KEY);
  },
};

export const executeService = async (endpoint = '/', options = {}) => {
  const token = sessionStore.getTenantToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
};

export default api;
