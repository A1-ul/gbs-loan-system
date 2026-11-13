import React, { useState, useEffect, useCallback } from 'react';
import { Calculator, CheckCircle2, AlertTriangle, FileCheck2, Users } from 'lucide-react';
import api from '../services/api';

const formatGHS = (n) => `GHS ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Accountant Ledger Auditing & Company Owner Sign-Off Workspace
 */
export default function AccountingAuditPanel({ userRole = '' }) {
  const [records, setRecords] = useState([]);
  const [liveSummary, setLiveSummary] = useState(null);
  const [periodLabel, setPeriodLabel] = useState(new Date().toISOString().slice(0, 7));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const upperRole = String(userRole || '').toUpperCase();
  const isOwnerApprover = ['SUPER_ADMIN', 'COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT'].includes(upperRole);
  const canRunAudit = ['SUPER_ADMIN', 'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'FINANCE_MANAGER', 'ACCOUNTANT', 'TREASURY', 'INTERNAL_AUDIT'].includes(upperRole);

  const loadAudits = useCallback(async () => {
    try {
      const res = await api.get('/enterprise/audits');
      const data = res.data?.data || {};
      setRecords(data.records || []);
      setLiveSummary(data.liveSummary || null);
    } catch (_) {}
  }, []);

  useEffect(() => { loadAudits(); }, [loadAudits]);

  const handleRunAudit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post('/enterprise/audits/reconcile', { periodLabel, notes });
      const created = res.data?.data;
      setMsg({
        ok: created?.status !== 'FLAGGED',
        text: `Audit ${created?.auditRef || ''} complete (${created?.status}). Variance: ${formatGHS(created?.variance)}. Submitted to Company Owner.`,
      });
      setNotes('');
      loadAudits();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Audit reconciliation failed' });
    } finally {
      setBusy(false);
    }
  };

  const handleOwnerReview = async (auditId, action) => {
    try {
      await api.put(`/enterprise/audits/${auditId}/review`, {
        action,
        reviewNotes: action === 'APPROVE' ? 'Approved and signed off by Company Owner' : 'Returned to Accountant for ledger correction',
      });
      setMsg({ ok: true, text: `Audit marked ${action === 'APPROVE' ? 'APPROVED' : 'REVISION_REQUIRED'}.` });
      loadAudits();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Sign-off failed' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && (
        <div className="glass-panel" style={{ padding: 12, color: msg.ok ? '#34D399' : '#FBBF24', borderColor: msg.ok ? '#10B981' : '#F59E0B' }}>
          {msg.text}
        </div>
      )}

      {liveSummary && (
        <div className="dashboard-grid">
          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>REGISTERED CUSTOMERS</div>
              <div className="metric-value" style={{ color: '#00F2FE' }}>{liveSummary.totalRegisteredCustomers ?? 0}</div>
            </div>
            <Users size={22} color="#00F2FE" />
          </div>
          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>TOTAL PRINCIPAL DISBURSED</div>
              <div className="metric-value" style={{ color: '#D4AF37', fontSize: '1.2rem' }}>{formatGHS(liveSummary.totalDisbursedGhs)}</div>
            </div>
            <Calculator size={22} color="#D4AF37" />
          </div>
          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>COMPLETED COLLECTIONS</div>
              <div className="metric-value" style={{ color: '#10B981', fontSize: '1.2rem' }}>{formatGHS(liveSummary.totalCollectedGhs)}</div>
            </div>
            <CheckCircle2 size={22} color="#10B981" />
          </div>
          <div className="glass-panel metric-card">
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>UNRECONCILED CASH RECEIPTS</div>
              <div className="metric-value" style={{ color: '#F97316', fontSize: '1.2rem' }}>
                {liveSummary.pendingCashApprovals || 0} ({formatGHS(liveSummary.pendingCashAmountGhs)})
              </div>
            </div>
            <AlertTriangle size={22} color="#F97316" />
          </div>
        </div>
      )}

      {canRunAudit && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck2 size={18} /> Accountant Ledger Reconciliation &amp; Owner Audit Submission
          </h3>
          <form onSubmit={handleRunAudit} className="gbs-grid-3" style={{ gap: 10, alignItems: 'end' }}>
            <div>
              <label className="gbs-label">Audit Period Label</label>
              <input type="text" required className="gbs-input" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="2026-11 or Q4-2026" />
            </div>
            <div>
              <label className="gbs-label">Auditor Notes</label>
              <input type="text" className="gbs-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="End-of-period cash, MoMo & bank balancing" />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <Calculator size={15} /> {busy ? 'Reconciling Ledger...' : 'Run Precision Audit & Submit to Owner'}
            </button>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Submitted Accounting Audit Reports ({records.length})</h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Audit Ref / Period</th>
                <th>Auditor</th>
                <th>Disbursed</th>
                <th>Collected</th>
                <th>Net Cash Position</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Findings &amp; Owner Sign-Off</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.auditRef}</strong>
                    <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>{r.periodLabel}</div>
                  </td>
                  <td>{r.auditedByName}</td>
                  <td>{formatGHS(r.totalPrincipalDisbursed)}</td>
                  <td style={{ color: '#34D399' }}>{formatGHS(r.totalRepaid)}</td>
                  <td>{formatGHS(r.netCashPosition)}</td>
                  <td style={{ color: Number(r.variance) > 0 ? '#F87171' : '#34D399', fontWeight: 700 }}>
                    {formatGHS(r.variance)}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'APPROVED' ? 'badge-success' : r.status === 'FLAGGED' || r.status === 'REVISION_REQUIRED' ? 'badge-danger' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginBottom: 4 }}>
                      {(r.findingItems || []).slice(0, 2).map((f, idx) => (
                        <div key={idx}>• {f.message}</div>
                      ))}
                    </div>
                    {isOwnerApprover && !['APPROVED'].includes(r.status) && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-primary" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleOwnerReview(r.id, 'APPROVE')}>
                          Owner Approve
                        </button>
                        <button type="button" className="btn btn-danger" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleOwnerReview(r.id, 'REVISION_REQUIRED')}>
                          Request Fix
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8' }}>No ledger reconciliation audits submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

