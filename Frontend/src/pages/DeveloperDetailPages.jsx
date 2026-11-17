import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, User, CreditCard, Activity, ShieldAlert, CheckCircle2,
  XCircle, Lock, Unlock, Clock, MapPin, Mail, Phone, Calendar,
  Download, ArrowLeft, RefreshCw, Send, ShieldCheck, Database
} from 'lucide-react';
import { devApi } from '../services/api';
import { BackButtonBar } from '../context/NavigationContext';

const formatGHS = (n) =>
  `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ========================================================================== */
/* 1. DEVELOPER TENANT / FINANCIAL INSTITUTION DETAIL PAGE (/dev-portal/tenants/:id) */
/* ========================================================================== */
export function DeveloperTenantDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [planChoice, setPlanChoice] = useState('PLAN_3M');
  const [rejectReason, setRejectReason] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgTitle, setMsgTitle] = useState('');

  const showToast = (text, isErr = false) => {
    setToast({ text, isErr });
    setTimeout(() => setToast(null), 4000);
  };

  const loadTenant = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await devApi.get(`/developer/tenants/${id}`);
      setTenant(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Unable to retrieve institution details from live database.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  const handleApprove = async () => {
    setBusyAction('approve');
    try {
      await devApi.post(`/developer/tenants/${tenant.id}/approve`, { planCode: 'TRIAL_1M' });
      showToast(`Institution ${tenant.name} approved & 1-Month trial active!`);
      loadTenant();
    } catch (err) {
      showToast(err.message || 'Approval failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleReject = async () => {
    setBusyAction('reject');
    try {
      await devApi.post(`/developer/tenants/${tenant.id}/reject`, { reason: rejectReason || 'Administrative rejection' });
      showToast(`Institution ${tenant.name} rejected.`);
      loadTenant();
    } catch (err) {
      showToast(err.message || 'Rejection failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleLock = async () => {
    setBusyAction('lock');
    try {
      await devApi.post(`/developer/tenants/${tenant.id}/lock`, { reason: 'Developer landlord lock applied.' });
      showToast(`Institution ${tenant.name} locked.`);
      loadTenant();
    } catch (err) {
      showToast(err.message || 'Lock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleUnlock = async () => {
    setBusyAction('unlock');
    try {
      await devApi.post(`/developer/tenants/${tenant.id}/unlock`, { extensionDays: 30, note: 'Developer Landlord Extension' });
      showToast(`Institution ${tenant.name} unlocked (+30 days).`);
      loadTenant();
    } catch (err) {
      showToast(err.message || 'Unlock failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleRenew = async () => {
    setBusyAction('renew');
    try {
      await devApi.post(`/developer/tenants/${tenant.id}/renew`, { planCode: planChoice });
      showToast(`Subscription plan ${planChoice} applied to ${tenant.name}!`);
      loadTenant();
    } catch (err) {
      showToast(err.message || 'Plan renewal failed', true);
    } finally {
      setBusyAction('');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setBusyAction('msg');
    try {
      await devApi.post('/developer/messages', {
        tenantId: tenant.id,
        title: msgTitle || 'Official System Notice',
        body: msgBody,
        priority: 'NORMAL',
      });
      showToast(`Notice dispatched to ${tenant.name}`);
      setMsgBody('');
      setMsgTitle('');
    } catch (err) {
      showToast(err.message || 'Message delivery failed', true);
    } finally {
      setBusyAction('');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading authoritative institution record from live PostgreSQL...</p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ padding: 24 }}>
        <BackButtonBar title="Institution Not Found" fallbackPath="/dev-portal?tab=TENANTS" />
        <div className="glass-panel" style={{ padding: 24, borderColor: '#EF4444', color: '#FCA5A5' }}>
          {error || 'No institution found matching the requested identifier.'}
        </div>
      </div>
    );
  }

  const isLocked = ['LOCKED_EXPIRED', 'LOCKED', 'SUSPENDED'].includes(tenant.status) || tenant.onboardingStatus === 'LOCKED';

  return (
    <div>
      <BackButtonBar
        title={`Institution File: ${tenant.name}`}
        subtitle={`Code: ${tenant.code} • ${tenant.institutionType || 'Microfinance / Institution'} • ${tenant.city || 'Accra'}, ${tenant.region || 'Ghana'}`}
        breadcrumb={['Developer Portal', 'Institutions', tenant.code || 'Details']}
        fallbackPath="/dev-portal?tab=TENANTS"
      />

      {toast && (
        <div
          className="glass-panel"
          style={{
            padding: 12,
            marginBottom: 16,
            borderColor: toast.isErr ? '#EF4444' : '#10B981',
            color: toast.isErr ? '#FCA5A5' : '#34D399',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toast.isErr ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="gbs-grid-4" style={{ marginBottom: 20 }}>
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Onboarding Status</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4 }}>
            <span className={`badge ${['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID'].includes(tenant.onboardingStatus) ? 'badge-success' : tenant.onboardingStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
              {tenant.onboardingStatus}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Operational Status</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: 4 }}>
            <span className={`badge ${tenant.status === 'ACTIVE' ? 'badge-success' : tenant.status === 'EXPIRING_SOON' ? 'badge-warning' : 'badge-danger'}`}>
              {tenant.status}
            </span>
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Subscription Tier</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F4E07B', marginTop: 4 }}>
            {tenant.isLifetime ? 'LIFETIME ACCESS' : `${tenant.subscriptionPlan || 'TRIAL_1M'} (${tenant.daysLeft ?? 0}d left)`}
          </div>
        </div>
        <div className="glass-panel" style={{ padding: 16 }}>
          <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Database Provenance</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: tenant.isProductionRecord ? '#34D399' : '#FBBF24', marginTop: 4 }}>
            {tenant.isProductionRecord ? 'GENUINE PRODUCTION' : 'DEVELOPMENT / TEST'}
          </div>
        </div>
      </div>

      <div className="gbs-grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Left: Regulatory, Identity & Contact */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 14px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} /> Official Entity &amp; Representative Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
            <div><strong>Official Name:</strong> {tenant.name}</div>
            <div><strong>System Code:</strong> {tenant.code}</div>
            <div><strong>Institution Type:</strong> {tenant.institutionType || 'MICROFINANCE'}</div>
            <div><strong>Registration #:</strong> {tenant.registrationNumber || 'N/A'}</div>
            <div><strong>Business License #:</strong> {tenant.businessLicenseNumber || 'N/A'}</div>
            <div><strong>TIN Number:</strong> {tenant.tinNumber || 'N/A'}</div>
            <div><strong>Representative:</strong> {tenant.representativeName || 'N/A'}</div>
            <div><strong>Rep Role:</strong> {tenant.representativeRole || 'Owner / Director'}</div>
            <div><strong>Rep Email:</strong> {tenant.representativeEmail || 'N/A'}</div>
            <div><strong>Rep Phone:</strong> {tenant.representativePhone || 'N/A'}</div>
            <div><strong>Contact Email:</strong> {tenant.contactEmail || 'N/A'}</div>
            <div><strong>Contact Phone:</strong> {tenant.contactPhone || 'N/A'}</div>
            <div><strong>Currency:</strong> {tenant.currency || 'GHS'}</div>
            <div><strong>Registered Date:</strong> {new Date(tenant.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Right: Geographic Location & GIS Coordinates */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 14px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} /> Geographic &amp; GPS Coordinates
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem', marginBottom: 14 }}>
            <div><strong>Region:</strong> {tenant.region || 'Greater Accra'}</div>
            <div><strong>City / Town:</strong> {tenant.city || 'Accra'}</div>
            <div><strong>Physical Address:</strong> {tenant.address || 'N/A'}</div>
            <div><strong>Ghana GPS Address:</strong> {tenant.gpsAddress || 'N/A'}</div>
            <div><strong>Latitude:</strong> {tenant.latitude || '5.6037'}</div>
            <div><strong>Longitude:</strong> {tenant.longitude || '-0.1870'}</div>
          </div>
          {tenant.latitude && tenant.longitude && (
            <div style={{ marginTop: 10 }}>
              <a
                href={`https://www.google.com/maps?q=${tenant.latitude},${tenant.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              >
                <MapPin size={14} /> Open in Google Maps
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Operational Landlord Controls Bar */}
      <div className="glass-panel" style={{ padding: 22, marginBottom: 20, borderColor: 'rgba(212,175,55,0.4)' }}>
        <h3 style={{ margin: '0 0 14px', color: '#F4E07B' }}>
          Developer Landlord Operational Controls
        </h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {!['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID'].includes(tenant.onboardingStatus) && (
            <button
              type="button"
              disabled={busyAction === 'approve'}
              onClick={handleApprove}
              className="btn btn-primary"
              style={{ padding: '9px 16px' }}
            >
              <CheckCircle2 size={16} /> Approve Onboarding (Activate 1m Trial)
            </button>
          )}

          {tenant.onboardingStatus === 'PENDING' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                className="gbs-input"
                placeholder="Rejection reason..."
                style={{ width: 220, padding: '7px 12px', fontSize: '0.82rem' }}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <button
                type="button"
                disabled={busyAction === 'reject'}
                onClick={handleReject}
                className="btn btn-danger"
                style={{ padding: '9px 16px' }}
              >
                <XCircle size={16} /> Reject Onboarding
              </button>
            </div>
          )}

          {isLocked ? (
            <button
              type="button"
              disabled={busyAction === 'unlock'}
              onClick={handleUnlock}
              className="btn btn-primary"
              style={{ padding: '9px 16px' }}
            >
              <Unlock size={16} /> Unlock Institution (+30 Days)
            </button>
          ) : (
            <button
              type="button"
              disabled={busyAction === 'lock'}
              onClick={handleLock}
              className="btn btn-danger"
              style={{ padding: '9px 16px' }}
            >
              <Lock size={16} /> Lock Institution
            </button>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="gbs-select"
              value={planChoice}
              onChange={(e) => setPlanChoice(e.target.value)}
              style={{ padding: '7px 10px', fontSize: '0.82rem' }}
            >
              <option value="TRIAL_1M">1 Month Trial</option>
              <option value="PLAN_3M">3 Months Paid Plan</option>
              <option value="PLAN_6M">6 Months Paid Plan</option>
              <option value="PLAN_9M">9 Months Paid Plan</option>
              <option value="PLAN_12M">12 Months (1 Year)</option>
              <option value="LIFETIME">Lifetime Access</option>
            </select>
            <button
              type="button"
              disabled={busyAction === 'renew'}
              onClick={handleRenew}
              className="btn btn-secondary"
              style={{ padding: '9px 16px' }}
            >
              Apply Subscription Plan
            </button>
          </div>
        </div>
      </div>

      {/* Dispatched Direct Notice to this Institution */}
      <div className="glass-panel" style={{ padding: 22, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 12px', color: '#93C5FD', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mail size={18} /> Dispatch Direct Landlord Notice to {tenant.name}
        </h3>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            className="gbs-input"
            placeholder="Notice Title (e.g. Scheduled Maintenance, KYC Compliance Notice)..."
            value={msgTitle}
            onChange={(e) => setMsgTitle(e.target.value)}
          />
          <textarea
            className="gbs-input"
            rows={3}
            placeholder="Type your message to this institution's administration team..."
            value={msgBody}
            onChange={(e) => setMsgBody(e.target.value)}
          />
          <div>
            <button
              type="submit"
              disabled={busyAction === 'msg' || !msgBody.trim()}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
            >
              <Send size={14} /> Send Official Notice
            </button>
          </div>
        </form>
      </div>

      {/* Branches List */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>
          Registered Branches ({(tenant.branches || []).length})
        </h3>
        {(!tenant.branches || tenant.branches.length === 0) ? (
          <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No branches registered yet for this institution.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Branch Code</th>
                  <th>City / Town</th>
                  <th>GPS Address</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {tenant.branches.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.name}</strong></td>
                    <td>{b.code}</td>
                    <td>{b.city || 'Accra'}</td>
                    <td>{b.gpsAddress || 'N/A'}</td>
                    <td>{b.phone || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 2. DEVELOPER SYSTEM USER DETAIL PAGE (/dev-portal/users/:id)              */
/* ========================================================================== */
export function DeveloperUserDetailPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    devApi.get(`/developer/users/${id}`)
      .then((res) => setUser(res.data?.data || null))
      .catch((err) => setError(err.message || 'Unable to retrieve user record.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Retrieving user record from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{ padding: 24 }}>
        <BackButtonBar title="User Not Found" fallbackPath="/dev-portal?tab=USERS" />
        <div className="glass-panel" style={{ padding: 24, borderColor: '#EF4444', color: '#FCA5A5' }}>
          {error || 'No user record found matching the requested identifier.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackButtonBar
        title={`User Dossier: ${user.firstName} ${user.lastName}`}
        subtitle={`${user.email} • Role: ${user.role} • Institution: ${user.tenant?.name || 'Independent'}`}
        breadcrumb={['Developer Portal', 'System Users', user.username || user.email]}
        fallbackPath="/dev-portal?tab=USERS"
      />

      <div className="gbs-grid-2" style={{ gap: 20, marginBottom: 20 }}>
        {/* Core Profile */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 14px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={18} /> Identity &amp; Credentials
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
            <div><strong>Full Name:</strong> {user.firstName} {user.lastName}</div>
            <div><strong>Username:</strong> {user.username || 'N/A'}</div>
            <div><strong>Email Address:</strong> {user.email}</div>
            <div><strong>Phone Number:</strong> {user.phone}</div>
            <div><strong>System Role:</strong> <span className="badge badge-gold">{user.role}</span></div>
            <div><strong>Account Status:</strong> <span className={`badge ${user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{user.status}</span></div>
            <div><strong>GPS Address:</strong> {user.gpsAddress || 'N/A'}</div>
            <div><strong>Last Sign In:</strong> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
            <div><strong>Created Date:</strong> {new Date(user.createdAt).toLocaleString()}</div>
            <div><strong>Record Origin:</strong> {user.isProductionRecord ? 'GENUINE PRODUCTION' : 'DEVELOPMENT SEED'}</div>
          </div>
        </div>

        {/* Institution Association & Biometrics */}
        <div className="glass-panel" style={{ padding: 22 }}>
          <h3 style={{ margin: '0 0 14px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} /> Institution Association &amp; Security KYC
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem', marginBottom: 14 }}>
            <div><strong>Institution:</strong> {user.tenant?.name || 'N/A'}</div>
            <div><strong>Institution Code:</strong> {user.tenant?.code || 'N/A'}</div>
            <div><strong>Branch:</strong> {user.branch?.name || 'Main Office'}</div>
            <div><strong>Voice Profile:</strong> {user.voiceProfile ? 'Enrolled' : 'Not Enrolled'}</div>
            <div><strong>Ghana Card:</strong> {user.memberProfile?.ghanaCardNumber || 'N/A'}</div>
            <div><strong>Ghana Card Verified:</strong> {user.memberProfile?.ghanaCardVerified ? 'VERIFIED' : 'PENDING'}</div>
          </div>
          {user.tenant?.id && (
            <Link
              to={`/dev-portal/tenants/${user.tenant.id}`}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
            >
              <Building2 size={14} /> View Associated Institution File
            </Link>
          )}
        </div>
      </div>

      {/* Verification Logs */}
      <div className="glass-panel" style={{ padding: 22 }}>
        <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>
          Recent Security Verification Logs ({(user.verificationLogs || []).length})
        </h3>
        {(!user.verificationLogs || user.verificationLogs.length === 0) ? (
          <p style={{ color: '#94A3B8', fontSize: '0.88rem' }}>No verification attempts logged yet for this account.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {user.verificationLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.verificationType || 'PASSWORD'}</td>
                    <td>
                      <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>{log.ipAddress || '127.0.0.1'}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 3. DEVELOPER SUBSCRIPTION DETAIL PAGE (/dev-portal/subscriptions/:id)     */
/* ========================================================================== */
export function DeveloperSubscriptionDetailPage() {
  const { id } = useParams();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    devApi.get(`/developer/subscriptions/${id}`)
      .then((res) => setSub(res.data?.data || null))
      .catch((err) => setError(err.message || 'Unable to retrieve subscription record.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading subscription record...</p>
      </div>
    );
  }

  if (error || !sub) {
    return (
      <div style={{ padding: 24 }}>
        <BackButtonBar title="Subscription Not Found" fallbackPath="/dev-portal?tab=LOCK_SUBS" />
        <div className="glass-panel" style={{ padding: 24, borderColor: '#EF4444', color: '#FCA5A5' }}>
          {error || 'No subscription record found.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackButtonBar
        title={`Subscription Record: ${sub.planCode || sub.planTier || 'TRIAL_1M'}`}
        subtitle={`Institution: ${sub.tenant?.name || 'N/A'} • Status: ${sub.status}`}
        breadcrumb={['Developer Portal', 'Subscriptions', sub.planCode || 'Detail']}
        fallbackPath="/dev-portal?tab=LOCK_SUBS"
      />

      <div className="glass-panel" style={{ padding: 24, maxWidth: 680 }}>
        <h3 style={{ margin: '0 0 14px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CreditCard size={18} /> Subscription Ledger Entry
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.9rem' }}>
          <div><strong>Institution:</strong> {sub.tenant?.name}</div>
          <div><strong>Institution Code:</strong> {sub.tenant?.code}</div>
          <div><strong>Plan Code:</strong> {sub.planCode}</div>
          <div><strong>Plan Tier:</strong> {sub.planTier}</div>
          <div><strong>Price / Amount:</strong> {formatGHS(sub.priceAmount || 0)}</div>
          <div><strong>Duration Months:</strong> {sub.durationMonths || 1}</div>
          <div><strong>Lifetime Plan:</strong> {sub.isLifetime ? 'YES' : 'NO'}</div>
          <div><strong>Days Remaining:</strong> <span className="badge badge-gold">{sub.daysLeft} days</span></div>
          <div><strong>Start Date:</strong> {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}</div>
          <div><strong>End Date:</strong> {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'LIFETIME'}</div>
          <div><strong>Status:</strong> <span className={`badge ${sub.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{sub.status}</span></div>
          <div><strong>Transaction Ref:</strong> {sub.transactionRef || 'SYSTEM_PROVISION'}</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 4. DEVELOPER SYSTEM ACTIVITY DETAIL (/dev-portal/activities/:id)          */
/* ========================================================================== */
export function DeveloperActivityDetailPage() {
  const { id } = useParams();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    devApi.get(`/developer/activities/${id}`)
      .then((res) => setActivity(res.data?.data || null))
      .catch((err) => setError(err.message || 'Unable to retrieve activity log.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading activity trail from PostgreSQL...</p>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div style={{ padding: 24 }}>
        <BackButtonBar title="Activity Record Not Found" fallbackPath="/dev-portal?tab=ACTIVITIES" />
        <div className="glass-panel" style={{ padding: 24, borderColor: '#EF4444', color: '#FCA5A5' }}>
          {error || 'No activity log entry found.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackButtonBar
        title={`Activity Detail: ${activity.action}`}
        subtitle={`Target: ${activity.targetComponent || activity.entityType || 'SYSTEM'} • ${new Date(activity.createdAt).toLocaleString()}`}
        breadcrumb={['Developer Portal', 'Activities', activity.action]}
        fallbackPath="/dev-portal?tab=ACTIVITIES"
      />

      <div className="glass-panel" style={{ padding: 24, maxWidth: 780 }}>
        <h3 style={{ margin: '0 0 14px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={18} /> Audit Trail Snapshot
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem', marginBottom: 18 }}>
          <div><strong>Action:</strong> {activity.action}</div>
          <div><strong>Target Component:</strong> {activity.targetComponent || activity.entityType}</div>
          <div><strong>Actor / Operator:</strong> {activity.developerUser?.username || activity.user?.email || 'SYSTEM'}</div>
          <div><strong>Status Outcome:</strong> <span className={`badge ${activity.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>{activity.status || 'SUCCESS'}</span></div>
          <div><strong>Timestamp:</strong> {new Date(activity.createdAt).toLocaleString()}</div>
          <div><strong>IP Address:</strong> {activity.details?.ipAddress || '127.0.0.1'}</div>
          <div><strong>Request ID:</strong> {activity.details?.requestId || 'req_auto'}</div>
        </div>

        <h4 style={{ margin: '14px 0 8px', color: '#CBD5E1' }}>Payload / Operation Details</h4>
        <pre
          style={{
            background: 'rgba(5,10,20,0.9)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: 14,
            fontSize: '0.82rem',
            color: '#34D399',
            overflowX: 'auto',
          }}
        >
          {JSON.stringify(activity.details || {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 5. DEVELOPER SECURITY ALERT DETAIL (/dev-portal/security-alerts/:id)       */
/* ========================================================================== */
export function DeveloperSecurityAlertDetailPage() {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [toast, setToast] = useState(null);

  const loadAlert = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.get(`/developer/security-alerts/${id}`);
      setAlert(res.data?.data || null);
    } catch (err) {
      setError(err.message || 'Unable to retrieve security alert.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAlert();
  }, [loadAlert]);

  const handleResolve = async () => {
    setResolving(true);
    try {
      await devApi.post(`/developer/security-alerts/${alert.id}/resolve`, {
        notes: 'Resolved by Lead Developer authority.',
      });
      setToast('Security alert resolved.');
      loadAlert();
    } catch (err) {
      setToast('Failed to resolve alert: ' + err.message);
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
        <p>Loading security alert dossier...</p>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div style={{ padding: 24 }}>
        <BackButtonBar title="Security Alert Not Found" fallbackPath="/dev-portal?tab=DIAGNOSTICS" />
        <div className="glass-panel" style={{ padding: 24, borderColor: '#EF4444', color: '#FCA5A5' }}>
          {error || 'No security alert record found.'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackButtonBar
        title={`Security Alert: ${alert.alertType}`}
        subtitle={`Severity: ${alert.severity} • ${new Date(alert.createdAt).toLocaleString()}`}
        breadcrumb={['Developer Portal', 'Security Alerts', alert.alertType]}
        fallbackPath="/dev-portal?tab=DIAGNOSTICS"
      />

      {toast && (
        <div className="glass-panel" style={{ padding: 12, marginBottom: 16, color: '#34D399' }}>
          {toast}
        </div>
      )}

      <div className="glass-panel" style={{ padding: 24, maxWidth: 720 }}>
        <h3 style={{ margin: '0 0 14px', color: '#F87171', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldAlert size={18} /> Incident Dossier
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.88rem', marginBottom: 16 }}>
          <div><strong>Alert Type:</strong> {alert.alertType}</div>
          <div><strong>Severity:</strong> <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>{alert.severity}</span></div>
          <div><strong>Institution:</strong> {alert.tenant?.name || 'Global / Perimeter'}</div>
          <div><strong>IP Address:</strong> {alert.ipAddress || '127.0.0.1'}</div>
          <div><strong>Resolved Status:</strong> <span className={`badge ${alert.resolved ? 'badge-success' : 'badge-danger'}`}>{alert.resolved ? 'RESOLVED' : 'UNRESOLVED'}</span></div>
          <div><strong>Created At:</strong> {new Date(alert.createdAt).toLocaleString()}</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <strong>Description:</strong>
          <p style={{ marginTop: 4, color: '#CBD5E1', fontSize: '0.88rem' }}>{alert.description}</p>
        </div>

        {!alert.resolved && (
          <button
            type="button"
            disabled={resolving}
            onClick={handleResolve}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            <CheckCircle2 size={16} /> Mark Alert as Resolved
          </button>
        )}
      </div>
    </div>
  );
}
