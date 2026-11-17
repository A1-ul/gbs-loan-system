import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Terminal, Cpu, Lock, Unlock, Database, RefreshCw, Activity, Building2,
  MapPin, ShieldAlert, Send, CheckCircle2, XCircle, Clock, LogOut, Wrench, Trash2, BookOpen, ArrowUpRight, ArrowLeft, Download, Video,
  MessageSquare, Star, Eye, Users, User
} from 'lucide-react';
import { io } from 'socket.io-client';
import api, { devApi, sessionStore, API_ORIGIN } from '../services/api';
import { DEVELOPER_PORTAL_META } from '../constants/rolesMeta';
import { BackButtonBar } from '../context/NavigationContext';
import LiveLocationTrackerMap from './LiveLocationTrackerMap';
import OperatingGuideModal from './OperatingGuideModal';
import RoleVideoPresentationModal from './RoleVideoPresentationModal';
import GbsBrandLogo from './common/GbsBrandLogo';

const DEV_VALID_TABS = ['TENANTS', 'USERS', 'GIS_MAP', 'ACTIVITIES', 'DIAGNOSTICS', 'LOCK_SUBS', 'BACKUPS', 'MESSAGES', 'FEEDBACKS'];

/**
 * Hidden Developer Control Center (Step 5 Master Blueprint + Multi-Tenant SaaS Landlord)
 * Strictly backed by isolated DeveloperUser JWT + live PostgreSQL + Redis + PgDump + Leaflet GIS.
 */
export default function DeveloperControlCenter({ onLogout }) {
  const { tabId: routeTabId } = useParams();
  const [searchParams] = useSearchParams();
  const resolveDevTab = (sp, paramTab) => {
    const req = String(paramTab || sp.get('tab') || '').toUpperCase();
    return DEV_VALID_TABS.includes(req) ? req : 'TENANTS';
  };
  const [activeTab, setActiveTab] = useState(() => resolveDevTab(searchParams, routeTabId)); // TENANTS | GIS_MAP | DIAGNOSTICS | LOCK_SUBS | BACKUPS | MESSAGES

  useEffect(() => {
    setActiveTab(resolveDevTab(searchParams, routeTabId));
  }, [searchParams, routeTabId]);
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
  const [feedbacks, setFeedbacks] = useState([]);
  const [devFeedbackReply, setDevFeedbackReply] = useState({});
  const [respondingDevFbId, setRespondingDevFbId] = useState(null);
  const [systemUsers, setSystemUsers] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [activitySearch, setActivitySearch] = useState('');

  const [msgForm, setMsgForm] = useState({ tenantId: '', title: '', body: '', messageType: 'ANNOUNCEMENT' });
  const [lockReason, setLockReason] = useState('');
  const [rejectReasons, setRejectReasons] = useState({});
  const [selectedTenantIds, setSelectedTenantIds] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [planChoices, setPlanChoices] = useState({});
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [envInfo, setEnvInfo] = useState({ environment: 'production', dataMode: 'PRODUCTION_LIVE' });
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
        feedbacksRes,
        usersRes,
        activitiesRes,
        subsRes,
        resHealth,
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
        devApi.get('/developer/feedbacks').catch(() => ({ data: { data: [] } })),
        devApi.get('/developer/users?limit=100').catch(() => ({ data: { users: [] } })),
        devApi.get('/developer/activities?limit=100').catch(() => ({ data: { activities: [] } })),
        devApi.get('/developer/subscriptions/all?limit=100').catch(() => ({ data: { subscriptions: [] } })),
        api.get('/health').catch(() => ({ data: { data: null } })),
      ]);

      setDashboard(dashRes.data?.data || null);
      setPerf(perfRes.data?.data || null);
      setTenants(tenantsRes.data?.data || []);
      setPendingTenants(pendingRes.data?.data || []);
      setGisData(gisRes.data?.data || { features: [] });
      setLogs(logsRes.data?.logs || []);
      setCrashes(Array.isArray(crashRes.data?.data) ? crashRes.data.data : (crashRes.data?.data?.reports || []));
      setAlerts(Array.isArray(alertsRes.data?.data) ? alertsRes.data.data : (alertsRes.data?.data?.alerts || []));
      setBackups(backupsRes.data?.data || []);
      setMessages(msgsRes.data?.data || []);
      setFeedbacks(feedbacksRes.data?.data || []);
      setSystemUsers(usersRes.data?.users || []);
      setActivitiesList(activitiesRes.data?.activities || []);
      setSubscriptionsList(subsRes.data?.subscriptions || []);
      const healthData = resHealth?.data?.data || resHealth?.data;
      if (healthData?.dataMode) {
        setEnvInfo({ environment: healthData.environment, dataMode: healthData.dataMode });
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        sessionStore.clearDevSession();
        navigate('/dev-portal/login');
      } else {
        notify(err.response?.data?.message || 'Error refreshing developer telemetry', true);
      }
    }
  }, [navigate]);

  const handleDevRespondFeedback = async (id) => {
    const text = (devFeedbackReply[id] || '').trim();
    if (!text) {
      notify('Please enter a response for the user feedback.', true);
      return;
    }
    setRespondingDevFbId(id);
    try {
      await devApi.post(`/developer/feedbacks/${id}/respond`, { response: text });
      notify('Developer response submitted successfully.');
      setDevFeedbackReply((prev) => ({ ...prev, [id]: '' }));
      fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to submit response', true);
    } finally {
      setRespondingDevFbId(null);
    }
  };

  useEffect(() => {
    fetchAll();

    // Live Socket.IO telemetry stream for GPS pings & onboarding submissions
    const socket = io(API_ORIGIN || '/', { transports: ['websocket', 'polling'] });
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

    const timer = setInterval(fetchAll, 60000);
    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, [fetchAll]);

  const handleApproveTenant = async (id, name) => {
    setBusyAction(`approve-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/approve`, { trialDays: 30, planCode: 'TRIAL_1M' });
      notify(`Institution "${name}" APPROVED! 1-Month (30-Day) Free Trial countdown activated.`);
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

  const handleRenewTenant = async (id, planCodeOrDays = 'PLAN_3M') => {
    setBusyAction(`renew-${id}`);
    const payload = typeof planCodeOrDays === 'string'
      ? { planCode: planCodeOrDays, note: `Assigned ${planCodeOrDays} subscription` }
      : { extensionDays: planCodeOrDays, note: `Extended +${planCodeOrDays} days` };
    try {
      await devApi.post(`/developer/tenants/${id}/renew`, payload);
      notify(`Subscription updated (${planCodeOrDays}) and tenant unlocked.`);
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

  const handleUnlockTenant = async (id, days = 30) => {
    setBusyAction(`unlock-${id}`);
    try {
      await devApi.post(`/developer/tenants/${id}/unlock`, { extensionDays: days, note: 'Unlocked by Developer Control Authority' });
      notify(`Tenant unlocked (+${days} days).`);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Unlock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleBulkLockSelected = async () => {
    if (selectedTenantIds.length === 0) return;
    setBusyAction('bulk-lock');
    try {
      const res = await devApi.post('/developer/tenants/bulk-lock', {
        tenantIds: selectedTenantIds,
        reason: 'Multi-tenant lock by Developer Authority',
      });
      notify(res.data?.message || `Locked ${selectedTenantIds.length} tenant(s).`);
      setSelectedTenantIds([]);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Bulk lock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleBulkUnlockSelected = async () => {
    if (selectedTenantIds.length === 0) return;
    setBusyAction('bulk-unlock');
    try {
      const res = await devApi.post('/developer/tenants/bulk-unlock', {
        tenantIds: selectedTenantIds,
        extensionDays: 30,
        note: 'Multi-tenant unlock (+30d / 1-month) by Developer Authority',
      });
      notify(res.data?.message || `Unlocked ${selectedTenantIds.length} tenant(s).`);
      setSelectedTenantIds([]);
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Bulk unlock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleDeleteTenant = async (id, name) => {
    setBusyAction(`delete-${id}`);
    try {
      const res = await devApi.delete(`/developer/tenants/${id}`);
      notify(res.data?.message || `Tenant "${name}" permanently deleted.`);
      setConfirmDeleteId('');
      setSelectedTenantIds((prev) => prev.filter((sid) => sid !== id));
      await fetchAll();
    } catch (err) {
      notify(err.response?.data?.message || 'Tenant deletion failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const toggleSelectTenant = (id) => {
    setSelectedTenantIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllTenants = () => {
    if (selectedTenantIds.length === tenants.length) {
      setSelectedTenantIds([]);
    } else {
      setSelectedTenantIds(tenants.map((t) => t.id));
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
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', overflowY: 'auto' }}>
      {/* Top Isolated Landlord Navigation Bar */}
      <header className="header-bar" style={{ borderColor: 'rgba(239,68,68,0.4)' }}>
        <Link to="/dev-portal" className="logo-section" style={{ textDecoration: 'none' }}>
          <GbsBrandLogo size={44} borderColor="#EF4444" />
          <div>
            <div style={{ fontWeight: 800, color: '#F87171', fontSize: '1rem' }}>
              GBS® HIDDEN DEVELOPER CONTROL CENTER
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              Intelligence Talks To Wisdom • Landlord: {devUser?.username || devUser?.email || 'Lead Developer'}
            </div>
          </div>
        </Link>

        <div className="header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
            style={{ padding: '7px 12px', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span className={`badge ${envInfo.dataMode === 'PRODUCTION_LIVE' ? 'badge-success' : 'badge-warning'}`}>
            {envInfo.dataMode === 'PRODUCTION_LIVE' ? 'PRODUCTION LIVE' : 'DEV / DEMO MODE'}
          </span>
          <span className={`badge ${isGlobalLocked ? 'badge-danger' : 'badge-success'}`}>
            {isGlobalLocked ? 'GLOBAL SYSTEM LOCKED' : 'PLATFORM ONLINE'}
          </span>
          <a
            href="/images/gbs-official-logo.jpeg"
            download="GBS-Official-Company-Logo.jpeg"
            className="btn btn-secondary"
            style={{ padding: '7px 12px', textDecoration: 'none', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}
          >
            <Download size={14} /> Official Logo (.jpeg)
          </a>
          <button type="button" className="btn btn-primary" onClick={() => setVideoOpen(true)} style={{ padding: '7px 12px' }}>
            <Video size={14} /> Role Walkthrough Video
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setGuideOpen(true)} style={{ padding: '7px 12px' }}>
            <BookOpen size={14} /> Developer Guide
          </button>
          <button type="button" className="btn btn-secondary" onClick={fetchAll} style={{ padding: '7px 12px' }}>
            <RefreshCw size={14} /> Refresh Telemetry
          </button>
          <button type="button" className="btn btn-danger" onClick={handleLogout} style={{ padding: '7px 12px' }}>
            <LogOut size={14} /> Exit Dev Portal
          </button>
        </div>
      </header>

      <main className="app-main-content tab-page-container">
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

        {/* Organized Environment & Data Provenance Classification Strip */}
        <div
          className="glass-panel"
          style={{
            padding: '12px 18px',
            marginBottom: 20,
            borderColor: envInfo.dataMode === 'PRODUCTION_LIVE' ? 'rgba(16,185,129,0.45)' : 'rgba(212,175,55,0.4)',
            background: 'linear-gradient(90deg, rgba(8,16,32,0.95), rgba(15,27,49,0.88))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className={`badge ${envInfo.dataMode === 'PRODUCTION_LIVE' ? 'badge-success' : 'badge-warning'}`}>
              ENV: {envInfo.dataMode === 'PRODUCTION_LIVE' ? 'PRODUCTION_LIVE' : 'DEVELOPMENT_DEMO'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>
              <strong>Live Production Institutions:</strong>{' '}
              <span style={{ color: '#34D399', fontWeight: 800 }}>
                {tenants.filter((t) => t.isProductionRecord || t.dataSource === 'PRODUCTION_LIVE').length}
              </span>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>
              <strong>Development / Sandbox Records:</strong>{' '}
              <span style={{ color: '#FBBF24', fontWeight: 800 }}>
                {tenants.filter((t) => !t.isProductionRecord && t.dataSource !== 'PRODUCTION_LIVE').length}
              </span>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>•</span>
            <span style={{ fontSize: '0.8rem', color: '#E2E8F0' }}>
              <strong>System Users:</strong>{' '}
              <span style={{ color: '#38BDF8', fontWeight: 800 }}>{dashboard?.counts?.totalUsers ?? systemUsers.length}</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              GBS-RCCE ENGINE: 7-FIELD CONTRACT ACTIVE
            </span>
          </div>
        </div>

        {/* Developer Authority Commands, Permitted Actions & Recent Developer Activities */}
        <div className="gbs-grid-2" style={{ marginBottom: 20 }}>
          <div className="glass-panel" style={{ padding: 18, borderColor: 'rgba(239, 68, 68, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, color: '#F87171', fontSize: '0.98rem' }}>
                  Developer Authority — Exact Commands &amp; Permitted Actions
                </h3>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 2 }}>
                  Exclusive Landlord Scope ({devUser?.accessLevel || 'LEAD_DEVELOPER'}): Only Developer approves onboarding tenants.
                </div>
              </div>
              <span className="badge badge-danger" style={{ fontSize: '0.68rem' }}>DEVELOPER-ONLY APPROVAL GATE</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {(DEVELOPER_PORTAL_META.allowedCommands || []).map((cmd) => (
                <Link
                  key={cmd.key}
                  to={`/dev-portal/tab/${encodeURIComponent(cmd.tab)}`}
                  className="quick-command-card"
                  style={{ textDecoration: 'none', padding: 10 }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{cmd.label}</span>
                      <ArrowUpRight size={13} color="#F87171" />
                    </div>
                    <div style={{ fontSize: '0.71rem', color: '#94A3B8', marginTop: 3, lineHeight: 1.35 }}>{cmd.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 18, borderColor: 'rgba(212, 175, 55, 0.3)' }}>
            <h3 style={{ margin: '0 0 10px', color: '#D4AF37', fontSize: '0.98rem' }}>
              Recent Developer Platform Activities ({logs.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 240, overflowY: 'auto' }}>
              {logs.slice(0, 6).map((l) => (
                <div key={l.id} style={{ padding: 9, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F4E07B', fontWeight: 700 }}>
                    <span>{l.type}</span>
                    <span style={{ color: '#64748B', fontWeight: 400 }}>{l.time ? new Date(l.time).toLocaleString() : ''}</span>
                  </div>
                  <div style={{ color: '#CBD5E1', marginTop: 2 }}>{l.msg}</div>
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No Developer audit actions logged yet.</div>
              )}
            </div>
          </div>
        </div>

        {routeTabId && (
          <BackButtonBar
            title={(() => {
              const found = [
                { id: 'TENANTS', label: `Institutions & Onboarding (${pendingTenants.length} Pending)` },
                { id: 'USERS', label: 'System Users & Identity Directory' },
                { id: 'GIS_MAP', label: 'Live Tenant & Collector GIS Map' },
                { id: 'ACTIVITIES', label: 'System Activities & Immutable Audit' },
                { id: 'DIAGNOSTICS', label: 'System Diagnostics, Crashes & Logs' },
                { id: 'LOCK_SUBS', label: 'System Lock, Security & Subscriptions' },
                { id: 'BACKUPS', label: 'PgDump Backups & Recovery' },
                { id: 'MESSAGES', label: 'Broadcast to Tenants' },
                { id: 'FEEDBACKS', label: 'Feedbacks & Inquiries' },
              ].find((x) => x.id === activeTab);
              return found ? found.label : activeTab;
            })()}
            subtitle="Hidden Developer Control Center • Scrollable Tab Page"
            breadcrumb={['Developer Home', activeTab]}
            fallbackPath="/dev-portal"
          />
        )}

        {/* Subsystem Tabs (Organized Command Bar with Icons & Badges) */}
        <div className="dashboard-tab-bar" role="navigation" aria-label="Developer Control Subsystems">
          {[
            { id: 'TENANTS', label: 'Institutions & Onboarding', icon: Building2, badge: pendingTenants.length > 0 ? `${tenants.length}+${pendingTenants.length}` : tenants.length },
            { id: 'USERS', label: 'System Users', icon: Users, badge: systemUsers.length },
            { id: 'GIS_MAP', label: 'Live GIS Map', icon: MapPin, badge: gisData?.features?.length || 0 },
            { id: 'ACTIVITIES', label: 'System Activities', icon: Activity, badge: activitiesList.length },
            { id: 'DIAGNOSTICS', label: 'Diagnostics & Alerts', icon: Wrench, badge: crashes.length },
            { id: 'LOCK_SUBS', label: 'System Lock & Subscriptions', icon: ShieldAlert, badge: alerts.length },
            { id: 'BACKUPS', label: 'PgDump Backups', icon: Database, badge: backups.length },
            { id: 'MESSAGES', label: 'Broadcast to Tenants', icon: Send, badge: messages.length },
            { id: 'FEEDBACKS', label: 'Feedbacks & Inquiries', icon: MessageSquare, badge: feedbacks.length },
          ].map((t) => {
            const Icon = t.icon;
            const isCurrent = activeTab === t.id;
            return (
              <Link
                key={t.id}
                to={`/dev-portal/tab/${encodeURIComponent(t.id)}`}
                className={`dashboard-tab-pill ${isCurrent ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <Icon size={14} />
                <span>{t.label}</span>
                {t.badge !== null && t.badge !== undefined && (
                  <span className="dashboard-tab-badge">{t.badge}</span>
                )}
              </Link>
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
                          {t.institutionType} • {t.city}, {t.region}, {t.country} • Rep: {t.representativeName} ({t.representativeEmail}{t.representativePhone ? ` • ${t.representativePhone}` : ''})
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                          Reg: {t.registrationNumber || 'N/A'} • License: {t.businessLicenseNumber || 'N/A'} • TIN: {t.tinNumber || 'N/A'} • GPS: {t.gpsAddress || t.address || 'N/A'}
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
                          <CheckCircle2 size={15} /> Approve (Start 1-Month Trial)
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
                        <button
                          type="button"
                          onClick={() => navigate(`/dev-portal/tenants/${t.id}`)}
                          className="btn btn-secondary"
                          style={{ padding: '8px 14px' }}
                        >
                          <Eye size={15} /> View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <h3 style={{ margin: 0, color: '#D4AF37' }}>
                  All Registered Institutions &amp; 1-Month Trial / Subscription Ledger ({tenants.length})
                </h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                    {selectedTenantIds.length} selected
                  </span>
                  <button
                    type="button"
                    disabled={selectedTenantIds.length === 0 || busyAction === 'bulk-unlock'}
                    onClick={handleBulkUnlockSelected}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  >
                    <Unlock size={13} /> Unlock Selected (+30d / 1m)
                  </button>
                  <button
                    type="button"
                    disabled={selectedTenantIds.length === 0 || busyAction === 'bulk-lock'}
                    onClick={handleBulkLockSelected}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                  >
                    <Lock size={13} /> Lock Selected
                  </button>
                </div>
              </div>
              <div className="filter-toolbar" style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  className="gbs-input"
                  style={{ flex: '1 1 220px', padding: '7px 12px', fontSize: '0.82rem' }}
                  placeholder="Filter institution by name, code, city, or representative email..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                />
                <select
                  className="gbs-select"
                  style={{ flex: '0 1 180px', padding: '7px 12px', fontSize: '0.8rem' }}
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOCKED">LOCKED / SUSPENDED</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>
                        <input
                          type="checkbox"
                          checked={tenants.length > 0 && selectedTenantIds.length === tenants.length}
                          onChange={toggleSelectAllTenants}
                          aria-label="Select all tenants"
                        />
                      </th>
                      <th>Institution</th>
                      <th>Code / Location</th>
                      <th>Onboarding</th>
                      <th>Operational Status</th>
                      <th>Trial Days Left</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants
                      .filter((t) => {
                        const q = tenantSearch.trim().toLowerCase();
                        const matchesQ =
                          !q ||
                          (t.name || '').toLowerCase().includes(q) ||
                          (t.code || '').toLowerCase().includes(q) ||
                          (t.city || '').toLowerCase().includes(q) ||
                          (t.representativeEmail || '').toLowerCase().includes(q);
                        const isLocked = ['LOCKED_EXPIRED', 'LOCKED', 'SUSPENDED'].includes(t.status) || t.onboardingStatus === 'LOCKED';
                        const matchesStatus =
                          !tenantStatusFilter ||
                          (tenantStatusFilter === 'LOCKED' ? isLocked : t.status === tenantStatusFilter || t.onboardingStatus === tenantStatusFilter);
                        return matchesQ && matchesStatus;
                      })
                      .map((t) => {
                        const isTenantLocked = ['LOCKED_EXPIRED', 'LOCKED', 'SUSPENDED'].includes(t.status) || t.onboardingStatus === 'LOCKED';
                        return (
                          <tr key={t.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedTenantIds.includes(t.id)}
                                onChange={() => toggleSelectTenant(t.id)}
                                aria-label={`Select ${t.name}`}
                              />
                            </td>
                            <td>
                              <strong>{t.name}</strong>
                              {t.code === 'DEMO-SANDBOX' && (
                                <span className="badge badge-warning" style={{ marginLeft: 8, fontSize: '0.62rem' }}>
                                  DEMO SANDBOX
                                </span>
                              )}
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
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: t.isLifetime ? '#F4E07B' : (t.daysLeft || 0) <= 10 ? '#F87171' : '#34D399' }}>
                                <Clock size={14} /> {t.isLifetime ? 'LIFETIME' : `${t.daysLeft ?? 0}d (${t.subscriptionPlan || 'TRIAL_1M'})`}
                              </span>
                            </td>
                            <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {!['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID'].includes(t.onboardingStatus) && (
                                <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleApproveTenant(t.id, t.name)}>
                                  Approve (1m Trial)
                                </button>
                              )}
                              <select
                                className="gbs-select"
                                style={{ width: 118, padding: '4px 6px', fontSize: '0.73rem' }}
                                value={planChoices[t.id] || 'PLAN_3M'}
                                onChange={(e) => setPlanChoices((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              >
                                <option value="TRIAL_1M">1 Mo Trial</option>
                                <option value="PLAN_3M">3 Months</option>
                                <option value="PLAN_6M">6 Months</option>
                                <option value="PLAN_9M">9 Months</option>
                                <option value="PLAN_12M">12 Months</option>
                                <option value="LIFETIME">Lifetime</option>
                              </select>
                              <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleRenewTenant(t.id, planChoices[t.id] || 'PLAN_3M')}>
                                Apply Plan
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary"
                                style={{ padding: '5px 10px', fontSize: '0.75rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                                onClick={() => navigate(`/dev-portal/tenants/${t.id}`)}
                              >
                                <Eye size={12} /> View Details
                              </button>
                              {isTenantLocked ? (
                                <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleUnlockTenant(t.id, 30)}>
                                  <Unlock size={12} /> Unlock
                                </button>
                              ) : (
                                <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.75rem' }} onClick={() => handleLockTenant(t.id)}>
                                  <Lock size={12} /> Lock
                                </button>
                              )}
                              {confirmDeleteId === t.id ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={busyAction === `delete-${t.id}`}
                                    className="btn btn-danger"
                                    style={{ padding: '5px 10px', fontSize: '0.75rem', background: '#991B1B' }}
                                    onClick={() => handleDeleteTenant(t.id, t.name)}
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                    onClick={() => setConfirmDeleteId('')}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.75rem', borderColor: 'rgba(239,68,68,0.45)', color: '#FCA5A5' }}
                                  onClick={() => setConfirmDeleteId(t.id)}
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SYSTEM USERS ACROSS ALL INSTITUTIONS */}
        {activeTab === 'USERS' && (
          <div className="glass-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={18} /> System Users Across All Institutions ({systemUsers.length})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                  Live PostgreSQL user accounts with roles, institution affiliations, and security KYC status.
                </p>
              </div>
            </div>

            <div className="filter-toolbar" style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="text"
                className="gbs-input"
                style={{ flex: '1 1 220px', padding: '7px 12px', fontSize: '0.82rem' }}
                placeholder="Search user by name, email, phone, or username..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <select
                className="gbs-select"
                style={{ flex: '0 1 180px', padding: '7px 12px', fontSize: '0.8rem' }}
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="COMPANY_OWNER">Company Owner</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
                <option value="LOAN_OFFICER">Loan Officer</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="MEMBER">Borrower / Member</option>
                <option value="GUARANTOR">Guarantor</option>
                <option value="COLLECTOR">Collector</option>
              </select>
            </div>

            {systemUsers.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No user records available.</p>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>System Role</th>
                      <th>Institution Affiliation</th>
                      <th>Account Status</th>
                      <th>Record Origin</th>
                      <th>Created Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers
                      .filter((u) => {
                        const q = userSearch.trim().toLowerCase();
                        const matchesQ =
                          !q ||
                          (u.firstName || '').toLowerCase().includes(q) ||
                          (u.lastName || '').toLowerCase().includes(q) ||
                          (u.email || '').toLowerCase().includes(q) ||
                          (u.phone || '').toLowerCase().includes(q);
                        const matchesRole = !userRoleFilter || u.role === userRoleFilter;
                        return matchesQ && matchesRole;
                      })
                      .map((u) => (
                        <tr key={u.id}>
                          <td>
                            <strong>{u.firstName} {u.lastName}</strong>
                            <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{u.email} • {u.phone}</div>
                          </td>
                          <td><span className="badge badge-gold">{u.role}</span></td>
                          <td>{u.tenant?.name || 'Independent / Lead'} ({u.tenant?.code || 'GBS'})</td>
                          <td>
                            <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.74rem', color: u.isProductionRecord ? '#34D399' : '#FBBF24' }}>
                              {u.isProductionRecord ? 'PRODUCTION' : 'DEMO/SEED'}
                            </span>
                          </td>
                          <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => navigate(`/dev-portal/users/${u.id}`)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                            >
                              <Eye size={12} /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: SYSTEM ACTIVITIES & AUDIT TRAIL */}
        {activeTab === 'ACTIVITIES' && (
          <div className="glass-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Activity size={18} /> System Activities &amp; Comprehensive Audit Trail ({activitiesList.length})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                  Complete immutable ledger of operations, tenant administrative actions, and security events.
                </p>
              </div>
            </div>

            <div className="filter-toolbar" style={{ marginBottom: 14 }}>
              <input
                type="text"
                className="gbs-input"
                style={{ flex: '1 1 240px', padding: '7px 12px', fontSize: '0.82rem' }}
                placeholder="Search activity by action name or component..."
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
              />
            </div>

            {activitiesList.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No activity records available.</p>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Target Component</th>
                      <th>Actor / Developer</th>
                      <th>Status Outcome</th>
                      <th>Timestamp</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activitiesList
                      .filter((a) => {
                        const q = activitySearch.trim().toLowerCase();
                        return !q || (a.action || '').toLowerCase().includes(q) || (a.targetComponent || '').toLowerCase().includes(q);
                      })
                      .map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.action}</strong></td>
                          <td>{a.targetComponent || 'SYSTEM'}</td>
                          <td>{a.developerUser?.username || 'SYSTEM_OPERATOR'}</td>
                          <td>
                            <span className={`badge ${a.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                              {a.status || 'SUCCESS'}
                            </span>
                          </td>
                          <td>{new Date(a.createdAt).toLocaleString()}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => navigate(`/dev-portal/activities/${a.id}`)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                            >
                              <Eye size={12} /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REAL INTERACTIVE GIS & GOOGLE MAPS PHONE LOCATOR */}
        {activeTab === 'GIS_MAP' && (
          <LiveLocationTrackerMap markers={gisData.features || []} mode="developer" />
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
                    <div style={{ fontWeight: 700, color: '#FCA5A5' }}>{c.issueType || c.severity} — {c.component || c.severity || 'Core Runtime'}</div>
                    <div style={{ color: '#E2E8F0' }}>{c.message || c.description}</div>
                  </div>
                ))}
                {crashes.length === 0 && <div style={{ fontSize: '0.8rem', color: '#34D399' }}>Zero unhandled crashes recorded.</div>}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Developer Landlord Audit Stream ({logs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
                {logs.map((l) => (
                  <div key={l.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.2)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', gap: 8, color: '#F4E07B', fontWeight: 700, alignItems: 'center' }}>
                        <span>{l.type}</span>
                        <span style={{ color: '#64748B', fontWeight: 400 }}>{l.time ? new Date(l.time).toLocaleString() : ''}</span>
                      </div>
                      <div style={{ color: '#CBD5E1', marginTop: 3 }}>{l.msg}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/dev-portal/activities/${l.id}`)}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.72rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                    >
                      <Eye size={11} /> Details
                    </button>
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
                        [{a.severity}] {a.alertType}{a.title ? ` — ${a.title}` : ''}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>{a.description || a.message || a.title}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                        onClick={() => navigate(`/dev-portal/security-alerts/${a.id}`)}
                      >
                        <Eye size={12} /> View Details
                      </button>
                      {!a.resolved && (
                        <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleResolveAlert(a.id)}>
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && <div style={{ color: '#34D399', fontSize: '0.85rem' }}>All security alerts cleared.</div>}
              </div>
            </div>

            {/* Subscriptions Ledger */}
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 22, marginTop: 14 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={18} /> Active Institution Subscriptions &amp; Trial Ledger ({subscriptionsList.length})
              </h3>
              {subscriptionsList.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No subscription records available.</p>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Plan Code</th>
                        <th>Tier</th>
                        <th>Price Amount</th>
                        <th>Days Left</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionsList.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.tenant?.name || 'Institution'}</strong> ({s.tenant?.code || 'GBS'})</td>
                          <td>{s.planCode}</td>
                          <td><span className="badge badge-gold">{s.planTier}</span></td>
                          <td>{formatGHS(s.priceAmount || 0)}</td>
                          <td>
                            <span style={{ fontWeight: 700, color: s.isLifetime ? '#F4E07B' : (s.daysLeft || 0) <= 10 ? '#F87171' : '#34D399' }}>
                              {s.isLifetime ? 'LIFETIME' : `${s.daysLeft ?? 0} days`}
                            </span>
                          </td>
                          <td><span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span></td>
                          <td>
                            <button
                              type="button"
                              onClick={() => navigate(`/dev-portal/subscriptions/${s.id}`)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: '#38BDF8', color: '#93C5FD' }}
                            >
                              <Eye size={12} /> View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                      <td>{b.fileName || b.filePath || b.id}</td>
                      <td>{b.backupType || 'POSTGRES_SQL_DUMP'}</td>
                      <td><span className="badge badge-success">{b.status}</span></td>
                      <td>{(b.fileSizeBytes ?? b.fileSize) ? `${Math.max(1, Math.round(Number(b.fileSizeBytes ?? b.fileSize) / 1024))} KB` : 'Verified'}</td>
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
                      <span>{m.title || m.subject}</span>
                      <span className="badge badge-cyan">{m.tenant?.name || 'ALL TENANTS'}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: '6px 0 0' }}>{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: USER COMPLAINTS & SYSTEM FEEDBACKS */}
        {activeTab === 'FEEDBACKS' && (
          <div className="glass-panel" style={{ padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={18} /> Global System Feedbacks, User Complaints &amp; Inquiries ({feedbacks.length})
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                  Inspect real-time user ratings, issues, bug reports, and complaints submitted across all tenants and portals. Deliver instant developer responses.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={fetchAll}>
                <RefreshCw size={13} /> Refresh Feedbacks
              </button>
            </div>

            {feedbacks.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '20px 0' }}>
                No user feedbacks or complaints received across the system.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {feedbacks.map((fb) => {
                  const isResponded = fb.status === 'RESPONDED' || Boolean(fb.response);
                  return (
                    <div key={fb.id} style={{ padding: 16, borderRadius: 10, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.25)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ color: '#F1F5F9', fontSize: '0.92rem' }}>{fb.name || 'Anonymous User'}</strong>
                            {fb.userRole && <span className="badge badge-gold">{fb.userRole}</span>}
                            <span className="badge badge-cyan">{fb.category || 'GENERAL'}</span>
                            {fb.tenant && <span className="badge badge-outline" style={{ color: '#38BDF8', borderColor: 'rgba(56,189,248,0.4)' }}>Tenant: {fb.tenant.name || fb.tenantId}</span>}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94A3B8', marginTop: 4 }}>
                            {fb.contactEmail && `${fb.contactEmail} • `}{fb.contactPhone && `${fb.contactPhone} • `}{new Date(fb.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {fb.rating && (
                            <div style={{ display: 'flex', gap: 2, color: '#FBBF24' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} size={13} fill={star <= fb.rating ? '#FBBF24' : 'none'} color="#FBBF24" />
                              ))}
                            </div>
                          )}
                          <span className={`badge ${isResponded ? 'badge-success' : 'badge-warning'}`}>
                            {fb.status || 'PENDING'}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginBottom: 12, lineHeight: 1.45, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                        {fb.message}
                      </div>

                      {isResponded ? (
                        <div style={{ padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.8rem' }}>
                          <div style={{ color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <CheckCircle2 size={13} /> Developer / Management Response
                            {fb.respondedAt && <span style={{ color: '#94A3B8', fontWeight: 400 }}>({new Date(fb.respondedAt).toLocaleString()})</span>}
                          </div>
                          <div style={{ color: '#F1F5F9' }}>{fb.response}</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                          <input
                            type="text"
                            className="gbs-input"
                            placeholder="Type developer response to user..."
                            style={{ flex: 1, fontSize: '0.82rem' }}
                            value={devFeedbackReply[fb.id] || ''}
                            onChange={(e) => setDevFeedbackReply((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDevRespondFeedback(fb.id); }}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={respondingDevFbId === fb.id}
                            style={{ padding: '8px 16px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            onClick={() => handleDevRespondFeedback(fb.id)}
                          >
                            {respondingDevFbId === fb.id ? 'Sending...' : 'Send Response'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
      <OperatingGuideModal isOpen={guideOpen} onClose={() => setGuideOpen(false)} isDeveloper />
      <RoleVideoPresentationModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} userRole="DEVELOPER_LANDLORD" isDeveloper />
    </div>
  );
}
