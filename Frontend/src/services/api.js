import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;
const rawApiHost = import.meta.env.VITE_API_HOST;
export const API_ORIGIN = rawApiUrl && /^https?:\/\//i.test(rawApiUrl)
  ? new URL(rawApiUrl).origin
  : rawApiHost
    ? (/^https?:\/\//i.test(rawApiHost) ? rawApiHost.replace(/\/$/, '') : `https://${rawApiHost.replace(/\/$/, '')}`)
    : '';
const API_BASE = rawApiUrl || (API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1');

// Strictly separated Session Storage Keys:
// 1. Real-Life Production Tenant Session (persisted in localStorage)
const TENANT_TOKEN_KEY = 'gbs_tenant_token';
const TENANT_USER_KEY = 'gbs_tenant_user';
const TENANT_REFRESH_KEY = 'gbs_refresh_token';

// 2. Demo Learning & Observing Sandbox Session (strictly isolated per-tab in sessionStorage)
const DEMO_ACTIVE_KEY = 'gbs_demo_active';
const DEMO_TOKEN_KEY = 'gbs_demo_token';
const DEMO_USER_KEY = 'gbs_demo_user';
const DEMO_REFRESH_KEY = 'gbs_demo_refresh_token';

// 3. Developer Landlord Session (strictly isolated in localStorage)
const DEV_TOKEN_KEY = 'gbs_developer_token';
const DEV_USER_KEY = 'gbs_developer_user';

function isDemoPayload(user) {
  return Boolean(
    user?.isDemo ||
    user?.tenantCode === 'DEMO-SANDBOX' ||
    user?.tenant?.code === 'DEMO-SANDBOX' ||
    user?.environmentMode === 'DEMO_SANDBOX'
  );
}

function notifySessionChanged(scope = 'tenant') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gbs:session-changed', { detail: { scope } }));
  }
}

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

export const sessionStore = {
  isDemoSessionActive: () => {
    try {
      return window.sessionStorage.getItem(DEMO_ACTIVE_KEY) === '1'
        && Boolean(window.sessionStorage.getItem(DEMO_TOKEN_KEY));
    } catch {
      return false;
    }
  },
  getActiveEnvMode: () => {
    if (sessionStore.isDemoSessionActive()) return 'DEMO_SANDBOX';
    if (localStorage.getItem(TENANT_TOKEN_KEY)) return 'PRODUCTION_LIVE';
    return null;
  },
  hasProductionSession: () => Boolean(localStorage.getItem(TENANT_TOKEN_KEY) && localStorage.getItem(TENANT_USER_KEY)),
  getTenantToken: () => {
    if (sessionStore.isDemoSessionActive()) {
      return window.sessionStorage.getItem(DEMO_TOKEN_KEY);
    }
    return localStorage.getItem(TENANT_TOKEN_KEY);
  },
  getTenantUser: () => {
    try {
      if (sessionStore.isDemoSessionActive()) {
        return JSON.parse(window.sessionStorage.getItem(DEMO_USER_KEY) || 'null');
      }
      return JSON.parse(localStorage.getItem(TENANT_USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  setDemoSession: (token, user, refreshToken = null) => {
    window.sessionStorage.setItem(DEMO_ACTIVE_KEY, '1');
    window.sessionStorage.setItem(DEMO_TOKEN_KEY, token);
    window.sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify({
      ...user,
      isDemo: true,
      environmentMode: 'DEMO_SANDBOX',
    }));
    if (refreshToken) window.sessionStorage.setItem(DEMO_REFRESH_KEY, refreshToken);
    notifySessionChanged('demo');
  },
  clearDemoSession: () => {
    try {
      window.sessionStorage.removeItem(DEMO_ACTIVE_KEY);
      window.sessionStorage.removeItem(DEMO_TOKEN_KEY);
      window.sessionStorage.removeItem(DEMO_USER_KEY);
      window.sessionStorage.removeItem(DEMO_REFRESH_KEY);
    } catch {
      // Ignore storage availability errors
    }
    notifySessionChanged('demo');
  },
  setTenantSession: (token, user, refreshToken = null) => {
    if (isDemoPayload(user)) {
      sessionStore.setDemoSession(token, user, refreshToken);
      return;
    }
    // Real-Life Production login: clear per-tab demo state so this tab runs cleanly in Production
    try {
      window.sessionStorage.removeItem(DEMO_ACTIVE_KEY);
      window.sessionStorage.removeItem(DEMO_TOKEN_KEY);
      window.sessionStorage.removeItem(DEMO_USER_KEY);
      window.sessionStorage.removeItem(DEMO_REFRESH_KEY);
    } catch {
      // Ignore
    }
    localStorage.setItem(TENANT_TOKEN_KEY, token);
    localStorage.setItem(TENANT_USER_KEY, JSON.stringify({
      ...user,
      isDemo: false,
      environmentMode: 'PRODUCTION_LIVE',
    }));
    if (refreshToken) localStorage.setItem(TENANT_REFRESH_KEY, refreshToken);
    notifySessionChanged('production');
  },
  clearTenantSession: () => {
    if (sessionStore.isDemoSessionActive()) {
      sessionStore.clearDemoSession();
      return;
    }
    localStorage.removeItem(TENANT_TOKEN_KEY);
    localStorage.removeItem(TENANT_USER_KEY);
    localStorage.removeItem(TENANT_REFRESH_KEY);
    notifySessionChanged('production');
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
    notifySessionChanged('developer');
  },
  clearDevSession: () => {
    localStorage.removeItem(DEV_TOKEN_KEY);
    localStorage.removeItem(DEV_USER_KEY);
    notifySessionChanged('developer');
  },
};

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const isDemo = sessionStore.isDemoSessionActive();
  const token = sessionStore.getTenantToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (!config.headers['X-Environment-Mode']) {
    if (isDemo) {
      config.headers['X-Environment-Mode'] = 'DEMO_SANDBOX';
    } else if (token) {
      config.headers['X-Environment-Mode'] = 'PRODUCTION_LIVE';
    }
  }
  config.headers['X-Device-Fingerprint'] = getDeviceFingerprint();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data || {};
    const status = error?.response?.status;
    const isDemo = sessionStore.isDemoSessionActive();
    if (status === 401 && data.code !== 'VOICE_VERIFICATION_FAILED') {
      window.dispatchEvent(new CustomEvent('gbs:session-expired', {
        detail: { status, code: data.code, message: data.message, isDemo },
      }));
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

// Isolated Developer Portal API Client (NEVER reads Tenant or Demo tokens)
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

export const executeService = async (endpoint = '/', options = {}) => {
  const token = sessionStore.getTenantToken();
  const isDemo = sessionStore.isDemoSessionActive();
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(token ? { 'X-Environment-Mode': isDemo ? 'DEMO_SANDBOX' : 'PRODUCTION_LIVE' } : {}),
      ...(options.headers || {}),
    },
  });
  return res.json();
};

export default api;
