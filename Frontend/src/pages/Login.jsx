import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Shield, Lock, UserCheck, Building2, ArrowRight, Eye, EyeOff,
  KeyRound, CheckCircle2, AlertTriangle, Grid, Volume2, MapPin, Crosshair
} from 'lucide-react';
import api, { devApi, sessionStore, getDeviceFingerprint } from '../services/api';
import { ROLES_META, resolveRoleMeta } from '../constants/rolesMeta';
import VoiceChallengePanel from '../components/VoiceChallengePanel';

/**
 * GBS Loan Management System — Dedicated Role-Specific Login & All-30-Role Account Registration
 * RULE: Hidden Developer Dashboard opens only from the Main Login Page via strictly masked password entry.
 * RULE: Tenant Login & Registration include Show/Hide Password eye toggles + GPS Address collection.
 */
export default function Login({ onAuthenticated, onDevAuthenticated }) {
  const { roleSlug } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleMeta = resolveRoleMeta(roleSlug || 'member-portal');
  const [mode, setMode] = useState(() => (searchParams.get('dev') === '1' ? 'dev-hidden' : 'login')); // 'login' | 'register' | 'verify-otp' | 'voice-check' | 'directory' | 'dev-hidden'
  const [approvedTenants, setApprovedTenants] = useState([]);

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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setRegData((prev) => ({ ...prev, role: roleMeta.key }));
    setError('');
  }, [roleMeta.key]);

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

  const groupedRoles = ROLES_META.reduce((acc, r) => {
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

          <button
            type="button"
            onClick={() => setMode(mode === 'directory' ? 'login' : 'directory')}
            className="btn btn-secondary"
            style={{ padding: '7px 12px', fontSize: '0.78rem' }}
          >
            <Grid size={14} /> {mode === 'directory' ? 'Back to Sign In' : 'All 30 Role Portals'}
          </button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
          <span
            className="badge badge-gold"
            style={{ marginBottom: 10, borderColor: roleMeta.accent, color: roleMeta.accent }}
          >
            {roleMeta.category}
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
            {roleMeta.title} Portal
          </h1>
          <p style={{ fontSize: '0.94rem', color: '#E2E8F0', maxWidth: 520, marginBottom: 18 }}>
            {roleMeta.subtitle}
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="badge badge-success">PostgreSQL Multi-Tenant</span>
            <span className="badge badge-cyan">Live SMS OTP</span>
            <span className="badge badge-gold">30 RBAC Portals</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: Authentication, All-30-Role Self-Registration, Voice Check or 30-Role Directory */}
      <div className="split-login-form-pane">
        <div style={{ maxWidth: 540, width: '100%', margin: '0 auto' }}>
          {mode === 'directory' ? (
            <div>
              <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: 6 }}>
                Select Your Institutional Role Portal (All 30 Roles)
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: 16 }}>
                Each portal features tailored dashboards, GPS tracking, and dedicated authentication security.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '72vh', overflowY: 'auto', paddingRight: 4 }}>
                {Object.entries(groupedRoles).map(([cat, items]) => (
                  <div key={cat}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D4AF37', textTransform: 'uppercase', marginBottom: 8 }}>
                      {cat}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
                      {items.map((r) => (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => {
                            setMode('login');
                            navigate(`/login/${r.slug}`);
                          }}
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
                          }}
                        >
                          <img
                            src={r.loginImage}
                            alt={r.title}
                            style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                          />
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{r.title}</div>
                            <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>/login/{r.slug}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
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
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  className={mode === 'login' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ flex: '1 1 110px', justifyContent: 'center' }}
                >
                  <Lock size={15} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); }}
                  className={mode === 'register' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ flex: '1 1 130px', justifyContent: 'center' }}
                >
                  <UserCheck size={15} /> Register (30 Roles)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccessMsg('');
                    setDevEmail((prev) => prev || 'gabosei48@gmail.com');
                    setMode((prev) => (prev === 'dev-hidden' ? 'login' : 'dev-hidden'));
                  }}
                  className={mode === 'dev-hidden' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{
                    flex: '1 1 140px',
                    justifyContent: 'center',
                    borderColor: mode === 'dev-hidden' ? '#DC2626' : 'rgba(220,38,38,0.45)',
                    color: mode === 'dev-hidden' ? '#FFFFFF' : '#FCA5A5',
                  }}
                >
                  <Lock size={15} /> Developer Portal
                </button>
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
                    <label className="gbs-label">Account Role (All 30 System Roles Supported)</label>
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
                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    <KeyRound size={16} /> {submitting ? 'Verifying OTP...' : 'Confirm OTP & Activate'}
                  </button>
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

              {/* Institutional Tenant Onboarding & Developer Authority CTA */}
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
                    Onboarding a new lending institution (1-Month Free Trial)?
                  </span>
                  <Link to="/onboard-tenant" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.78rem' }}>
                    <Building2 size={14} /> Institutional Onboarding Form <ArrowRight size={13} />
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
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setSuccessMsg('');
                      setDevEmail((prev) => prev || 'gabosei48@gmail.com');
                      setMode((prev) => (prev === 'dev-hidden' ? 'login' : 'dev-hidden'));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="btn btn-secondary"
                    style={{
                      padding: '7px 12px',
                      fontSize: '0.78rem',
                      borderColor: 'rgba(220,38,38,0.55)',
                      color: '#FCA5A5',
                    }}
                  >
                    <Lock size={13} /> {mode === 'dev-hidden' ? 'Back to Role Sign In' : 'Developer Dashboard Sign In'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
