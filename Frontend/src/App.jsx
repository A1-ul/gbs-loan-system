import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, LogOut, AlertTriangle, Menu, X, BookOpen, PlayCircle, ExternalLink } from 'lucide-react';
import api, { sessionStore } from './services/api';
import { NavigationProvider } from './context/NavigationContext';
import { resolveRoleMeta } from './constants/rolesMeta';
import UserCountDropdownWidget from './components/UserCountDropdownWidget';
import OperatingGuideModal from './components/OperatingGuideModal';
import { CctvMobileWatchPage } from './components/CctvMobilePanel';
import Login from './pages/Login';
import DemoLaunch from './pages/DemoLaunch';
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
  const [dataMode, setDataMode] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branding, setBranding] = useState({
    tenantName: user?.tenantName || 'GBS LOAN SYSTEM',
    tenantLogoUrl: user?.tenantLogoUrl || null,
  });

  useEffect(() => {
    setBranding({
      tenantName: user?.tenantName || 'GBS LOAN SYSTEM',
      tenantLogoUrl: user?.tenantLogoUrl || null,
    });
  }, [user?.tenantName, user?.tenantLogoUrl]);

  useEffect(() => {
    const onBrandingUpdated = (e) => {
      const updated = e.detail || {};
      setBranding((prev) => ({
        tenantName: updated.name || updated.tenantName || prev.tenantName,
        tenantLogoUrl: updated.logoUrl !== undefined ? updated.logoUrl : prev.tenantLogoUrl,
      }));
    };
    window.addEventListener('gbs:tenant-branding-updated', onBrandingUpdated);
    return () => window.removeEventListener('gbs:tenant-branding-updated', onBrandingUpdated);
  }, []);

  useEffect(() => {
    api.get('/health').then((res) => {
      const payload = res.data?.data || res.data;
      if (payload?.dataMode) setDataMode(payload.dataMode);
    }).catch(() => null);
  }, []);

  const isDemo = Boolean(
    user?.isDemo ||
    user?.tenantCode === 'DEMO-SANDBOX' ||
    user?.tenant?.code === 'DEMO-SANDBOX' ||
    user?.environmentMode === 'DEMO_SANDBOX'
  );

  const handleExitDemoToProduction = async () => {
    await onLogout();
    navigate('/login?env=production&switch=1');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)' }}>
      {/* Tenant Operational Top Header — ZERO Developer links, custom institution name + logo */}
      <header className="header-bar">
        <Link to="/dashboard?tab=OVERVIEW" className="logo-section" style={{ cursor: 'pointer', flex: 1, minWidth: 200, textDecoration: 'none' }}>
          {branding.tenantLogoUrl ? (
            <img
              src={branding.tenantLogoUrl}
              alt={branding.tenantName}
              style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover', border: '1px solid #D4AF37', background: '#0F1B31' }}
            />
          ) : (
            <div className="logo-icon">GBS</div>
          )}
          <div>
            <div style={{ fontWeight: 800, color: '#F4E07B', fontSize: '0.98rem', letterSpacing: 0.4 }}>
              {branding.tenantName}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Powered by GBS • {roleMeta.title} • {user?.firstName} {user?.lastName}
            </div>
          </div>
        </Link>

        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Toggle Menu"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className={`header-actions header-actions-collapsible ${mobileMenuOpen ? 'open' : ''}`}>
          {isDemo ? (
            <span className="badge badge-warning" style={{ borderColor: '#F59E0B', color: '#FDE68A' }}>
              DEMO WALKTHROUGH SANDBOX
            </span>
          ) : dataMode && (
            <span className={`badge ${dataMode === 'PRODUCTION_LIVE' ? 'badge-success' : 'badge-warning'}`}>
              {dataMode === 'PRODUCTION_LIVE' ? 'PRODUCTION LIVE' : 'LIVE SYSTEM'}
            </span>
          )}
          <UserCountDropdownWidget userRole={user?.role} />
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.8rem' }}
          >
            <BookOpen size={14} /> Operating Guide
          </button>
          <Link to="/profile" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
            <ShieldCheck size={14} /> Security &amp; Face/Voice ID
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

      <OperatingGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} userRole={user?.role} isDeveloper={false} />

      {isDemo && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(120,53,15,0.45), rgba(30,41,59,0.85))',
          borderBottom: '1px solid rgba(245, 158, 11, 0.45)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: '0.8rem', color: '#FEF3C7' }}>
            <PlayCircle size={17} color="#FBBF24" />
            <span>
              <strong>DEMO WALKTHROUGH SANDBOX ({user?.tenantCode || 'DEMO-SANDBOX'}):</strong> Strictly separated from Real-Life Production institutions &amp; Developer Control Center.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { label: 'Company Owner', role: 'COMPANY_OWNER', tab: 'OVERVIEW' },
              { label: 'Loan Officer', role: 'LOAN_OFFICER', tab: 'LOANS' },
              { label: 'Accountant', role: 'ACCOUNTANT', tab: 'ACCOUNTING_AUDIT' },
              { label: 'Field & GPS Locator', role: 'COLLECTIONS', tab: 'FIELD_OPS' },
              { label: 'Member Portal', role: 'MEMBER_PORTAL', tab: 'OVERVIEW' },
              { label: 'Guarantor Portal', role: 'GUARANTOR_PORTAL', tab: 'OVERVIEW' },
            ].map((item) => (
              <Link
                key={item.role}
                to={`/demo-launch?role=${item.role}&tab=${item.tab}`}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.72rem', textDecoration: 'none', borderColor: 'rgba(251,191,36,0.45)', color: '#FDE68A' }}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleExitDemoToProduction}
              className="btn btn-primary"
              style={{ padding: '5px 12px', fontSize: '0.74rem' }}
            >
              Exit Demo → Real Production Sign In
            </button>
          </div>
        </div>
      )}

      {lockBanner && (
        <div style={{ background: 'rgba(239,68,68,0.2)', borderBottom: '1px solid #EF4444', padding: '12px 24px', color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} />
          <span>{lockBanner}</span>
        </div>
      )}

      <main className="app-main-content">
        <Routes>
          <Route path="/dashboard" element={<RoleDashboards user={user} />} />
          <Route path="/dashboard/tab/:tabId" element={<RoleDashboards user={user} />} />
          <Route path="/loans/:id" element={<LoanDetailPage />} />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/payments/:id" element={<PaymentDetailPage />} />
          <Route path="/collectors/:id" element={<CollectorDetailPage />} />
          <Route path="/guarantors/:id" element={<GuarantorDetailPage />} />
          <Route path="/staff/:id" element={<StaffDetailPage />} />
          <Route path="/admin/users-crosscheck" element={<AdminUsersCrossCheckPage />} />
          <Route path="/migrations" element={<DataMigrationPage />} />
          <Route path="/profile" element={<ProfileSecurityPage />} />
          <Route path="/profile/security" element={<ProfileSecurityPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div>{branding.tenantName} — Powered by GBS Loan Management System {isDemo ? '(Demo Sandbox)' : ''}</div>
        <div>Multi-Tenant RBAC • Live OTP &amp; Biometrics • PostgreSQL Ledger</div>
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

function LoginRouteGuard({ user, onAuthenticated, onDevAuthenticated }) {
  const [searchParams] = useSearchParams();
  const forceView =
    searchParams.get('switch') === '1' ||
    searchParams.get('env') === 'demo' ||
    Boolean(searchParams.get('mode')) ||
    searchParams.get('dev') === '1';
  if (user && sessionStore.getTenantToken() && !forceView) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Login onAuthenticated={onAuthenticated} onDevAuthenticated={onDevAuthenticated} />;
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
    const onStorageSync = (e) => {
      if (!e.key || e.key.startsWith('gbs_tenant_')) {
        const nextUser = sessionStore.getTenantToken() ? sessionStore.getTenantUser() : null;
        setUser(nextUser);
      }
      if (!e.key || e.key.startsWith('gbs_developer_')) {
        const nextDev = sessionStore.getDevToken() ? sessionStore.getDevUser() : null;
        setDevUser(nextDev);
      }
    };

    window.addEventListener('gbs:session-expired', onExpired);
    window.addEventListener('gbs:tenant-locked', onLocked);
    window.addEventListener('gbs:tenant-pending', onLocked);
    window.addEventListener('gbs:system-locked', onSystemLocked);
    window.addEventListener('gbs:dev-session-expired', onDevExpired);
    window.addEventListener('storage', onStorageSync);

    return () => {
      window.removeEventListener('gbs:session-expired', onExpired);
      window.removeEventListener('gbs:tenant-locked', onLocked);
      window.removeEventListener('gbs:tenant-pending', onLocked);
      window.removeEventListener('gbs:system-locked', onSystemLocked);
      window.removeEventListener('gbs:dev-session-expired', onDevExpired);
      window.removeEventListener('storage', onStorageSync);
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
          {/* Default Entry Route: Institutional Onboarding Form First (when unauthenticated) */}
          <Route
            path="/"
            element={user && sessionStore.getTenantToken() ? <Navigate to="/dashboard?tab=OVERVIEW" replace /> : <TenantOnboarding />}
          />
          <Route path="/onboard-tenant" element={<TenantOnboarding />} />
          <Route path="/cctv-mobile" element={<CctvMobileWatchPage />} />
          <Route path="/demo-launch" element={<DemoLaunch onAuthenticated={(u) => { setLockBanner(''); setUser(u); }} />} />

          {/* Public Tenant Auth & 30-Role Portals */}
          <Route
            path="/login"
            element={<LoginRouteGuard user={user} onAuthenticated={(u) => { setLockBanner(''); setUser(u); }} onDevAuthenticated={(d) => setDevUser(d)} />}
          />
          <Route
            path="/login/:roleSlug"
            element={<LoginRouteGuard user={user} onAuthenticated={(u) => { setLockBanner(''); setUser(u); }} onDevAuthenticated={(d) => setDevUser(d)} />}
          />

          {/* Strictly Isolated Hidden Developer Control Center */}
          <Route
            path="/dev-portal/login"
            element={devUser && sessionStore.getDevToken() ? <Navigate to="/dev-portal" replace /> : <DeveloperLogin onDevAuthenticated={(d) => setDevUser(d)} />}
          />
          <Route
            path="/dev-portal/tab/:tabId"
            element={<ProtectedDeveloperRoute devUser={devUser} onDevLogout={() => setDevUser(null)} />}
          />
          <Route
            path="/dev-portal/*"
            element={<ProtectedDeveloperRoute devUser={devUser} onDevLogout={() => setDevUser(null)} />}
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
