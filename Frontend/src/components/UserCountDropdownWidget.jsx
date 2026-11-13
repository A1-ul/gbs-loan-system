import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ChevronDown, ChevronRight, RefreshCw, ShieldCheck,
  AlertTriangle, CheckCircle2, Trash2, MapPin
} from 'lucide-react';
import api from '../services/api';
import { USER_COUNT_DROPDOWN_ROLES } from '../constants/rolesMeta';

/**
 * Click-to-open / Click-to-hide Company Owner & Admin Registers Cross-Check Panel
 * Allows inspecting live role totals and toggling each register's drop-down member/staff list open or hidden.
 */
export function RegistersCrossCheckPanel({ userRole, totalCustomers = 0, onUpdated }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [countsData, setCountsData] = useState(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [error, setError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [expandedRoles, setExpandedRoles] = useState({});
  const [roleUsersMap, setRoleUsersMap] = useState({});
  const [loadingRole, setLoadingRole] = useState({});
  const [notice, setNotice] = useState('');

  const normalizedRole = String(userRole || '').toUpperCase().replace(/-/g, '_');
  const isAuthorized = USER_COUNT_DROPDOWN_ROLES.has(normalizedRole);
  const isOwnerOrSuper = ['SUPER_ADMIN', 'COMPANY_OWNER'].includes(normalizedRole);

  if (!isAuthorized) return null;

  const fetchCounts = async () => {
    setLoadingCounts(true);
    setError(null);
    try {
      const res = await api.get('/users/counts-by-role');
      setCountsData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load registration counts');
    } finally {
      setLoadingCounts(false);
    }
  };

  const toggleMainPanel = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    if (next) fetchCounts();
  };

  const fetchRoleEntries = async (roleKey) => {
    setLoadingRole((prev) => ({ ...prev, [roleKey]: true }));
    try {
      const res = await api.get(`/users/by-role/${encodeURIComponent(roleKey)}?limit=100`);
      setRoleUsersMap((prev) => ({ ...prev, [roleKey]: res.data?.data?.users || [] }));
    } catch (err) {
      setError(err.response?.data?.message || `Failed loading ${roleKey} register list`);
    } finally {
      setLoadingRole((prev) => ({ ...prev, [roleKey]: false }));
    }
  };

  const toggleRoleDropList = (roleKey) => {
    const nextOpen = !expandedRoles[roleKey];
    setExpandedRoles((prev) => ({ ...prev, [roleKey]: nextOpen }));
    if (nextOpen && !roleUsersMap[roleKey]) {
      fetchRoleEntries(roleKey);
    }
  };

  const handleVerifyAccount = async (roleKey, userId, isQualified) => {
    try {
      await api.post(`/users/${userId}/verify-qualification`, {
        isQualified,
        notes: isQualified ? 'Cross-checked and qualified by Company Owner' : 'Flagged unqualified during cross-check',
      });
      setNotice(isQualified ? 'Account verified and activated.' : 'Account flagged as unqualified.');
      await Promise.all([fetchRoleEntries(roleKey), fetchCounts()]);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Verification update failed');
    }
  };

  const handleRemoveUnqualified = async (roleKey, userId, email) => {
    if (!window.confirm(`Remove unqualified registration ${email}?`)) return;
    try {
      await api.delete(`/users/${userId}/remove-unqualified`, {
        data: { reason: 'Removed by Company Owner after register cross-check' },
      });
      setNotice(`Unqualified registration ${email} removed.`);
      await Promise.all([fetchRoleEntries(roleKey), fetchCounts()]);
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed deleting registration');
    }
  };

  const filteredRoles = (countsData?.roles || []).filter((r) => {
    const q = roleFilter.toLowerCase().trim();
    if (!q) return true;
    return r.displayName.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
  });

  return (
    <div className="glass-panel" style={{ padding: 18, borderColor: 'rgba(212, 175, 55, 0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button
          type="button"
          onClick={toggleMainPanel}
          className="btn btn-secondary"
          style={{
            borderColor: panelOpen ? '#D4AF37' : 'rgba(212,175,55,0.35)',
            color: '#F4E07B',
            fontWeight: 700,
          }}
        >
          <Users size={16} />
          <span>
            {panelOpen
              ? 'Hide Registers Cross-Check Drop Lists'
              : 'Cross-Check Registered Accounts & Role Drop Lists (Click to Open)'}
          </span>
          {panelOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge badge-cyan">Registered Customers: {totalCustomers}</span>
          {countsData?.summary && (
            <span className="badge badge-gold">Total System Registers: {countsData.summary.totalUsers}</span>
          )}
        </div>
      </div>

      {panelOpen && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notice && (
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.16)', color: '#34D399', fontSize: '0.82rem' }}>
              {notice}
            </div>
          )}
          {error && (
            <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.16)', color: '#FCA5A5', fontSize: '0.82rem' }}>
              {error}
            </div>
          )}

          {countsData?.summary && (
            <div className="gbs-grid-3" style={{ gap: 10 }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.28)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>TOTAL REGISTERED USERS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34D399' }}>{countsData.summary.totalUsers}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.28)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>PENDING REVIEW</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FBBF24' }}>{countsData.summary.totalPending}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)' }}>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>UNQUALIFIED ACCOUNTS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F87171' }}>{countsData.summary.totalUnqualified}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="search"
              className="gbs-input"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="Filter register lists across 30 roles (click any role row to open or hide list)..."
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
            <button type="button" className="btn btn-secondary" onClick={fetchCounts} disabled={loadingCounts}>
              <RefreshCw size={14} /> {loadingCounts ? 'Refreshing...' : 'Refresh Registers'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
            {filteredRoles.map((r) => {
              const isRoleOpen = Boolean(expandedRoles[r.role]);
              const entries = roleUsersMap[r.role] || [];
              return (
                <div
                  key={r.role}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${isRoleOpen ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.2)'}`,
                    background: 'rgba(6, 12, 24, 0.78)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleRoleDropList(r.role)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: '#F1F5F9',
                      textAlign: 'left',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isRoleOpen ? <ChevronDown size={16} color="#D4AF37" /> : <ChevronRight size={16} color="#D4AF37" />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F4E07B' }}>{r.displayName}</div>
                        <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                          Active: {r.activeCount} • Pending: {r.pendingCount} • Unqualified: {r.unqualifiedCount}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge badge-gold">{r.totalCount} Registered</span>
                      <span style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>{isRoleOpen ? 'Click to Hide' : 'Click to Open'}</span>
                    </div>
                  </button>

                  {isRoleOpen && (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(212,175,55,0.18)', background: 'rgba(11, 23, 44, 0.65)' }}>
                      {loadingRole[r.role] ? (
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: 8 }}>Loading registered accounts...</div>
                      ) : entries.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: '#94A3B8', padding: 8 }}>
                          No registered accounts in {r.displayName} yet.
                        </div>
                      ) : (
                        <div className="data-table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Full Name</th>
                                <th>Email &amp; Phone</th>
                                <th>GPS Address</th>
                                <th>Status</th>
                                <th>Cross-Check</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((u) => (
                                <tr key={u.id}>
                                  <td><strong>{u.firstName} {u.lastName}</strong></td>
                                  <td>
                                    <div style={{ fontSize: '0.8rem' }}>{u.email}</div>
                                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{u.phone}</div>
                                  </td>
                                  <td style={{ fontSize: '0.76rem', color: '#00F2FE' }}>
                                    <MapPin size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                    {u.gpsAddress || u.address || 'N/A'}
                                  </td>
                                  <td>
                                    <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : u.status === 'UNQUALIFIED' ? 'badge-danger' : 'badge-warning'}`}>
                                      {u.status}
                                    </span>
                                  </td>
                                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                                      onClick={() => handleVerifyAccount(r.role, u.id, true)}
                                    >
                                      <CheckCircle2 size={12} /> Verify
                                    </button>
                                    {isOwnerOrSuper && u.status !== 'ACTIVE' && (
                                      <button
                                        type="button"
                                        className="btn btn-danger"
                                        style={{ padding: '4px 9px', fontSize: '0.72rem' }}
                                        onClick={() => handleRemoveUnqualified(r.role, u.id, u.email)}
                                      >
                                        <Trash2 size={12} /> Remove
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Click-to-open User Registration Counts Dropdown Widget
 * RULE: Registration counts NEVER appear globally on the main dashboard header bar;
 *       visible STRICTLY inside an authorized dropdown for permitted Admin/HR/Audit roles.
 */
export default function UserCountDropdownWidget({ userRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const [countsData, setCountsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  const normalizedRole = String(userRole || '').toUpperCase().replace(/-/g, '_');
  const isAuthorized = USER_COUNT_DROPDOWN_ROLES.has(normalizedRole);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchCounts = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users/counts-by-role');
      setCountsData(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load registration counts');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) return null;

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) fetchCounts();
  };

  const rolesList = (countsData?.roles || []).filter((r) => {
    const q = filter.toLowerCase().trim();
    if (!q) return true;
    return r.displayName.toLowerCase().includes(q) || r.role.toLowerCase().includes(q);
  });

  return (
    <div className="dropdown-panel" ref={wrapperRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="btn btn-secondary"
        style={{
          padding: '8px 13px',
          fontSize: '0.82rem',
          borderColor: isOpen ? '#D4AF37' : 'rgba(212,175,55,0.35)',
          color: '#F4E07B',
        }}
        data-testid="user-counts-dropdown-trigger"
      >
        <Users size={15} />
        <span>Staff & User Counts</span>
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div className="dropdown-popover" data-testid="user-counts-dropdown-menu">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#D4AF37' }}>
                Authorized Registration Count & Cross-Check
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Live PostgreSQL Role Totals • Click any role to verify qualifications
              </div>
            </div>
            <button type="button" className="btn btn-secondary" style={{ padding: '5px 8px' }} onClick={fetchCounts} title="Refresh">
              <RefreshCw size={13} />
            </button>
          </div>

          {countsData?.summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>TOTAL USERS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34D399' }}>{countsData.summary.totalUsers}</div>
              </div>
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>PENDING REVIEW</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FBBF24' }}>{countsData.summary.totalPending}</div>
              </div>
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>UNQUALIFIED</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F87171' }}>{countsData.summary.totalUnqualified}</div>
              </div>
            </div>
          )}

          <input
            type="text"
            className="gbs-input"
            placeholder="Filter across 30 roles..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ marginBottom: 10, padding: '7px 11px', fontSize: '0.8rem' }}
          />

          {loading && <div style={{ padding: 16, textAlign: 'center', fontSize: '0.82rem', color: '#94A3B8' }}>Loading live counts...</div>}
          {error && (
            <div style={{ padding: 10, color: '#FCA5A5', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rolesList.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/admin/users-crosscheck?role=${encodeURIComponent(r.role)}`);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: 'rgba(15, 27, 49, 0.72)',
                    border: '1px solid rgba(212,175,55,0.18)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#F1F5F9',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{r.displayName}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                      Active: {r.activeCount} • Pending: {r.pendingCount} • Unqualified: {r.unqualifiedCount}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-gold">{r.totalCount}</span>
                    <ShieldCheck size={14} color="#D4AF37" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

