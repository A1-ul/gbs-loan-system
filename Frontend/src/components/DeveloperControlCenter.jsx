import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, Cpu, Lock, Unlock, Database, RefreshCw, Activity, Building2,
  MapPin, ShieldAlert, Send, CheckCircle2, XCircle, Clock, LogOut, Wrench
} from 'lucide-react';
import { io } from 'socket.io-client';
import { devApi, sessionStore } from '../services/api';
import { DEVELOPER_PORTAL_META } from '../constants/rolesMeta';
import LiveLocationTrackerMap from './LiveLocationTrackerMap';

/**
 * Hidden Developer Control Center (Step 5 Master Blueprint + Multi-Tenant SaaS Landlord)
 * Strictly backed by isolated DeveloperUser JWT + live PostgreSQL + Redis + PgDump + Leaflet GIS.
 */
export default function DeveloperControlCenter({ onLogout }) {
  const [activeTab, setActiveTab] = useState('TENANTS'); // TENANTS | GIS_MAP | DIAGNOSTICS | LOCK_SUBS | BACKUPS | MESSAGES
  const [dashboard, setDashboard] = useState(null);
  const [perf, setPerf] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [pendingTenants, setPendingTenants] = useState([]);
  const [gisData, setGisData] = useState({ features: [] });
  const [logs, setLogs] = useState([]);
  const [crashes, setCrashes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [backups, setBackups] = useState([]);
  const [aiDiag, setAiDiag] = useState(null);
  const [messages, setMessages] = useState([]);

  const [msgForm, setMsgForm] = useState({ tenantId: '', title: '', body: '', messageType: 'ANNOUNCEMENT' });
  const [lockReason, setLockReason] = useState('');
  const [rejectReasons, setRejectReasons] = useState({});
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const navigate = useNavigate();

  const devUser = sessionStore.getDevUser();

  const notify = (text, isErr = false) => {
    setToast({ text, isErr });
    setTimeout(() => setToast(null), 4500);
  };

  const fetchAll = useCallback(async () => {
    try {
      const [
        dashRes,
        perfRes,
        tenantsRes,
        pendingRes,
        gisRes,
        logsRes,
        crashRes,
        alertsRes,
        backupsRes,
        msgsRes,
      ] = await Promise.all([
        devApi.get('/developer/dashboard'),
        devApi.get('/developer/performance'),
        devApi.get('/developer/tenants'),
        devApi.get('/developer/tenants/pending'),
        devApi.get('/developer/locations/live'),
        devApi.get('/developer/logs'),
        devApi.get('/developer/crash-reports'),
        devApi.get('/developer/security-alerts'),
        devApi.get('/developer/backups'),
        devApi.get('/developer/messages'),
      ]);

      setDashboard(dashRes.data?.data || null);
      setPerf(perfRes.data?.data || null);
      setTenants(tenantsRes.data?.data || []);
      setPendingTenants(pendingRes.data?.data || []);
      setGisData(gisRes.data?.data || { features: [] });
      setLogs(logsRes.data?.logs || []);
      setCrashes(crashRes.data?.data || []);
      setAlerts(alertsRes.data?.data || []);
      setBackups(backupsRes.data?.data || []);
      setMessages(msgsRes.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        sessionStore.clearDevSession();
        navigate('/dev-portal/login');
      } else {
        notify(err.response?.data?.message || 'Error refreshing developer telemetry', true);
      }
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();

    // Live Socket.IO telemetry stream for GPS pings & onboarding submissions
    const socket = io('/', { transports: ['websocket', 'polling'] });
    socket.on('developer:gps_update', (pin) => {
      setGisData((prev) => ({
        ...prev,
        features: [
          pin,
          ...(prev.features || []).filter((f) => f.id !== pin.id),
        ],
      }));
    });
    socket.on('tenant:onboarded', () => {
      fetchAll();
      notify('New institutional onboarding application received!');
    });

    const timer = setInterval(fetchAll, 20000);
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [fetchAll]);

  const handleApproveTenant = async (id, name) => {
    setBusyAction(`approve-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/approve`, { trialDays: 90 });
      notify(`Institution "${name}" APPROVED! 90-day trial countdown activated.`);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Approval failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleRejectTenant = async (id, name) => {
    const reason = rejectReasons[id] || 'Incomplete regulatory KYC documentation';
    setBusyAction(`reject-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/reject`, { reason });
      notify(`Institution "${name}" rejected.`);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Rejection failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleRenewTenant = async (id, days = 90) => {
    setBusyAction(`renew-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/renew`, { extensionDays: days, note: `Extended +${days} days` });
      notify(`Subscription renewed (+${days} days) and unlocked.`);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Renewal failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleLockTenant = async (id) => {
    setBusyAction(`lock-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/lock`, { reason: 'Locked by Developer Control Authority' });
      notify('Tenant locked.');
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Lock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleToggleGlobalLock = async () => {
    const currentlyLocked = Boolean(dashboard?.systemLock?.isLocked);
    setBusyAction('global-lock');
    try {
      const endpoint = currentlyLocked ? '/developer/system-unlock' : '/developer/system-lock';
      await devApi.post(endpoint, {
        isLocked: !currentlyLocked,
        maintenanceMode: !currentlyLocked,
        lockReason: lockReason || (!currentlyLocked ? 'Emergency System Maintenance by Lead Developer' : 'Lock Released'),
      });
      notify(`Platform ${!currentlyLocked ? 'LOCKED' : 'UNLOCKED'} globally.`);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to update lock state', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleRunDiagnostics = async () => {
    setBusyAction('ai-diag');
    try {
      const res = await devApi.get('/developer/diagnostics');
      setAiDiag(res.data?.data || res.data);
      notify('Live system & blueprint compliance diagnostics complete.');
    } catch (err) {
      notify(err.response?.data?.message || 'Diagnostics error', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleCreateBackup = async () => {
    setBusyAction('backup-new');
    try {
      await devApi.post('/developer/backups', { type: 'FULL_PG_DUMP' });
      notify('Live PostgreSQL snapshot created cleanly!');
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Backup creation failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleRestoreBackup = async (id) => {
    setBusyAction(`restore-${id}`);
    try {
      await devApi.post(`/developer/backups/${id}/restore`);
      notify('Backup validated and restore sequence executed!');
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Restore failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await devApi.post(`/developer/security-alerts/${id}/resolve`);
      notify('Security alert marked resolved.');
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Could not resolve alert', true);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    setBusyAction('send-msg');
    try {
      await devApi.post('/developer/messages', {
        tenantId: msgForm.tenantId || null,
        title: msgForm.title,
        body: msgForm.body,
        messageType: msgForm.messageType,
      });
      notify(msgForm.tenantId ? 'Direct message delivered to Tenant.' : 'Broadcast delivered to ALL Tenants.');
      setMsgForm({ tenantId: '', title: '', body: '', messageType: 'ANNOUNCEMENT' });
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Message dispatch failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleLogout = async () => {
    await devApi.post('/developer/auth/logout').catch(() => null);
    sessionStore.clearDevSession();
    if (onLogout) onLogout();
    navigate('/dev-portal/login');
  };

  const isGlobalLocked = Boolean(dashboard?.systemLock?.isLocked);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Top Isolated Landlord Navigation Bar */}
      <header className="header-bar" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
        <div className="logo-section">
          <div className="logo-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #991B1B)', color: '#FFF' }}>
            <Terminal size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#F87171', fontSize: '1rem' }}>
              GBS HIDDEN DEVELOPER CONTROL CENTER
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Landlord: {devUser?.username || devUser?.email || 'Lead Developer'} • Isolated Security Plane
            </div>
          </div>
        </div>

        <div className="header-actions">
          <span className={`badge ${isGlobalLocked ? 'badge-danger' : 'badge-success'}`}>
            {isGlobalLocked ? 'GLOBAL SYSTEM LOCKED' : 'PLATFORM ONLINE'}
          </span>
          <button type="button" className="btn btn-secondary" onClick={fetchAll} style={{ padding: '7px 12px' }}>
            <RefreshCw size={14} /> Refresh Telemetry
          </button>
          <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ padding: '7px 12px' }}>
            <LogOut size={14} /> Exit Dev Portal
          </button>
        </div>
      </header>

      <main className="app-main-content">
        {/* Unique Real-Life Developer Portal Photography Hero Banner */}
        <div className="role-hero-banner">
          <img src={DEVELOPER_PORTAL_META.dashboardImage} alt="Developer Control Center" className="role-hero-bg" />
          <div className="role-hero-overlay">
            <div>
              <span className="badge badge-danger" style={{ marginBottom: 8 }}>MULTI-TENANT LANDLORD AUTHORITY</span>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{DEVELOPER_PORTAL_META.title}</h1>
              <p style={{ margin: '4px 0 0', color: '#CBD5E1', fontSize: '0.88rem' }}>{DEVELOPER_PORTAL_META.subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>PENDING APPROVALS</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: pendingTenants.length > 0 ? '#FBBF24' : '#34D399' }}>
                  {pendingTenants.length}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>ACTIVE TENANTS</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D4AF37' }}>
                  {dashboard?.counts?.activeTenants ?? tenants.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: 18,
              borderRadius: 10,
              background: toast.isErr ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)',
              border: `1px solid ${toast.isErr ? '#EF4444' : '#10B981'}`,
              color: toast.isErr ? '#FCA5A5' : '#34D399',
              fontWeight: 600,
            }}
          >
            {toast.text}
          </div>
        )}

        {/* Live Telemetry Strip (100% Real PostgreSQL + OS Process Telemetry) */}
        <div className="dashboard-grid">
          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>POSTGRESQL / REDIS</div>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: '#34D399' }}>
                {perf?.dbConnected ? `DB ${perf.dbLatencyMs}ms` : 'CHECK DB'} • {perf?.redisConnected ? `Redis ${perf.redisLatencyMs}ms` : 'Redis Offline'}
              </div>
            </div>
            <Database size={26} color="#10B981" />
          </div>

          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>MEMORY &amp; CPU LOAD</div>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: '#38BDF8' }}>
                {perf?.rssMb || 0} MB RSS • {perf?.cpuLoad1m ?? 0} Load
              </div>
            </div>
            <Cpu size={26} color="#38BDF8" />
          </div>

          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>GLOBAL PORTFOLIO SCALE</div>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: '#D4AF37' }}>
                {dashboard?.counts?.totalMembers || 0} Borrowers • {dashboard?.counts?.totalLoans || 0} Loans
              </div>
            </div>
            <Activity size={26} color="#D4AF37" />
          </div>

          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>SOCKETS &amp; COLLECTORS</div>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: '#F97316' }}>
                {perf?.activeConnections ?? 0} Live Sockets • {dashboard?.counts?.activeCollectors ?? 0} Collectors
              </div>
            </div>
            <MapPin size={26} color="#F97316" />
          </div>
        </div>

        {/* Subsystem Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {[
            { id: 'TENANTS', label: `Tenant Approvals & Subscriptions (${pendingTenants.length} Pending)`, icon: Building2 },
            { id: 'GIS_MAP', label: 'Live Tenant & Collector GIS Map', icon: MapPin },
            { id: 'DIAGNOSTICS', label: 'AI Diagnostics, Crashes & Logs', icon: Wrench },
            { id: 'LOCK_SUBS', label: 'System Lock/Unlock & Security Alerts', icon: ShieldAlert },
            { id: 'BACKUPS', label: 'PgDump Backups & Recovery', icon: Database },
            { id: 'MESSAGES', label: 'Broadcast to Tenants', icon: Send },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={activeTab === t.id ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: TENANTS & PENDING INSTITUTIONAL APPROVALS */}
        {activeTab === 'TENANTS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(245,158,11,0.4)' }}>
              <h3 style={{ margin: '0 0 12px', color: '#FBBF24' }}>
                Pending Institutional Onboarding Queue ({pendingTenants.length})
              </h3>
              {pendingTenants.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No pending institutions awaiting approval.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {pendingTenants.map((t) => (
                    <div key={t.id} style={{ background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#FFF' }}>{t.name} ({t.code})</div>
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
                          {t.institutionType} • {t.city}, {t.country} • Rep: {t.representativeName} ({t.representativeEmail})
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                          Reg: {t.registrationNumber || 'N/A'} • License: {t.businessLicenseNumber || 'N/A'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="gbs-input"
                          style={{ width: 200, padding: '6px 10px', fontSize: '0.78rem' }}
                          placeholder="Rejection reason (optional)"
                          value={rejectReasons[t.id] || ''}
                          onChange={(e) => setRejectReasons({ ...rejectReasons, [t.id]: e.target.value })}
                        />
                        <button
                          type="button"
                          disabled={busyAction === `approve-${t.id}`}
                          onClick={() => handleApproveTenant(t.id, t.name)}
                          className="btn btn-primary"
                          style={{ padding: '8px 14px' }}
                        >
                          <CheckCircle2 size={15} /> Approve (Start 90d Trial)
                        </button>
                        <button
                          type="button"
                          disabled={busyAction === `reject-${t.id}`}
                          onClick={() => handleRejectTenant(t.id, t.name)}
                          className="btn btn-danger"
                          style={{ padding: '8px 14px' }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>All Registered Institutions &amp; 90-Day Countdown Ledger</h3>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Institution</th>
                      <th>Code / Location</th>
                      <th>Onboarding</th>
                      <th>Operational Status</th>
                      <th>Trial Days Left</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.name}</strong>
                          <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{t.representativeEmail}</div>
                        </td>
                        <td>{t.code} • {t.city || 'Accra'}</td>
                        <td>
                          <span className={`badge ${['APPROVED', 'ACTIVE_TRIAL'].includes(t.onboardingStatus) ? 'badge-success' : t.onboardingStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                            {t.onboardingStatus}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${t.status === 'ACTIVE' ? 'badge-success' : t.status === 'EXPIRING_SOON' ? 'badge-warning' : 'badge-danger'}`}>
                            {t.status}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: (t.daysLeft || 0) <= 10 ? '#F87171' : '#34D399' }}>
                            <Clock size={14} /> {t.daysLeft ?? 0}d
                          </span>
                        </td>
                        <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {!['APPROVED', 'ACTIVE_TRIAL'].includes(t.onboardingStatus) && (
                            <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleApproveTenant(t.id, t.name)}>
                              Approve
                            </button>
                          )}
                          <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleRenewTenant(t.id, 90)}>
                            +90 Days
                          </button>
                          <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleLockTenant(t.id)}>
                            Lock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REAL INTERACTIVE GIS MAP */}
        {activeTab === 'GIS_MAP' && (
          <LiveLocationTrackerMap markers={gisData.features || []} />
        )}

        {/* TAB 3: AI DIAGNOSTICS, CRASHES & DEVELOPER LOGS */}
        {activeTab === 'DIAGNOSTICS' && (
          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, color: '#00F2FE' }}>Live Architecture &amp; DB Diagnostics</h3>
                <button type="button" className="btn btn-primary" onClick={handleRunDiagnostics} disabled={busyAction === 'ai-diag'}>
                  {busyAction === 'ai-diag' ? 'Scanning...' : 'Run Live Audit'}
                </button>
              </div>
              {aiDiag ? (
                <pre style={{ background: '#040810', padding: 14, borderRadius: 10, fontSize: '0.76rem', color: '#CBD5E1', overflowX: 'auto', maxHeight: 340 }}>
                  {JSON.stringify(aiDiag, null, 2)}
                </pre>
              ) : (
                <p style={{ fontSize: '0.84rem', color: '#94A3B8' }}>
                  Click &ldquo;Run Live Audit&rdquo; to inspect codebase 0B integrity, Prisma DB health, and blueprint structure live.
                </p>
              )}

              <h4 style={{ marginTop: 18, color: '#F87171' }}>Recorded System Crashes / Diagnostics ({crashes.length})</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                {crashes.map((c) => (
                  <div key={c.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.78rem' }}>
                    <div style={{ fontWeight: 700, color: '#FCA5A5' }}>{c.issueType || c.severity} — {c.component}</div>
                    <div style={{ color: '#E2E8F0' }}>{c.description}</div>
                  </div>
                ))}
                {crashes.length === 0 && <div style={{ fontSize: '0.8rem', color: '#34D399' }}>Zero unhandled crashes recorded.</div>}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Developer Landlord Audit Stream ({logs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
                {logs.map((l) => (
                  <div key={l.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F4E07B', fontWeight: 700 }}>
                      <span>{l.type}</span>
                      <span style={{ color: '#64748B', fontWeight: 400 }}>{l.time ? new Date(l.time).toLocaleString() : ''}</span>
                    </div>
                    <div style={{ color: '#CBD5E1', marginTop: 3 }}>{l.msg}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM GLOBAL LOCK & SECURITY ALERTS */}
        {activeTab === 'LOCK_SUBS' && (
          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 10px', color: '#F87171' }}>Global Emergency Kill Switch</h3>
              <p style={{ fontSize: '0.84rem', color: '#CBD5E1' }}>
                Locking the platform immediately blocks all Tenant APIs (`503 SERVICE UNAVAILABLE`) while keeping the Hidden Developer Control Center online.
              </p>
              <div style={{ margin: '14px 0' }}>
                <label className="gbs-label">Maintenance / Lock Notice</label>
                <input
                  type="text"
                  className="gbs-input"
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Scheduled database maintenance / Security freeze"
                />
              </div>
              <button
                type="button"
                disabled={busyAction === 'global-lock'}
                onClick={handleToggleGlobalLock}
                className={isGlobalLocked ? 'btn btn-primary' : 'btn btn-danger'}
              >
                {isGlobalLocked ? <><Unlock size={16} /> Unlock Platform Globally</> : <><Lock size={16} /> Lock Platform Globally</>}
              </button>
            </div>

            <div className="glass-panel" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 12px', color: '#FBBF24' }}>Live Security Alerts ({alerts.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {alerts.map((a) => (
                  <div key={a.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: a.resolved ? '#34D399' : '#FBBF24' }}>
                        [{a.severity}] {a.alertType}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>{a.message}</div>
                    </div>
                    {!a.resolved && (
                      <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleResolveAlert(a.id)}>
                        Resolve
                      </button>
                    )}
                  </div>
                ))}
                {alerts.length === 0 && <div style={{ color: '#34D399', fontSize: '0.85rem' }}>All security alerts cleared.</div>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PGDUMP BACKUPS & RECOVERY */}
        {activeTab === 'BACKUPS' && (
          <div className="glass-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: '#D4AF37' }}>PostgreSQL Real PgDump Snapshots ({backups.length})</h3>
              <button type="button" className="btn btn-primary" onClick={handleCreateBackup} disabled={busyAction === 'backup-new'}>
                {busyAction === 'backup-new' ? 'Dumping PostgreSQL...' : 'Create Live PgDump Snapshot'}
              </button>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Size</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.id}>
                      <td>{b.fileName}</td>
                      <td>{b.backupType}</td>
                      <td><span className="badge badge-success">{b.status}</span></td>
                      <td>{b.fileSizeBytes ? `${Math.round(Number(b.fileSizeBytes) / 1024)} KB` : 'Verified'}</td>
                      <td>{new Date(b.createdAt).toLocaleString()}</td>
                      <td>
                        <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.76rem' }} onClick={() => handleRestoreBackup(b.id)}>
                          Verify / Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DEVELOPER -> TENANT DIRECT & BROADCAST MESSAGES */}
        {activeTab === 'MESSAGES' && (
          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Dispatch Notice to Tenant(s)</h3>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="gbs-label">Target Institution</label>
                  <select className="gbs-select" value={msgForm.tenantId} onChange={(e) => setMsgForm({ ...msgForm, tenantId: e.target.value })}>
                    <option value="">ALL APPROVED TENANTS (Platform Broadcast)</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="gbs-label">Message Subject</label>
                  <input type="text" required className="gbs-input" value={msgForm.title} onChange={(e) => setMsgForm({ ...msgForm, title: e.target.value })} placeholder="Scheduled Regulatory Update" />
                </div>
                <div>
                  <label className="gbs-label">Message Body</label>
                  <textarea rows={4} required className="gbs-textarea" value={msgForm.body} onChange={(e) => setMsgForm({ ...msgForm, body: e.target.value })} placeholder="Official instructions from GBS Lead Developer..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={busyAction === 'send-msg'}>
                  <Send size={15} /> Dispatch Official Message
                </button>
              </form>
            </div>

            <div className="glass-panel" style={{ padding: 22 }}>
              <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Dispatched Communications ({messages.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                {messages.map((m) => (
                  <div key={m.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(0,242,254,0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700, color: '#F4E07B' }}>
                      <span>{m.title}</span>
                      <span className="badge badge-cyan">{m.tenant?.name || 'ALL TENANTS'}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: '6px 0 0' }}>{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
