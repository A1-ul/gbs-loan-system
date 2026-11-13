import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronDown, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import { USER_COUNT_DROPDOWN_ROLES } from '../constants/rolesMeta';

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

