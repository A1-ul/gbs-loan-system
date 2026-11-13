import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShieldAlert, Lock, AlertTriangle } from 'lucide-react';
import { devApi, sessionStore, getDeviceFingerprint } from '../services/api';
import { DEVELOPER_PORTAL_META } from '../constants/rolesMeta';

/**
 * Isolated Hidden Developer Authority Authentication Page (/dev-portal/login)
 * Never linked from public tenant pages or navigation bars.
 */
export default function DeveloperLogin({ onDevAuthenticated }) {
  const [email, setEmail] = useState('gabosei48@gmail.com');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        email: email.trim(),
        password,
        deviceFingerprint: getDeviceFingerprint(),
      };
      if (totpToken.trim()) payload.totpToken = totpToken.trim();

      const res = await devApi.post('/developer/auth/login', payload);
      const data = res.data?.data || {};
      const token = data.accessToken || data.token;
      const developer = data.developer || data.user;

      if (!token || !developer) {
        throw new Error('Developer authentication did not issue a landlord token.');
      }

      sessionStore.setDevSession(token, developer);
      if (onDevAuthenticated) onDevAuthenticated(developer, token);
      navigate('/dev-portal');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Developer Landlord authentication rejected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="split-login-layout">
      <div className="split-login-photo-pane">
        <img src={DEVELOPER_PORTAL_META.loginImage} alt="GBS Developer Landlord Control Center" className="hero-photo" />
        <div className="split-login-photo-scrim" />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="badge badge-danger">LANDLORD EXCLUSIVE • ISOLATED BOUNDARY</span>
          <span className="badge badge-gold">DEVELOPER_JWT_SECRET</span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#FFFFFF', marginBottom: 8 }}>
            {DEVELOPER_PORTAL_META.title}
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#CBD5E1', maxWidth: 500 }}>
            {DEVELOPER_PORTAL_META.subtitle}
          </p>
        </div>
      </div>

      <div className="split-login-form-pane">
        <div className="glass-panel" style={{ maxWidth: 440, width: '100%', margin: '0 auto', padding: 30, borderColor: 'rgba(239,68,68,0.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F87171' }}>
              <Terminal size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#F1F5F9' }}>Developer Landlord Sign In</h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#94A3B8' }}>
                Tenant Super Admins &amp; Managers are strictly blocked from this plane.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', fontSize: '0.84rem', display: 'flex', gap: 8 }}>
              <AlertTriangle size={16} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="gbs-label">Permanent Developer Gmail</label>
              <input
                type="email"
                required
                className="gbs-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter isolated landlord password (required)"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="gbs-label">Developer TOTP (If Configured)</label>
              <input
                type="text"
                maxLength={6}
                className="gbs-input"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value)}
                placeholder="Optional 6-digit code"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-danger" style={{ justifyContent: 'center', marginTop: 4 }}>
              <Lock size={16} />
              {loading ? 'Verifying Developer Authority...' : 'Unlock Developer Control Center'}
            </button>
          </form>

          <div style={{ marginTop: 18, fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={14} color="#F87171" /> All actions recorded in immutable DeveloperAuditLog.
          </div>
        </div>
      </div>
    </div>
  );
}

