import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, UserX, AlertCircle, CheckCircle2, Trash2, Search, RefreshCw, Calendar, Phone, Mail, Award } from 'lucide-react';

export default function AdminCrossCheckModal({ role, token, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/v1/users/by-role/${role.role}?limit=100`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}: Failed to fetch role users`);
      }
      const data = await res.json();
      if (data.success && data.data) {
        setUsers(data.data.users || []);
      } else {
        throw new Error(data.message || 'Failed to parse users data');
      }
    } catch (err) {
      console.error('Error fetching role users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [role.role, statusFilter]);

  const handleVerifyQualification = async (userId, isQualified) => {
    try {
      setActionLoadingId(userId);
      setFeedbackNotice(null);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/users/${userId}/verify-qualification`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          isQualified,
          notes: isQualified
            ? 'Administrator reviewed registration details and approved qualification.'
            : 'Administrator flagged registration details as incomplete/unqualified.',
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setFeedbackNotice({
          type: 'success',
          msg: isQualified ? 'User verified as qualified and activated!' : 'User marked as unqualified.',
        });
        fetchUsers();
      } else {
        throw new Error(result.message || 'Qualification update failed');
      }
    } catch (err) {
      setFeedbackNotice({ type: 'error', msg: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete unqualified account ${userEmail}? This action will be audited.`)) {
      return;
    }

    try {
      setActionLoadingId(userId);
      setFeedbackNotice(null);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/users/${userId}/remove-unqualified`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          reason: 'Administrator removed unqualified registration from system after profile review.',
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setFeedbackNotice({
          type: 'success',
          msg: `Account ${userEmail} successfully deleted from database.`,
        });
        fetchUsers();
      } else {
        throw new Error(result.message || 'Account removal failed');
      }
    } catch (err) {
      setFeedbackNotice({ type: 'error', msg: err.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '12px',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0b1329, #020c1b)',
        border: '1px solid rgba(212, 175, 55, 0.4)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck color="#D4AF37" size={24} />
              <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1.2rem', fontWeight: '700' }}>
                Admin Cross-Check: {role.displayName}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.8rem' }}>
              Canonical Role: <code style={{ color: '#38bdf8' }}>{role.role}</code> • Registered Total: <strong style={{ color: '#D4AF37' }}>{role.totalRegistered}</strong> Records in Database
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackNotice && (
          <div style={{
            padding: '12px 24px',
            background: feedbackNotice.type === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            borderBottom: `1px solid ${feedbackNotice.type === 'success' ? '#22c55e' : '#ef4444'}`,
            color: feedbackNotice.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {feedbackNotice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {feedbackNotice.msg}
          </div>
        )}

        {/* Controls Bar */}
        <div style={{
          padding: '16px 24px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: '240px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>
            <button
              onClick={fetchUsers}
              style={{
                padding: '8px 12px',
                background: 'rgba(212, 175, 55, 0.15)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '6px',
                color: '#D4AF37',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Filter Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PENDING_VERIFICATION">PENDING VERIFICATION</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>
        </div>

        {/* User Roster List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Querying verified PostgreSQL records...</p>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <UserX size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <p>No registered accounts found matching the criteria.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {users.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(71, 85, 105, 0.3)',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1.1rem',
                    }}>
                      {u.firstName?.[0] || u.email?.[0] || 'U'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '0.95rem', fontWeight: '700' }}>
                          {u.firstName} {u.lastName}
                        </h4>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '0.7rem',
                          fontWeight: '700',
                          background: u.status === 'ACTIVE'
                            ? 'rgba(34, 197, 94, 0.15)'
                            : u.status === 'PENDING_VERIFICATION'
                            ? 'rgba(234, 179, 8, 0.15)'
                            : 'rgba(239, 68, 68, 0.15)',
                          color: u.status === 'ACTIVE'
                            ? '#22c55e'
                            : u.status === 'PENDING_VERIFICATION'
                            ? '#eab308'
                            : '#ef4444',
                        }}>
                          {u.status}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {u.email}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={12} /> {u.phone || 'N/A'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> Registered: {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Qualification & Removal Controls */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {u.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleVerifyQualification(u.id, true)}
                        disabled={actionLoadingId === u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          background: 'rgba(34, 197, 94, 0.15)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          borderRadius: '6px',
                          color: '#22c55e',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Approve & Activate
                      </button>
                    )}

                    {u.status === 'PENDING_VERIFICATION' && (
                      <button
                        onClick={() => handleVerifyQualification(u.id, false)}
                        disabled={actionLoadingId === u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          borderRadius: '6px',
                          color: '#eab308',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        <AlertCircle size={13} />
                        Mark Unqualified
                      </button>
                    )}

                    <button
                      onClick={() => handleRemoveUser(u.id, u.email)}
                      disabled={actionLoadingId === u.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                      Remove Account
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(11, 19, 41, 0.95)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
        }}>
          <span>Showing {users.length} of {role.totalRegistered} registered users for {role.displayName}</span>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: '#e2e8f0',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
