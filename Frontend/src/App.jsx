import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogOut, Lock, AlertTriangle } from 'lucide-react';
import api, { sessionStore } from './services/api';
import { NavigationProvider } from './context/NavigationContext';
import { resolveRoleMeta } from './constants/rolesMeta';
import UserCountDropdownWidget from './components/UserCountDropdownWidget';
import Login from './pages/Login';
import TenantOnboarding from './pages/TenantOnboarding';
import DeveloperLogin from './pages/DeveloperLogin';
import DeveloperControlCenter from './components/DeveloperControlCenter';
import RoleDashboards from './dashboards/RoleDashboards';
import {
  LoanDetailPage,
  MemberDetailPage,
  PaymentDetailPage,
  CollectorDetailPage,
  GuarantorDetailPage,
  StaffDetailPage,
  AdminUsersCrossCheckPage,
  DataMigrationPage,
  ProfileSecurityPage,
} from './pages/DetailPages';

function TenantShell({ user, onLogout, lockBanner }) {
  const navigate = useNavigate();
  const roleMeta = resolveRoleMeta(user?.role);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      {/* Tenant Operational Top Header — ZERO Developer links, ZERO global counts, ZERO role-switcher select */}
      <header className="header-bar">
        <div className="logo-section" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-icon">GBS</div>
          <div>
            <div style={{ fontWeight: 800, color: '#F4E07B', fontSize: '0.96rem', letterSpacing: 0.4 }}>
              {user?.tenantName || 'GBS LOAN SYSTEM'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              {roleMeta.title} • {user?.firstName} {user?.lastName}
            </div>
          </div>
        </div>

        <div className="header-actions">
          <UserCountDropdownWidget userRole={user?.role} />
          <Link to="/profile" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem' }}>
            <ShieldCheck size={14} /> Security &amp; Voice ID
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-danger"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      {lockBanner && (
        <div style={{ background: 'rgba(239,68,68,0.2)', borderBottom: '1px solid #EF4444', padding: '12px 24px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} />
          <span>{lockBanner}</span>
        </div>
      )}

      <main className="app-main-content">
        <Routes>
          <Route path="/dashboard" element={<RoleDashboards user={user} />} />
          <Route path="/loans/:id" element={<LoanDetailPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/payments/:id" element={<PaymentDetailPage />} />
          <Route path="/collectors/:id" element={<CollectorDetailPage />} />
          <Route path="/guarantors/:id" element={<GuarantorDetailPage />} />
          <Route path="/staff/:id" element={<StaffDetailPage />} />
          <Route path="/admin/users-crosscheck" element={<AdminUsersCrossCheckPage />} />
          <Route path="/migrations" element={<DataMigrationPage />} />
          <Route path="/profile" element={<ProfileSecurityPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div>GBS Loan Management System — Smart Loans. Secure Future.</div>
        <div>Multi-Tenant RBAC • Central Voice Verification • PostgreSQL Ledger</div>
      </footer>
    </div>
  );
}

function ProtectedTenantRoute({ user, onLogout, lockBanner }) {
  const token = sessionStore.getTenantToken();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return <TenantShell user={user} onLogout={onLogout} lockBanner={lockBanner} />;
}

function ProtectedDeveloperRoute({ devUser, onDevLogout }) {
  const devToken = sessionStore.getDevToken();
  if (!devToken || !devUser) {
    return <Navigate to="/dev-portal/login" replace />;
  }
  return <DeveloperControlCenter onLogout={onDevLogout} />;
}

export default function App() {
  const [user, setUser] = useState(() => sessionStore.getTenantUser());
  const [devUser, setDevUser] = useState(() => sessionStore.getDevUser());
  const [lockBanner, setLockBanner] = useState('');

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setLockBanner('');
    };
    const onLocked = (e) => setLockBanner(e.detail?.message || 'Institution access locked or subscription expired.');
    const onSystemLocked = (e) => setLockBanner(e.detail?.message || 'Platform under Lead Developer maintenance lock.');
    const onDevExpired = () => setDevUser(null);

    window.addEventListener('gbs:session-expired', onExpired);
    window.addEventListener('gbs:tenant-locked', onLocked);
    window.addEventListener('gbs:tenant-pending', onLocked);
    window.addEventListener('gbs:system-locked', onSystemLocked);
    window.addEventListener('gbs:dev-session-expired', onDevExpired);

    return () => {
      window.removeEventListener('gbs:session-expired', onExpired);
      window.removeEventListener('gbs:tenant-locked', onLocked);
      window.removeEventListener('gbs:tenant-pending', onLocked);
      window.removeEventListener('gbs:system-locked', onSystemLocked);
      window.removeEventListener('gbs:dev-session-expired', onDevExpired);
    };
  }, []);

  const handleTenantLogout = async () => {
    await api.post('/auth/logout').catch(() => null);
    sessionStore.clearTenantSession();
    setUser(null);
    setLockBanner('');
  };

  return (
    <BrowserRouter>
      <NavigationProvider>
        <Routes>
          {/* Public Tenant Auth & Institutional Onboarding Routes */}
          <Route
            path="/login"
            element={user && sessionStore.getTenantToken() ? <Navigate to="/dashboard" replace /> : <Login onAuthenticated={(u) => { setLockBanner(''); setUser(u); }} />}
          />
          <Route
            path="/login/:roleSlug"
            element={user && sessionStore.getTenantToken() ? <Navigate to="/dashboard" replace /> : <Login onAuthenticated={(u) => { setLockBanner(''); setUser(u); }} />}
          />
          <Route path="/onboard-tenant" element={<TenantOnboarding />} />

          {/* Strictly Isolated Hidden Developer Control Center */}
          <Route
            path="/dev-portal/login"
            element={devUser && sessionStore.getDevToken() ? <Navigate to="/dev-portal" replace /> : <DeveloperLogin onDevAuthenticated={(d) => setDevUser(d)} />}
          />
          <Route
            path="/dev-portal/*"
            element={<ProtectedDeveloperRoute devUser={devUser} onDevLogout={() => setDevUser(null)} />}
          />

          {/* Default Redirect */}
          <Route
            path="/"
            element={<Navigate to={user && sessionStore.getTenantToken() ? '/dashboard' : '/login'} replace />}
          />

          {/* Authenticated Tenant Multi-Role Workspace */}
          <Route
            path="/*"
            element={<ProtectedTenantRoute user={user} onLogout={handleTenantLogout} lockBanner={lockBanner} />}
          />
        </Routes>
      </NavigationProvider>
    </BrowserRouter>
  );
}
