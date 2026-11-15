import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PlayCircle, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import api, { sessionStore } from '../services/api';
import { resolveRoleMeta } from '../constants/rolesMeta';

export default function DemoLaunch({ onAuthenticated }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedRole = searchParams.get('role') || 'COMPANY_OWNER';
  const requestedTab = searchParams.get('tab') || 'OVERVIEW';
  const requestedLocate = searchParams.get('locate') || '';
  const roleMeta = resolveRoleMeta(requestedRole);

  const safeRoleTitle = roleMeta.key === 'FRAUD_INVESTIGATION' ? 'Risk & Compliance Review' : roleMeta.title;

  const [statusText, setStatusText] = useState(`Preparing isolated Demo Sandbox for ${safeRoleTitle}...`);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setStatusText(`Booting isolated Demo Walkthrough workspace for ${safeRoleTitle}...`);

    (async () => {
      try {
        const res = await api.post('/demo/walkthrough-session', { role: requestedRole });
        if (cancelled) return;
        const data = res.data?.data || res.data;
        if (!data?.accessToken || !data?.user) {
          throw new Error('Demo server did not return a valid sandbox session.');
        }
        sessionStore.setTenantSession(data.accessToken, data.user, data.refreshToken);
        onAuthenticated?.(data.user);

        const normalizedTab = String(requestedTab || 'OVERVIEW').toUpperCase();
        const basePath = normalizedTab !== 'OVERVIEW'
          ? `/dashboard/tab/${encodeURIComponent(normalizedTab)}`
          : '/dashboard';
        const nextParams = new URLSearchParams();
        if (requestedLocate) nextParams.set('locate', requestedLocate);
        const query = nextParams.toString();
        navigate(query ? `${basePath}?${query}` : basePath, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Unable to launch demo walkthrough session.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requestedRole, requestedTab, requestedLocate, attempt, navigate, onAuthenticated, roleMeta.title]);

  return (
    <div style={{
      minHeight: '100vh',
      overflowY: 'auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #1E1008 0%, #3E2115 35%, #4A1826 70%, #09111F 100%)',
      color: '#F8FAFC',
    }}>
      {error ? (
        <div className="glass-card" style={{ maxWidth: 460, width: '100%', padding: 28, textAlign: 'center', border: '1px solid rgba(245, 158, 11, 0.45)' }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14, margin: '0 auto 14px',
            background: 'rgba(245, 158, 11, 0.16)', border: '1px solid rgba(245, 158, 11, 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FCD34D',
          }}>
            <AlertTriangle size={26} />
          </div>
          <h2 style={{ color: '#F4E07B', margin: '8px 0', fontSize: '1.2rem' }}>
            Demo Session Launch Failed
          </h2>
          <p style={{ color: '#CBD5E1', fontSize: '0.88rem', lineHeight: 1.55, marginBottom: 20 }}>
            {error}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="btn btn-primary">
              <RefreshCw size={15} /> Retry Demo Launch
            </button>
            <Link to="/login?env=demo&switch=1" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
              Back to Demo Directory
            </Link>
          </div>
        </div>
      ) : (
        <div
          aria-label="Opening dashboard"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            border: '3px solid rgba(252, 211, 77, 0.25)',
            borderTopColor: '#FCD34D',
            animation: 'gbs-demo-spin 0.75s linear infinite',
          }}
        />
      )}
      <style>{`@keyframes gbs-demo-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

