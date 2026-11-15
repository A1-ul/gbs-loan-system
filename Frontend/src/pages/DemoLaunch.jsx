import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  PauseCircle,
  Download,
} from 'lucide-react';
import api, { sessionStore } from '../services/api';
import { resolveRoleMeta } from '../constants/rolesMeta';
import GbsBrandLogo from '../components/common/GbsBrandLogo';

export default function DemoLaunch({ onAuthenticated }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedRole = searchParams.get('role') || 'COMPANY_OWNER';
  const requestedTab = searchParams.get('tab') || 'OVERVIEW';
  const requestedLocate = searchParams.get('locate') || '';
  const holdNoticeParam = searchParams.get('hold') === '1';
  const roleMeta = resolveRoleMeta(requestedRole);

  const safeRoleTitle = roleMeta.key === 'FRAUD_INVESTIGATION' ? 'Risk & Compliance Review' : roleMeta.title;

  const [statusText, setStatusText] = useState(`Preparing isolated Learning & Observing Sandbox for ${safeRoleTitle}...`);
  const [readyTarget, setReadyTarget] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(2);
  const [paused, setPaused] = useState(holdNoticeParam);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef(null);

  const buildDashboardPath = () => {
    const normalizedTab = String(requestedTab || 'OVERVIEW').toUpperCase();
    const basePath = normalizedTab !== 'OVERVIEW'
      ? `/dashboard/tab/${encodeURIComponent(normalizedTab)}`
      : '/dashboard';
    const nextParams = new URLSearchParams();
    if (requestedLocate) nextParams.set('locate', requestedLocate);
    const query = nextParams.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  useEffect(() => {
    let cancelled = false;
    setError('');
    setReadyTarget(null);
    setSecondsLeft(2);
    setStatusText(`Booting isolated Learning & Observation session for ${safeRoleTitle}...`);

    (async () => {
      try {
        const res = await api.post(
          '/demo/walkthrough-session',
          { role: requestedRole },
          { headers: { 'X-Environment-Mode': 'DEMO_SANDBOX' } }
        );
        if (cancelled) return;
        const data = res.data?.data || res.data;
        if (!data?.accessToken || !data?.user) {
          throw new Error('Demo server did not return a valid sandbox session.');
        }
        // Strictly store Demo Learning session in per-tab sessionStorage (never touches Real Production session)
        sessionStore.setDemoSession(data.accessToken, data.user, data.refreshToken);
        onAuthenticated?.({ ...data.user, isDemo: true, environmentMode: 'DEMO_SANDBOX' });

        const targetPath = buildDashboardPath();
        setReadyTarget(targetPath);
        setStatusText(`Learning Sandbox Ready for ${safeRoleTitle}. Company Notice verified.`);
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || err?.message || 'Unable to launch demo walkthrough session.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedRole, requestedTab, requestedLocate, attempt, safeRoleTitle]);

  useEffect(() => {
    if (!readyTarget || paused || error) return undefined;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [readyTarget, paused, error]);

  useEffect(() => {
    if (!readyTarget || paused || error || secondsLeft > 0) return undefined;
    const navTimer = setTimeout(() => {
      navigate(readyTarget, { replace: true });
    }, 40);
    return () => clearTimeout(navTimer);
  }, [readyTarget, paused, error, secondsLeft, navigate]);

  return (
    <div
      className="gbs-watermark-bg"
      style={{
        minHeight: '100vh',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 18px',
        color: '#F8FAFC',
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 660,
          width: '100%',
          padding: '28px 26px',
          border: '1.5px solid rgba(212, 175, 55, 0.6)',
          background: 'rgba(6, 13, 28, 0.9)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.65), 0 0 36px rgba(212, 175, 55, 0.16)',
        }}
      >
        {/* Official Crest & Company Notice Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <GbsBrandLogo size={64} />
            <div>
              <span className="badge badge-gold" style={{ marginBottom: 6 }}>
                GBS® OFFICIAL COMPANY NOTICE
              </span>
              <h1 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.35rem', lineHeight: 1.25 }}>
                Demo Launch — Learning &amp; Observation Environment
              </h1>
              <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginTop: 2 }}>
                Intelligence Talks To Wisdom • Separated Training Sandbox (`DEMO-SANDBOX`)
              </div>
            </div>
          </div>

          <a
            href="/images/gbs-official-logo.jpeg"
            download="GBS-Official-Company-Logo.jpeg"
            className="btn btn-secondary"
            style={{ padding: '7px 11px', fontSize: '0.75rem', textDecoration: 'none', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}
          >
            <Download size={13} /> Save Crest (.jpeg)
          </a>
        </div>

        {/* Strict Two-Environment Separation Notice */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              padding: 13,
              borderRadius: 10,
              border: '1px solid rgba(245, 158, 11, 0.5)',
              background: 'rgba(120, 53, 15, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#FCD34D', fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>
              <PlayCircle size={15} /> ACTIVE: Learning &amp; Observing Mode
            </div>
            <div style={{ fontSize: '0.76rem', color: '#E2E8F0', lineHeight: 1.5 }}>
              Runs strictly inside <strong>DEMO-SANDBOX</strong> (isolated per browser tab). Safely explore dashboards,
              sample loans, GPS tracking, and simulated SMS/Email notices.
            </div>
          </div>

          <div
            style={{
              padding: 13,
              borderRadius: 10,
              border: '1px solid rgba(16, 185, 129, 0.4)',
              background: 'rgba(6, 78, 59, 0.22)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#34D399', fontWeight: 700, fontSize: '0.82rem', marginBottom: 4 }}>
              <ShieldCheck size={15} /> PROTECTED: Real-Life Production
            </div>
            <div style={{ fontSize: '0.76rem', color: '#CBD5E1', lineHeight: 1.5 }}>
              Real institutions, live borrower ledgers, staff approvals, and the Developer Control Center remain{' '}
              <strong>100% separate</strong> and untouched by Demo activity.
            </div>
          </div>
        </div>

        {/* Launch Metadata Strip */}
        <div
          style={{
            padding: '11px 14px',
            borderRadius: 10,
            border: '1px solid rgba(212, 175, 55, 0.28)',
            background: 'rgba(15, 27, 49, 0.72)',
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: '0.8rem',
          }}
        >
          <div>
            <span style={{ color: '#94A3B8' }}>Launching Portal:</span>{' '}
            <strong style={{ color: '#F4E07B' }}>{safeRoleTitle}</strong>
          </div>
          <div>
            <span style={{ color: '#94A3B8' }}>Module View:</span>{' '}
            <strong style={{ color: '#E2E8F0' }}>{String(requestedTab || 'OVERVIEW').toUpperCase()}</strong>
          </div>
          <div>
            <span style={{ color: '#94A3B8' }}>Boundary:</span>{' '}
            <strong style={{ color: '#34D399' }}>Isolated Tab Session</strong>
          </div>
        </div>

        {error ? (
          <div style={{ textAlign: 'center', paddingTop: 6 }}>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239, 68, 68, 0.16)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#FCA5A5',
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={16} /> <span>{error}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn btn-primary">
                <RefreshCw size={15} /> Retry Learning Sandbox Launch
              </button>
              <Link to="/login?env=demo&switch=1" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Back to Demo Directory
              </Link>
              <Link to="/login?env=production&switch=1" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                Go to Real-Life Production Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.86rem', color: '#E2E8F0' }}>
                {!readyTarget ? (
                  <span
                    aria-label="Opening dashboard"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      border: '2.5px solid rgba(252, 211, 77, 0.25)',
                      borderTopColor: '#FCD34D',
                      display: 'inline-block',
                      animation: 'gbs-demo-spin 0.75s linear infinite',
                    }}
                  />
                ) : (
                  <ShieldAlert size={18} color="#FBBF24" />
                )}
                <span>
                  {statusText}
                  {readyTarget && !paused ? ` Entering in ${secondsLeft}s...` : ''}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {readyTarget && (
                <button
                  type="button"
                  onClick={() => navigate(readyTarget, { replace: true })}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#09111F', fontWeight: 700 }}
                >
                  Enter Learning Dashboard Now <ArrowRight size={15} />
                </button>
              )}
              {readyTarget && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem' }}
                >
                  <PauseCircle size={15} /> {paused ? 'Resume Auto-Open' : 'Hold Notice to Read'}
                </button>
              )}
              <Link
                to="/login?env=production&mode=login&switch=1"
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', textDecoration: 'none' }}
              >
                Switch to Real-Life Production Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes gbs-demo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
