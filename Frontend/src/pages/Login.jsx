import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Shield, Lock, UserCheck, Building2, ArrowRight, Eye, EyeOff,
  KeyRound, CheckCircle2, AlertTriangle, Grid, Volume2, MapPin, Crosshair,
  PlayCircle, Compass, ArrowLeft, ArrowUpRight
} from 'lucide-react';
import api, { devApi, sessionStore, getDeviceFingerprint } from '../services/api';
import { ROLES_META, resolveRoleMeta } from '../constants/rolesMeta';
import VoiceChallengePanel from '../components/VoiceChallengePanel';

/**
 * GBS Loan Management System — Dedicated Role-Specific Login & All-30-Role Account Registration
 * RULE: Hidden Developer Dashboard opens only from the Main Login Page via strictly masked password entry.
 * RULE: Real-Life Production Login & Interactive Demo Walkthrough Sandbox are strictly separated.
 * RULE: Every tab and portal card opens cleanly in a new window.
 */
export default function Login({ onAuthenticated, onDevAuthenticated }) {
  const { roleSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleMeta = resolveRoleMeta(roleSlug || 'member-portal');
  const resolveInitialEnv = (sp) => (sp.get('env') === 'demo' ? 'demo' : 'production');
  const resolveInitialMode = (sp) => {
    const reqMode = sp.get('mode');
    if (sp.get('dev') === '1' || reqMode === 'dev-hidden') return 'dev-hidden';
    if (['login', 'register', 'verify-otp', 'voice-check', 'directory', 'dev-hidden'].includes(reqMode)) {
      return reqMode;
    }
    return 'login';
  };

  const [envMode, setEnvMode] = useState(() => resolveInitialEnv(searchParams)); // 'production' | 'demo'
  const [mode, setMode] = useState(() => resolveInitialMode(searchParams)); // 'login' | 'register' | 'verify-otp' | 'voice-check' | 'directory' | 'dev-hidden'
  const [approvedTenants, setApprovedTenants] = useState([]);
  const [demoCatalog, setDemoCatalog] = useState([]);
  const [demoLoading, setDemoLoading] = useState(false);

  // Login Form State (strictly blank defaults)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [totpToken, setTotpToken] = useState('');

  // Hidden Developer Gate State (strictly masked password, NO reveal toggle)
  const [devEmail, setDevEmail] = useState('gabosei48@gmail.com');
  const [devPassword, setDevPassword] = useState('');
  const [devTotp, setDevTotp] = useState('');

  // Registration State (supports all 30 roles + GPS Address)
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [regData, setRegData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gpsAddress: '',
    gpsLatitude: '',
    gpsLongitude: '',
    password: '',
    tenantCode: '',
    role: roleMeta.key,
  });

  // OTP Verification State
  const [otpPhone, setOtpPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNotice, setOtpNotice] = useState('');

  // Role Directory Search & Filter State
  const [roleSearch, setRoleSearch] = useState('');
  const [roleCategoryFilter, setRoleCategoryFilter] = useState('ALL');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setRegData((prev) => ({ ...prev, role: roleMeta.key }));
    setError('');
  }, [roleMeta.key]);

  useEffect(() => {
    setEnvMode(resolveInitialEnv(searchParams));
    setMode(resolveInitialMode(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (envMode !== 'demo') return;
    setDemoLoading(true);
    setError('');
    api
      .get('/demo/walkthrough-catalog')
      .then((res) => {
        const steps = res.data?.data?.walkthroughModules || res.data?.data?.walkthroughSteps;
        if (Array.isArray(steps)) setDemoCatalog(steps);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Unable to load interactive demo walkthrough catalog. Please refresh or retry.');
      })
      .finally(() => setDemoLoading(false));
  }, [envMode]);

  useEffect(() => {
    api
      .get('/tenants/public-directory')
      .then((res) => {
        if (Array.isArray(res.data?.data)) setApprovedTenants(res.data.data);
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    const onKeyDown = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === 'd') {
        ev.preventDefault();
        setError('');
        setSuccessMsg('');
        setMode((prev) => (prev === 'dev-hidden' ? 'login' : 'dev-hidden'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isPermanentDevTyped = email.trim().toLowerCase() === 'gabosei48@gmail.com';

  const authenticateDeveloperPortal = async (loginEmail, loginPassword, loginTotp) => {
    const payload = {
      email: loginEmail.trim(),
      password: loginPassword,
      deviceFingerprint: getDeviceFingerprint(),
    };
    if (loginTotp && loginTotp.trim()) payload.totpToken = loginTotp.trim();

    const res = await devApi.post('/developer/auth/login', payload);
    const data = res.data?.data || {};
    const token = data.accessToken || data.token;
    const developer = data.developer || data.user;
    if (!token || !developer) {
      throw new Error('Authority verification did not issue a valid session.');
    }
    sessionStore.setDevSession(token, developer);
    if (onDevAuthenticated) onDevAuthenticated(developer, token);
    navigate('/dev-portal');
  };

  const handleHiddenDevSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      await authenticateDeveloperPortal(devEmail || 'gabosei48@gmail.com', devPassword, devTotp);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Developer Landlord authentication rejected.');
    } finally {
      setSubmitting(false);
    }
  };

  const detectRegGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setRegData((prev) => ({
        ...prev,
        gpsLatitude: Number(pos.coords.latitude).toFixed(6),
        gpsLongitude: Number(pos.coords.longitude).toFixed(6),
      }));
    }, () => { });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      if (isPermanentDevTyped) {
        await authenticateDeveloperPortal(email, password, totpToken);
        return;
      }

      const payload = {
        email: email.trim(),
        password,
        role: roleMeta.key,
        deviceFingerprint: getDeviceFingerprint(),
      };
      if (totpToken.trim()) payload.totpToken = totpToken.trim();

      const res = await api.post('/auth/login', payload);
      const data = res.data?.data || {};
      const token = data.accessToken || data.token;
      const user = data.user;

      if (!token || !user) {
        throw new Error('Authentication succeeded without a valid session token.');
      }

      sessionStore.setTenantSession(token, user);

      if (user.voiceEnrolled) {
        setSuccessMsg('Credentials verified. Complete Voice Identity Verification to enter your dashboard.');
        setMode('voice-check');
      } else {
        if (onAuthenticated) onAuthenticated(user, token);
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Authentication failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const payload = {
        ...regData,
        gpsLatitude: regData.gpsLatitude ? Number(regData.gpsLatitude) : undefined,
        gpsLongitude: regData.gpsLongitude ? Number(regData.gpsLongitude) : undefined,
        deviceFingerprint: getDeviceFingerprint(),
      };
      const res = await api.post('/auth/register', payload);
      const data = res.data?.data || {};
      setOtpPhone(data.phone || regData.phone);

      const smsDelivered = data.otpDelivery?.delivered;
      setOtpNotice(
        data.requiresAdminApproval
          ? 'Verify your mobile OTP first. All Staff & Executive registrations require Company Owner approval before portal sign-in.'
          : smsDelivered
            ? `Real SMS verification code sent via ${data.otpDelivery.provider} to ${data.phone || regData.phone}.`
            : 'Enter the 6-digit OTP verification code generated for your mobile contact.'
      );
      setSuccessMsg(
        data.otpCode
          ? `Account created! OTP: ${data.otpCode}${smsDelivered ? ` (Delivered via ${data.otpDelivery.provider})` : ''}`
          : res.data?.message || 'Account created! Enter the verification OTP sent to your registered mobile contact.'
      );
      setMode('verify-otp');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/verify-otp', { phone: otpPhone, otp: otpCode.trim() });
      setSuccessMsg(res.data?.message || 'Phone verified! You may now sign in once approved.');
      setMode('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired OTP code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpPhone.trim()) {
      setError('Enter your registered mobile number to resend OTP.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/resend-otp', { phone: otpPhone.trim() });
      const data = res.data?.data || {};
      setSuccessMsg(
        data.otpCode
          ? `New OTP dispatched! Code: ${data.otpCode}`
          : res.data?.message || 'A fresh 6-digit verification code has been dispatched to your mobile number.'
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP code');
    } finally {
      setSubmitting(false);
    }
  };

  const roleCategories = ['ALL', ...Array.from(new Set(ROLES_META.map((r) => r.category)))];
  const filteredRolesMeta = ROLES_META.filter((r) => {
    if (envMode === 'demo' && r.key === 'FRAUD_INVESTIGATION') return false;
    const matchesCat = roleCategoryFilter === 'ALL' || r.category === roleCategoryFilter;
    const q = roleSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.subtitle.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.slug.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const groupedRoles = filteredRolesMeta.reduce((acc, r) => {
    acc[r.category] = acc[r.category] || [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div className="split-login-layout">
      {/* LEFT PANE: Unique Real-Life Role Photography + Institutional Standing */}
      <div className="split-login-photo-pane">
        <img
          src={roleMeta.loginImage}
          alt={`${roleMeta.title} Login Portal`}
          className="hero-photo"
        />
        <div className="split-login-photo-scrim" />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div className="logo-section">
            <div className="logo-icon">GBS</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#F4E07B', letterSpacing: 0.4 }}>
                GBS LOAN MANAGEMENT SYSTEM
              </div>
              <div style={{ fontSize: '0.74rem', color: '#CBD5E1' }}>Smart Loans. Secure Future.</div>
            </div>
          </div>

          <Link
            to={mode === 'directory'
              ? `/login/${roleMeta.slug}?env=${envMode}&mode=login&switch=1`
              : `/login/${roleMeta.slug}?env=${envMode}&mode=directory&switch=1`}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
          >
            <Grid size={14} /> {mode === 'directory' ? 'Back to Sign In' : `All ${ROLES_META.length} Role Portals`}
          </Link>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
          <span
            className="badge badge-gold"
            style={{ marginBottom: 10, borderColor: roleMeta.accent, color: roleMeta.accent }}
          >
            {envMode === 'demo' ? 'DEMO SANDBOX WALKTHROUGH' : roleMeta.category}
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
            {roleMeta.title.toLowerCase().endsWith('portal') ? roleMeta.title : `${roleMeta.title} Portal`}
          </h1>
          <p style={{ fontSize: '0.94rem', color: '#E2E8F0', maxWidth: 520, marginBottom: 18 }}>
            {roleMeta.subtitle}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className={`badge ${envMode === 'demo' ? 'badge-warning' : 'badge-success'}`}>
              {envMode === 'demo' ? 'Isolated Demo Sandbox' : 'PostgreSQL Multi-Tenant Live'}
            </span>
            <span className="badge badge-cyan">Live SMS OTP</span>
            <span className="badge badge-gold">{ROLES_META.length} RBAC Portals</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Environment Switcher (Real Production vs Demo Walkthrough), 30-Role Auth & Directory */}
      <div className="split-login-form-pane">
        <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', paddingBottom: 24 }}>
          {(envMode === 'demo' || mode !== 'login') && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate(`/login/${roleMeta.slug}?env=production&mode=login&switch=1`))}
                className="btn btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.8rem', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}
              >
                <ArrowLeft size={15} /> Back
              </button>
              <Link
                to={`/login/${roleMeta.slug}?env=production&mode=login&switch=1`}
                className="btn btn-secondary"
                style={{ padding: '7px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
              >
                Main Sign In Page
              </Link>
            </div>
          )}

          {/* Explicit Environment Separator Bar — Opens Selected Environment Page With Scroll & Back Button */}
          <div
            className="glass-panel"
            data-testid="environment-separator-bar"
            style={{
              padding: 12,
              marginBottom: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderColor: envMode === 'demo' ? 'rgba(245,158,11,0.55)' : 'rgba(16,185,129,0.45)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#CBD5E1', flexWrap: 'wrap', gap: 6 }}>
              <span>ENVIRONMENT MODE (EVERY TAB OPENS IN ITS OWN PAGE):</span>
              <span className={`badge ${envMode === 'demo' ? 'badge-warning' : 'badge-success'}`}>
                {envMode === 'demo' ? 'DEMO_SANDBOX ACTIVE' : 'PRODUCTION_LIVE ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link
                to={`/login/${roleMeta.slug}?env=production&mode=login&switch=1`}
                className={envMode === 'production' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ flex: '1 1 210px', justifyContent: 'center', fontSize: '0.82rem', textDecoration: 'none' }}
              >
                <Shield size={15} /> Real-Life Production Login
              </Link>
              <Link
                to={`/login/${roleMeta.slug}?env=demo&switch=1`}
                className={envMode === 'demo' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  flex: '1 1 210px',
                  justifyContent: 'center',
                  fontSize: '0.82rem',
                  textDecoration: 'none',
                  ...(envMode === 'demo'
                    ? { background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#09111F', fontWeight: 700 }
                    : { borderColor: 'rgba(245,158,11,0.5)', color: '#FDE68A' }),
                }}
              >
                <PlayCircle size={15} /> Demo Walkthrough Sandbox
              </Link>
            </div>
          </div>

          {mode === 'directory' ? (
            <div>
              <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: 6 }}>
                Select Your Institutional Role Portal (All {ROLES_META.length} Roles — {envMode === 'demo' ? 'Demo Mode' : 'Production'})
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: 12 }}>
                Clicking any portal opens that role page cleanly with tailored dashboards, GPS tracking, and live verification.
              </p>

              <div className="filter-toolbar" style={{ marginBottom: 14 }}>
                <input
                  type="text"
                  className="gbs-input"
                  style={{ flex: '1 1 200px', padding: '8px 12px', fontSize: '0.82rem' }}
                  placeholder="Search role title, department, or keyword..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
                <select
                  className="gbs-select"
                  style={{ flex: '0 1 210px', padding: '8px 12px', fontSize: '0.8rem' }}
                  value={roleCategoryFilter}
                  onChange={(e) => setRoleCategoryFilter(e.target.value)}
                >
                  {roleCategories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'ALL' ? `All Categories (${ROLES_META.length})` : c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(groupedRoles).map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 8 }}>
                      {cat} ({items.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                      {items.map((r) => (
                        <Link
                          key={r.key}
                          to={envMode === 'demo'
                            ? `/demo-launch?role=${r.key}&tab=OVERVIEW`
                            : `/login/${r.slug}?env=production&mode=login&switch=1`}
                          className="role-portal-card"
                          style={{
                            textAlign: 'left',
                            padding: 10,
                            borderRadius: 10,
                            border: `1px solid ${r.key === roleMeta.key ? r.accent : 'rgba(212,175,55,0.2)'}`,
                            background: 'rgba(15, 27, 49, 0.72)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            color: '#F1F5F9',
                            textDecoration: 'none',
                          }}
                        >
                          <img
                            src={r.loginImage}
                            alt={r.title}
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r.title}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                              {envMode === 'demo' ? 'Open Demo Portal' : `/login/${r.slug}`}
                            </div>
                          </div>
                          <ArrowUpRight size={13} color="#94A3B8" />
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : envMode === 'demo' && mode !== 'dev-hidden' ? (
            <div className="glass-panel" style={{ padding: 24, borderColor: 'rgba(245, 158, 11, 0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <div>
                  <span className="badge badge-warning" style={{ marginBottom: 6 }}>ISOLATED SANDBOX (DEMO-SANDBOX)</span>
                  <h2 className="gold-gradient-text" style={{ fontSize: '1.35rem', margin: '4px 0' }}>
                    Interactive System Walkthrough
                  </h2>
                </div>
                <Link
                  to={`/demo-launch?role=${roleMeta.key === 'FRAUD_INVESTIGATION' ? 'RISK_MANAGEMENT' : roleMeta.key}&tab=OVERVIEW`}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#09111F', textDecoration: 'none' }}
                >
                  <PlayCircle size={16} /> Open {roleMeta.key === 'FRAUD_INVESTIGATION' ? 'Risk & Compliance' : roleMeta.title} Demo <ArrowUpRight size={14} />
                </Link>
              </div>

              <p style={{ fontSize: '0.83rem', color: '#CBD5E1', lineHeight: 1.5, marginBottom: 16 }}>
                Explore every operational dashboard before going live. Demo sessions run strictly inside <strong>DEMO-SANDBOX</strong>{' '}
                (with sample loans, GhanaPost GPS locator records, overdue repayment alerts, and staff attendance) and can{' '}
                <strong>never</strong> alter real production institutions or access the Developer Control Center. Each walkthrough step opens its dedicated scrollable page with a Back button.
              </p>

              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FDE68A', marginBottom: 8, textTransform: 'uppercase' }}>
                Guided Feature Walkthrough (Opens Each Module Page)
              </div>
              {demoLoading ? (
                <div style={{ padding: 14, color: '#94A3B8', fontSize: '0.82rem' }}>Loading walkthrough modules...</div>
              ) : (
                <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
                  {demoCatalog.map((step) => (
                    <Link
                      key={step.id}
                      to={`/demo-launch?role=${encodeURIComponent(step.role)}&tab=${encodeURIComponent(step.tab)}`}
                      className="role-portal-card"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        background: 'rgba(15, 27, 49, 0.72)',
                        color: '#F8FAFC',
                        textDecoration: 'none',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.83rem', fontWeight: 700, color: '#F4E07B' }}>
                          {step.step}. {step.title}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#CBD5E1', marginTop: 2 }}>{step.summary}</div>
                      </div>
                      <span className="badge badge-cyan" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Compass size={12} /> Try Step <ArrowUpRight size={12} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#D4AF37', marginBottom: 8, textTransform: 'uppercase' }}>
                Or Test Any of All {ROLES_META.length} Institutional Roles Directly
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(165px, 1fr))', gap: 6, marginBottom: 16 }}>
                {ROLES_META.filter((r) => r.key !== 'FRAUD_INVESTIGATION').map((r) => (
                  <Link
                    key={r.key}
                    to={`/demo-launch?role=${r.key}&tab=OVERVIEW`}
                    className="btn btn-secondary"
                    style={{ padding: '7px 9px', fontSize: '0.74rem', justifyContent: 'space-between', textDecoration: 'none' }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
                    <ArrowUpRight size={12} />
                  </Link>
                ))}
              </div>

              <div style={{ paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <Link
                  to={`/login/${roleMeta.slug}?env=production&mode=login&switch=1`}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  <Shield size={14} /> Go to Real-Life Production Sign In
                </Link>
                <Link
                  to="/onboard-tenant"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', textDecoration: 'none' }}
                >
                  <Building2 size={14} /> Onboard Real Institution (1-Month Free Trial)
                </Link>
              </div>
            </div>
          ) : mode === 'voice-check' ? (
            <div>
              <VoiceChallengePanel
                mode="verify"
                actionAttempted={`LOGIN_${roleMeta.key}`}
                onSuccess={() => {
                  const user = sessionStore.getTenantUser();
                  const token = sessionStore.getTenantToken();
                  if (onAuthenticated) onAuthenticated(user, token);
                  navigate('/dashboard');
                }}
                onFailure={() => null}
              />
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                  onClick={() => {
                    const user = sessionStore.getTenantUser();
                    const token = sessionStore.getTenantToken();
                    if (onAuthenticated) onAuthenticated(user, token);
                    navigate('/dashboard');
                  }}
                >
                  Continue to Dashboard <ArrowRight size={14} />
                </button>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Volume2 size={13} /> Voice verification logs audited
                </span>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: 28 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <Link
                  to={`/login/${roleMeta.slug}?env=production&mode=login&switch=1`}
                  className={mode === 'login' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ flex: '1 1 110px', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <Lock size={15} /> Sign In
                </Link>
                <Link
                  to={`/login/${roleMeta.slug}?env=production&mode=register&switch=1`}
                  className={mode === 'register' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ flex: '1 1 130px', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <UserCheck size={15} /> Register ({ROLES_META.length} Roles)
                </Link>
                <Link
                  to={`/login/${roleMeta.slug}?env=production&mode=dev-hidden&switch=1`}
                  className={mode === 'dev-hidden' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    flex: '1 1 140px',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    borderColor: mode === 'dev-hidden' ? '#DC2626' : 'rgba(220,38,38,0.45)',
                    color: mode === 'dev-hidden' ? '#FFFFFF' : '#FCA5A5',
                  }}
                >
                  <Lock size={15} /> Developer Portal
                </Link>
              </div>

              {error && (
                <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', fontSize: '0.84rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertTriangle size={16} /> <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.4)', color: '#34D399', fontSize: '0.84rem', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <CheckCircle2 size={16} /> <span>{successMsg}</span>
                </div>
              )}

              {mode === 'login' && (
                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="gbs-label">Institutional Email</label>
                    <input
                      type="email"
                      required
                      className="gbs-input"
                      value={email}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEmail(val);
                        if (val.trim().toLowerCase() === 'gabosei48@gmail.com') {
                          setShowLoginPwd(false);
                        }
                      }}
                      placeholder={roleMeta.emailHint || 'user@institution.com'}
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label className="gbs-label">Password</label>
                    <div className="gbs-password-wrap">
                      <input
                        type={isPermanentDevTyped ? 'password' : (showLoginPwd ? 'text' : 'password')}
                        required
                        className="gbs-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your secure password"
                        autoComplete="current-password"
                      />
                      {!isPermanentDevTyped && (
                        <button
                          type="button"
                          className="gbs-password-toggle"
                          aria-label={showLoginPwd ? 'Hide password' : 'Show password'}
                          onClick={() => setShowLoginPwd((prev) => !prev)}
                        >
                          {showLoginPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="gbs-label">2FA TOTP Code (If Enabled)</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="gbs-input"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      placeholder="6-digit authenticator code (optional)"
                    />
                  </div>

                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 4 }}>
                    <Shield size={16} />
                    {submitting ? 'Authenticating...' : `Sign In to ${roleMeta.title}`}
                  </button>
                </form>
              )}

              {mode === 'register' && (
                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">First Name</label>
                      <input
                        type="text"
                        required
                        className="gbs-input"
                        value={regData.firstName}
                        onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
                        placeholder="Kwame"
                      />
                    </div>
                    <div>
                      <label className="gbs-label">Last Name</label>
                      <input
                        type="text"
                        required
                        className="gbs-input"
                        value={regData.lastName}
                        onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
                        placeholder="Mensah"
                      />
                    </div>
                  </div>

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Email Address</label>
                      <input
                        type="email"
                        required
                        className="gbs-input"
                        value={regData.email}
                        onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                        placeholder="name@company.com"
                      />
                    </div>
                    <div>
                      <label className="gbs-label">Mobile Number (SMS OTP)</label>
                      <input
                        type="tel"
                        required
                        className="gbs-input"
                        value={regData.phone}
                        onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
                        placeholder="+233240000000"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gbs-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><MapPin size={12} /> Digital GPS Address (Required for Location Lookup)</span>
                      <button type="button" onClick={detectRegGps} style={{ background: 'none', border: 'none', color: '#D4AF37', cursor: 'pointer', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Crosshair size={11} /> Detect GPS Coords
                      </button>
                    </label>
                    <input
                      type="text"
                      required
                      className="gbs-input"
                      value={regData.gpsAddress}
                      onChange={(e) => setRegData({ ...regData, gpsAddress: e.target.value })}
                      placeholder="e.g. GA-183-8164 or Digital Street GPS"
                    />
                  </div>

                  <div>
                    <label className="gbs-label">Approved Lending Institution</label>
                    <select
                      className="gbs-select"
                      required={approvedTenants.length > 0}
                      value={regData.tenantCode}
                      onChange={(e) => setRegData({ ...regData, tenantCode: e.target.value })}
                    >
                      <option value="">{approvedTenants.length > 0 ? 'Select Approved Institution...' : 'No approved institutions yet'}</option>
                      {approvedTenants.map((t) => (
                        <option key={t.id} value={t.code}>
                          {t.name} ({t.city}) — {t.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="gbs-label">Account Role (All {ROLES_META.length} System Roles Supported)</label>
                    <select
                      className="gbs-select"
                      value={regData.role}
                      onChange={(e) => setRegData({ ...regData, role: e.target.value })}
                    >
                      {ROLES_META.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.title} ({r.category}){['MEMBER_PORTAL', 'GUARANTOR_PORTAL'].includes(r.key) ? '' : ' — Requires Company Owner Approval'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="gbs-label">Password (Min 6 chars)</label>
                    <div className="gbs-password-wrap">
                      <input
                        type={showRegPwd ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="gbs-input"
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        placeholder="Create password"
                      />
                      <button
                        type="button"
                        className="gbs-password-toggle"
                        aria-label={showRegPwd ? 'Hide password' : 'Show password'}
                        onClick={() => setShowRegPwd((prev) => !prev)}
                      >
                        {showRegPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    {submitting ? 'Creating Account & Dispatching OTP...' : 'Create Account & Verify Mobile'}
                  </button>
                </form>
              )}

              {mode === 'verify-otp' && (
                <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p style={{ fontSize: '0.84rem', color: '#CBD5E1' }}>{otpNotice}</p>
                  <div>
                    <label className="gbs-label">Phone Number</label>
                    <input
                      type="text"
                      required
                      className="gbs-input"
                      value={otpPhone}
                      onChange={(e) => setOtpPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="gbs-label">6-Digit Verification Code</label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      className="gbs-input"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="000000"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                      <KeyRound size={16} /> {submitting ? 'Verifying OTP...' : 'Confirm OTP & Activate'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleResendOtp}
                      className="btn btn-secondary"
                      style={{ justifyContent: 'center' }}
                    >
                      Resend OTP Code
                    </button>
                  </div>
                </form>
              )}

              {mode === 'dev-hidden' && (
                <form onSubmit={handleHiddenDevSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ fontSize: '0.8rem', color: '#FCA5A5', borderLeft: '3px solid #EF4444', paddingLeft: 10 }}>
                    Restricted Authority Verification Required. Password entry is strictly masked.
                  </div>
                  <div>
                    <label className="gbs-label">Permanent Developer Gmail</label>
                    <input
                      type="email"
                      required
                      className="gbs-input"
                      value={devEmail}
                      onChange={(e) => setDevEmail(e.target.value)}
                      placeholder="gabosei48@gmail.com"
                      autoComplete="username"
                    />
                  </div>
                  <div>
                    <label className="gbs-label">Developer Master Password</label>
                    <input
                      type="password"
                      required
                      className="gbs-input"
                      value={devPassword}
                      onChange={(e) => setDevPassword(e.target.value)}
                      placeholder="Enter required password"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="gbs-label">Developer TOTP (If Enabled)</label>
                    <input
                      type="text"
                      maxLength={6}
                      className="gbs-input"
                      value={devTotp}
                      onChange={(e) => setDevTotp(e.target.value)}
                      placeholder="Optional 6-digit code"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" disabled={submitting} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                      <Lock size={15} /> {submitting ? 'Verifying...' : 'Unlock System Authority'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setMode('login'); setError(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Institutional Tenant Onboarding, Demo Walkthrough & Developer Authority CTA */}
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(212,175,55,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    Want to explore features before onboarding a live institution?
                  </span>
                  <Link
                    to={`/login/${roleMeta.slug}?env=demo&switch=1`}
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.78rem', borderColor: 'rgba(245,158,11,0.5)', color: '#FDE68A', textDecoration: 'none' }}
                  >
                    <PlayCircle size={14} /> Launch Interactive Demo Walkthrough
                  </Link>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    Onboarding a new lending institution (1-Month Free Trial)?
                  </span>
                  <Link
                    to="/onboard-tenant"
                    className="btn btn-secondary"
                    style={{ padding: '7px 12px', fontSize: '0.78rem', textDecoration: 'none' }}
                  >
                    <Building2 size={14} /> Institutional Onboarding Form
                  </Link>
                </div>

                <div
                  style={{
                    paddingTop: 10,
                    borderTop: '1px dashed rgba(220,38,38,0.28)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>
                    System Developer? Approve new institutions &amp; manage tenant locks:
                  </span>
                  <Link
                    to={mode === 'dev-hidden'
                      ? `/login/${roleMeta.slug}?env=production&mode=login&switch=1`
                      : `/login/${roleMeta.slug}?env=production&dev=1&switch=1`}
                    className="btn btn-secondary"
                    style={{
                      padding: '7px 12px',
                      fontSize: '0.78rem',
                      borderColor: 'rgba(220,38,38,0.55)',
                      color: '#FCA5A5',
                      textDecoration: 'none',
                    }}
                  >
                    <Lock size={13} /> {mode === 'dev-hidden' ? 'Open Role Sign In' : 'Developer Dashboard Sign In'}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
