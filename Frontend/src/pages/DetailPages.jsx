import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2, XCircle, Upload, RotateCcw, ShieldCheck, UserX,
  Camera, KeyRound, CreditCard, MapPin, Landmark, Trash2
} from 'lucide-react';
import api, { sessionStore } from '../services/api';
import { BackButtonBar } from '../context/NavigationContext';
import VoiceChallengePanel from '../components/VoiceChallengePanel';
import FaceScanner from '../components/biometric/FaceScanner';
import { ROLES_META, resolveRoleCapabilities } from '../constants/rolesMeta';

const formatGHS = (n) =>
  `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ========================================================================== */
/* 1. LOAN DETAIL, SCHEDULE, WORKFLOW & DISBURSEMENT PAGE (/loans/:id)        */
/* ========================================================================== */
export function LoanDetailPage() {
  const { id } = useParams();
  const currentUser = sessionStore.getTenantUser();
  const caps = resolveRoleCapabilities(currentUser?.role);
  const roleActions = caps.actions || {};
  const canShowLoanWorkflowPanel = roleActions.canReviewLoan || roleActions.canApproveLoan || roleActions.canDisburseLoan;
  const [loan, setLoan] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [workflow, setWorkflow] = useState([]);
  const [totpHeader, setTotpHeader] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const [lRes, sRes] = await Promise.all([
        api.get(`/loans/${id}`),
        api.get(`/loans/${id}/schedule`).catch(() => ({ data: { data: [] } })),
      ]);
      setLoan(lRes.data?.data || null);
      setSchedule(sRes.data?.data || []);
      const wRes = await api.get(`/loans/${id}/workflow`).catch(() => ({ data: { data: [] } }));
      setWorkflow(wRes.data?.data || []);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Unable to load loan details' });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (action) => {
    try {
      await api.put(`/loans/${id}/review`, {
        action,
        notes: `Officer decision: ${action}`,
        ...(action === 'reject' ? { rejectionReason: rejectReason || 'Does not meet credit underwriting ratio' } : {}),
      });
      setMsg({ ok: true, text: `Loan review submitted (${action}).` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Review failed' });
    }
  };

  const handleApprove = async () => {
    try {
      await api.put(`/loans/${id}/approve`, {}, {
        headers: totpHeader ? { 'x-2fa-token': totpHeader } : undefined,
      });
      setMsg({ ok: true, text: 'Loan APPROVED!' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Approval failed' });
    }
  };

  const handleDisburse = async () => {
    try {
      await api.put(`/loans/${id}/disburse`, { notes: 'Disbursed to borrower account' }, {
        headers: totpHeader ? { 'x-2fa-token': totpHeader } : undefined,
      });
      setMsg({ ok: true, text: 'Loan DISBURSED & repayment schedule generated!' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Disbursement failed' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title={`Loan File: ${loan?.loanNumber || id.slice(0, 8)}`}
        subtitle={loan ? `${loan.member?.user?.firstName} ${loan.member?.user?.lastName} • Status: ${loan.status}` : 'Loading...'}
        breadcrumb={['Dashboard', 'Loans', loan?.loanNumber || 'Detail']}
      />

      {msg && (
        <div className="glass-panel" style={{ padding: 12, marginBottom: 16, borderColor: msg.ok ? '#10B981' : '#EF4444', color: msg.ok ? '#34D399' : '#FCA5A5' }}>
          {msg.text}
        </div>
      )}

      {loan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="dashboard-grid">
            <div className="glass-panel metric-card">
              <div><div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>PRINCIPAL</div><div className="metric-value" style={{ color: '#D4AF37' }}>{formatGHS(loan.principalAmount)}</div></div>
              <Landmark size={24} color="#D4AF37" />
            </div>
            <div className="glass-panel metric-card">
              <div><div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>TOTAL PAYABLE</div><div className="metric-value" style={{ color: '#38BDF8' }}>{formatGHS(loan.totalAmount)}</div></div>
              <CreditCard size={24} color="#38BDF8" />
            </div>
            <div className="glass-panel metric-card">
              <div><div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>AMOUNT PAID</div><div className="metric-value" style={{ color: '#10B981' }}>{formatGHS(loan.amountPaid)}</div></div>
              <CheckCircle2 size={24} color="#10B981" />
            </div>
            <div className="glass-panel metric-card">
              <div><div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>OUTSTANDING</div><div className="metric-value" style={{ color: '#F97316' }}>{formatGHS(loan.outstandingAmount)}</div></div>
              <CreditCard size={24} color="#F97316" />
            </div>
          </div>

          {canShowLoanWorkflowPanel && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Loan Lifecycle Workflow Actions</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {(roleActions.canApproveLoan || roleActions.canDisburseLoan) && (
                  <input
                    type="text"
                    className="gbs-input"
                    style={{ width: 190 }}
                    placeholder="2FA Code (if Manager w/ 2FA)"
                    value={totpHeader}
                    onChange={(e) => setTotpHeader(e.target.value)}
                  />
                )}
                {roleActions.canReviewLoan && (
                  <button type="button" className="btn btn-secondary" onClick={() => handleReview('approve')}>Officer Review Approve</button>
                )}
                {roleActions.canApproveLoan && (
                  <button type="button" className="btn btn-primary" onClick={handleApprove}>Final Approve</button>
                )}
                {roleActions.canDisburseLoan && (
                  <button type="button" className="btn btn-primary" onClick={handleDisburse}>Disburse Funds</button>
                )}
                {(roleActions.canReviewLoan || roleActions.canApproveLoan) && (
                  <>
                    <input
                      type="text"
                      className="gbs-input"
                      style={{ width: 200 }}
                      placeholder="Rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <button type="button" className="btn btn-danger" onClick={() => handleReview('reject')}>Reject Application</button>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Repayment Installment Schedule ({schedule.length})</h3>
              <div className="data-table-container">
                <table className="data-table">
                  <thead><tr><th>#</th><th>Due Date</th><th>Total Due</th><th>Paid</th><th>Status</th></tr></thead>
                  <tbody>
                    {schedule.map((inst) => (
                      <tr key={inst.id}>
                        <td>{inst.installmentNo}</td>
                        <td>{new Date(inst.dueDate).toLocaleDateString()}</td>
                        <td>{formatGHS(inst.totalDue)}</td>
                        <td>{formatGHS(inst.amountPaid)}</td>
                        <td><span className={`badge ${inst.isPaid ? 'badge-success' : 'badge-warning'}`}>{inst.isPaid ? 'PAID' : 'DUE'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Approval &amp; Loan Process Audit History ({workflow.length})</h3>
              {workflow.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: '#94A3B8' }}>No workflow transition entries logged yet.</p>
              ) : (
                workflow.map((w, i) => (
                  <div key={w.id || i} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', marginBottom: 10, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                      <strong style={{ color: '#F4E07B' }}>
                        {w.fromStatus ? `${w.fromStatus} → ${w.toStatus}` : (w.toStatus || w.action || 'UPDATED')}
                      </strong>
                      <span style={{ color: '#94A3B8', fontSize: '0.73rem' }}>{new Date(w.createdAt).toLocaleString()}</span>
                    </div>
                    <div style={{ color: '#CBD5E1', marginBottom: 4 }}>
                      Actor: <strong>{w.performedByName || w.performedBy || 'Staff User'}</strong>
                      {w.performedByRole ? ` (${w.performedByRole})` : ''}
                    </div>
                    <div style={{ color: '#94A3B8' }}>{w.notes || 'Workflow state saved for compliance audit'}</div>
                    {w.auditSnapshot && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: '0.72rem', color: '#00F2FE' }}>
                        <span>Principal: {formatGHS(w.auditSnapshot.principalAmount)}</span>
                        <span>• Total: {formatGHS(w.auditSnapshot.totalAmount)}</span>
                        <span>• Paid: {formatGHS(w.auditSnapshot.amountPaid)}</span>
                        <span>• Balance: {formatGHS(w.auditSnapshot.outstandingAmount)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* 2. MEMBER KYC & PROFILE DETAIL (/members/:id)                              */
/* ========================================================================== */
export function MemberDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = sessionStore.getTenantUser();
  const memberRoleActions = resolveRoleCapabilities(currentUser?.role).actions || {};
  const [member, setMember] = useState(null);
  const [delReason, setDelReason] = useState('');
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/members/${id}`);
      setMember(res.data?.data || null);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Unable to load borrower profile' });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleVerifyGhanaCard = async () => {
    try {
      await api.post(`/members/${id}/verify-ghana-card`, { verified: true });
      setMsg({ ok: true, text: 'Ghana Card KYC marked VERIFIED!' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'KYC update failed' });
    }
  };

  const handleUploadPicture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('picture', file);
    try {
      await api.post(`/members/${id}/profile-picture`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMsg({ ok: true, text: 'Borrower profile photo saved!' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Photo upload failed' });
    }
  };

  const handleRequestDeletion = async () => {
    try {
      await api.post(`/members/${id}/request-deletion`, { reason: delReason || 'Duplicate or closed borrower profile' });
      setMsg({ ok: true, text: 'Deletion request submitted to Manager approval queue.' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Deletion request failed' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title={`Borrower Profile: ${member?.user?.firstName || ''} ${member?.user?.lastName || ''}`}
        subtitle={`Member #${member?.memberNumber || id.slice(0, 8)}`}
        breadcrumb={['Dashboard', 'Borrowers', member?.memberNumber || 'Profile']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}

      {member && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
              {member.profilePicture ? (
                <img src={member.profilePicture} alt="Borrower" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #D4AF37' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', color: '#D4AF37' }}>
                  {(member.user?.firstName?.[0] || 'M') + (member.user?.lastName?.[0] || '')}
                </div>
              )}
              <div>
                <h3 style={{ margin: 0 }}>{member.user?.firstName} {member.user?.lastName}</h3>
                <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{member.user?.phone} • {member.user?.email}</div>
                <span className={`badge ${member.ghanaCardVerified ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 6 }}>
                  {member.ghanaCardVerified ? 'GHANA CARD VERIFIED' : 'KYC PENDING'}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: '#CBD5E1', display: 'grid', gap: 6, marginBottom: 16 }}>
              <div><strong>Ghana Card:</strong> {member.ghanaCardNumber || 'Not Provided'}</div>
              <div><strong>GPS Digital Address:</strong> {member.gpsAddress || member.user?.gpsAddress || 'Not Provided'}</div>
              <div><strong>Physical Address:</strong> {member.address || 'Not Provided'}</div>
              <div><strong>Occupation:</strong> {member.occupation || 'N/A'}</div>
              {member.isHidden && (
                <div><span className="badge badge-danger">HIDDEN RECORD (Searchable by Mobile or GPS Address)</span></div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!member.ghanaCardVerified && memberRoleActions.canVerifyKyc && (
                <button type="button" className="btn btn-primary" onClick={handleVerifyGhanaCard}>Verify Ghana Card KYC</button>
              )}
              {(memberRoleActions.canRegisterMember || member.userId === currentUser?.id) && (
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={14} /> Upload Photo
                  <input type="file" accept="image/*" onChange={handleUploadPicture} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {memberRoleActions.canRequestDeletion && (
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(239,68,68,0.25)' }}>
                <label className="gbs-label">Request Profile Deletion (Manager Approval Required)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" className="gbs-input" placeholder="Reason for removal..." value={delReason} onChange={(e) => setDelReason(e.target.value)} />
                  <button type="button" className="btn btn-danger" onClick={handleRequestDeletion}>Request Deletion</button>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Borrower Loans ({member.loans?.length || 0})</h3>
            {(member.loans || []).map((l) => (
              <div
                key={l.id}
                onClick={() => navigate(`/loans/${l.id}`)}
                style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', marginBottom: 8, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              >
                <div><strong>{l.loanNumber}</strong> • {formatGHS(l.principalAmount)}</div>
                <span className="badge badge-gold">{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* 3. PAYMENT DETAIL & CASH RECEIPT APPROVAL (/payments/:id)                  */
/* ========================================================================== */
export function PaymentDetailPage() {
  const { id } = useParams();
  const currentUser = sessionStore.getTenantUser();
  const paymentRoleActions = resolveRoleCapabilities(currentUser?.role).actions || {};
  const [payment, setPayment] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/payments/${id}`);
      setPayment(res.data?.data || null);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Unable to load payment' });
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCashApproval = async (approved) => {
    try {
      await api.put(`/payments/${id}/approve-cash`, { paymentId: payment.id, approved, notes: approved ? 'Cash receipt reconciled' : 'Cash mismatch flagged' });
      setMsg({ ok: true, text: `Cash receipt ${approved ? 'APPROVED' : 'REJECTED'}.` });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Cash approval error' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title={`Payment Receipt: ${payment?.paymentRef || payment?.receiptNumber || id.slice(0, 8)}`}
        subtitle={payment ? `${payment.method} • ${formatGHS(payment.amount)} • ${payment.status}` : 'Loading...'}
        breadcrumb={['Dashboard', 'Payments', payment?.receiptNumber || 'Receipt']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}
      {payment && (
        <div className="glass-panel" style={{ padding: 24, maxWidth: 680 }}>
          <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
            <div><strong>Transaction Reference:</strong> {payment.paymentRef}</div>
            <div><strong>Receipt Number:</strong> {payment.receiptNumber || 'N/A'}</div>
            <div><strong>Amount Paid:</strong> {formatGHS(payment.amount)}</div>
            <div><strong>Channel:</strong> {payment.method}</div>
            <div><strong>Status:</strong> <span className="badge badge-gold">{payment.status}</span></div>
            <div><strong>Paid At:</strong> {new Date(payment.createdAt).toLocaleString()}</div>
          </div>
          {payment.method === 'CASH' && ['AWAITING_APPROVAL', 'PENDING'].includes(payment.status) && paymentRoleActions.canApproveCash && (
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button type="button" className="btn btn-primary" onClick={() => handleCashApproval(true)}>Approve Cash Receipt</button>
              <button type="button" className="btn btn-danger" onClick={() => handleCashApproval(false)}>Reject Cash Receipt</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* 4. COLLECTOR DETAIL & ROUTE HISTORY (/collectors/:id)                      */
/* ========================================================================== */
export function CollectorDetailPage() {
  const { id } = useParams();
  const [collector, setCollector] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get(`/collectors/${id}`).then((r) => setCollector(r.data?.data || null)).catch(() => null);
    api.get(`/collectors/${id}/history`).then((r) => setHistory(r.data?.data || [])).catch(() => null);
  }, [id]);

  return (
    <div>
      <BackButtonBar
        title={`Collector Route: ${collector?.user?.firstName || ''} ${collector?.user?.lastName || ''}`}
        subtitle={`Employee #${collector?.employeeId || id.slice(0, 8)} • Zone: ${collector?.assignedZone || 'Accra'}`}
        breadcrumb={['Dashboard', 'Collectors', collector?.employeeId || 'Detail']}
      />
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><MapPin size={16} /> GPS Location Audit History ({history.length})</h3>
        {history.length === 0 ? (
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>No route waypoints recorded yet.</p>
        ) : (
          history.map((h) => (
            <div key={h.id} style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '0.82rem' }}>
              Lat {h.latitude}, Lng {h.longitude} • Status: {h.status} • Speed: {h.speed || 0} km/h • {new Date(h.recordedAt).toLocaleString()}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 5. GUARANTOR DETAIL & AGREEMENT SIGN-OFF (/guarantors/:id)                 */
/* ========================================================================== */
export function GuarantorDetailPage() {
  const { id } = useParams();
  const currentUser = sessionStore.getTenantUser();
  const gurRoleActions = resolveRoleCapabilities(currentUser?.role).actions || {};
  const [guarantor, setGuarantor] = useState(null);
  const [loans, setLoans] = useState([]);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    api.get(`/guarantors/${id}`).then((r) => setGuarantor(r.data?.data || null)).catch(() => null);
    api.get(`/guarantors/${id}/loans`).then((r) => setLoans(r.data?.data || [])).catch(() => null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const signAgreement = async () => {
    try {
      await api.post(`/guarantors/${id}/sign-agreement`, { accepted: true });
      setMsg({ ok: true, text: 'Digital Guarantor Liability Agreement SIGNED!' });
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Sign-off error' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title={`Guarantor File: ${guarantor?.user?.firstName || ''} ${guarantor?.user?.lastName || ''}`}
        subtitle={`Status: ${guarantor?.agreementSigned ? 'Signed' : 'Unsigned'}`}
        breadcrumb={['Dashboard', 'Guarantors', 'Detail']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}
      <div className="glass-panel" style={{ padding: 20 }}>
        {guarantor && (
          <div style={{ display: 'grid', gap: 6, fontSize: '0.84rem', color: '#CBD5E1', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div><strong>Phone:</strong> {guarantor.user?.phone || 'N/A'} • <strong>Email:</strong> {guarantor.user?.email || 'N/A'}</div>
            <div><strong>GPS Digital Address:</strong> {guarantor.gpsAddress || guarantor.user?.gpsAddress || 'Not Provided'}</div>
            <div><strong>Physical Address:</strong> {guarantor.address || guarantor.user?.address || 'Not Provided'}</div>
            {guarantor.isHidden && <div><span className="badge badge-danger">HIDDEN GUARANTOR (Locatable by Mobile or GPS Address)</span></div>}
          </div>
        )}
        {!guarantor?.agreementSigned && (gurRoleActions.canSignOwnGuarantee || gurRoleActions.canManageGuarantors) && (
          <button type="button" className="btn btn-primary" onClick={signAgreement} style={{ marginBottom: 16 }}>
            Sign Digital Guarantor Agreement
          </button>
        )}
        <h3 style={{ margin: '0 0 10px', color: '#00F2FE' }}>Guaranteed Loans ({loans.length})</h3>
        {loans.map((l) => (
          <div key={l.id} style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            Loan <strong>{l.loan?.loanNumber || l.loanId}</strong> — Guaranteed Principal: {formatGHS(l.guaranteedAmount || l.loan?.principalAmount)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 6. STAFF QUALIFICATION & SALARY GROUPING (/staff/:id)                      */
/* ========================================================================== */
export function StaffDetailPage() {
  const { id } = useParams();
  const currentUser = sessionStore.getTenantUser();
  const staffRoleActions = resolveRoleCapabilities(currentUser?.role).actions || {};
  const canEditStaffSalary = staffRoleActions.canCreateStaff || staffRoleActions.canManagePayroll;
  const [staff, setStaff] = useState(null);
  const [groupForm, setGroupForm] = useState({ qualificationLevel: 'DEGREE', positionTitle: 'Senior Officer', salaryGrade: 'GRADE_3', baseSalary: '4500', allowances: '500' });
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    api.get(`/staff/${id}`).then((r) => setStaff(r.data?.data || null)).catch(() => null);
    api.get(`/hr/salary-grouping/profile/${id}`).then((r) => {
      if (r.data?.data) setGroupForm((p) => ({ ...p, ...r.data.data }));
    }).catch(() => null);
  }, [id]);

  const handleSaveSalaryProfile = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/hr/salary-grouping/profile/${id}`, {
        qualificationLevel: groupForm.qualificationLevel,
        positionTitle: groupForm.positionTitle,
        salaryGrade: groupForm.salaryGrade,
        baseSalary: Number(groupForm.baseSalary),
        allowances: Number(groupForm.allowances || 0),
      });
      setMsg({ ok: true, text: 'Staff Qualification Salary Group updated in PostgreSQL!' });
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Save failed' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title={`Staff Profile: ${staff?.user?.firstName || ''} ${staff?.user?.lastName || ''}`}
        subtitle={`${staff?.department || 'Operations'} • ${staff?.position || ''}`}
        breadcrumb={['Dashboard', 'HR & Staff', staff?.employeeId || 'Profile']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}
      {canEditStaffSalary ? (
        <div className="glass-panel" style={{ padding: 22, maxWidth: 640 }}>
          <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>HR Qualification &amp; Salary Grade Assignment</h3>
          <form onSubmit={handleSaveSalaryProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label className="gbs-label">Qualification Level</label>
              <select className="gbs-select" value={groupForm.qualificationLevel} onChange={(e) => setGroupForm({ ...groupForm, qualificationLevel: e.target.value })}>
                <option value="CERTIFICATE">Certificate / Diploma</option>
                <option value="DEGREE">Bachelor&apos;s Degree</option>
                <option value="MASTERS">Master&apos;s / MBA</option>
                <option value="PROFESSIONAL">CPA / ACCA / Chartered</option>
              </select>
            </div>
            <div>
              <label className="gbs-label">Salary Grade</label>
              <input type="text" className="gbs-input" value={groupForm.salaryGrade} onChange={(e) => setGroupForm({ ...groupForm, salaryGrade: e.target.value })} />
            </div>
            <div className="gbs-grid-2" style={{ gap: 10 }}>
              <div>
                <label className="gbs-label">Base Salary (GHS)</label>
                <input type="number" className="gbs-input" value={groupForm.baseSalary} onChange={(e) => setGroupForm({ ...groupForm, baseSalary: e.target.value })} />
              </div>
              <div>
                <label className="gbs-label">Allowances (GHS)</label>
                <input type="number" className="gbs-input" value={groupForm.allowances} onChange={(e) => setGroupForm({ ...groupForm, allowances: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Save Qualification Salary Profile</button>
          </form>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 22, maxWidth: 640 }}>
          <h3 style={{ margin: '0 0 8px', color: '#D4AF37' }}>Staff Profile Summary</h3>
          <div style={{ fontSize: '0.86rem', color: '#CBD5E1' }}>
            <strong>Employee ID:</strong> {staff?.employeeId || id.slice(0, 8)} • <strong>Department:</strong> {staff?.department || 'Operations'} • <strong>Position:</strong> {staff?.position || 'N/A'}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* 7. ADMIN USER QUALIFICATION CROSS-CHECK PAGE (/admin/users-crosscheck)     */
/* ========================================================================== */
export function AdminUsersCrossCheckPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get('role') || 'LOAN_OFFICER';
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState(null);

  const loadRoleUsers = useCallback(async () => {
    try {
      const res = await api.get(`/users/by-role/${encodeURIComponent(selectedRole)}?limit=100&search=${encodeURIComponent(search)}`);
      setUsers(res.data?.data?.users || []);
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Unable to load role accounts' });
    }
  }, [selectedRole, search]);

  useEffect(() => { loadRoleUsers(); }, [loadRoleUsers]);

  const handleVerify = async (userId, isQualified) => {
    try {
      await api.post(`/users/${userId}/verify-qualification`, {
        isQualified,
        notes: isQualified ? 'Admin verified qualification' : 'Flagged unqualified',
      });
      setMsg({ ok: true, text: isQualified ? 'Account verified & activated!' : 'Account marked unqualified.' });
      loadRoleUsers();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Verification failed' });
    }
  };

  const handleRemoveUnqualified = async (userId, fullName) => {
    try {
      await api.delete(`/users/${userId}/remove-unqualified`, {
        data: { reason: 'Removed by Admin after registration qualification cross-check' },
      });
      setMsg({ ok: true, text: `Unqualified user "${fullName}" deleted.` });
      loadRoleUsers();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Removal failed' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title="Admin User Registration Qualification Cross-Check"
        subtitle="Inspect registered staff & user accounts per role, verify credentials, or purge unqualified registrations"
        breadcrumb={['Dashboard', 'Administration', 'Qualification Cross-Check']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}

      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <select
            className="gbs-select"
            style={{ maxWidth: 280 }}
            value={selectedRole}
            onChange={(e) => setSearchParams({ role: e.target.value })}
          >
            {ROLES_META.map((r) => (
              <option key={r.key} value={r.key}>{r.title}</option>
            ))}
          </select>
          <input
            type="text"
            className="gbs-input"
            style={{ maxWidth: 280 }}
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Full Name</th><th>Email / Phone</th><th>Status</th><th>Qualification</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.firstName} {u.lastName}</strong></td>
                  <td>{u.email} • {u.phone}</td>
                  <td><span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{u.status}</span></td>
                  <td>
                    <span className={`badge ${u.qualificationVerified ? 'badge-success' : 'badge-danger'}`}>
                      {u.qualificationVerified ? 'QUALIFIED' : 'PENDING / UNVERIFIED'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {!u.qualificationVerified && (
                      <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleVerify(u.id, true)}>
                        <ShieldCheck size={13} /> Approve
                      </button>
                    )}
                    <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleRemoveUnqualified(u.id, `${u.firstName} ${u.lastName}`)}>
                      <Trash2 size={13} /> Remove Unqualified
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>No accounts found for role {selectedRole}.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 8. EXCEL / CSV / JSON MIGRATION WORKSPACE (/migrations)                    */
/* ========================================================================== */
export function DataMigrationPage() {
  const [targetEntity, setTargetEntity] = useState('MEMBERS');
  const [jobs, setJobs] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [msg, setMsg] = useState(null);

  const loadJobs = async () => {
    try {
      const res = await api.get('/migration/jobs');
      setJobs(res.data?.data || []);
    } catch (_) { }
  };

  useEffect(() => { loadJobs(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('targetEntity', targetEntity);
    try {
      const res = await api.post('/migration/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAnalysis(res.data);
      setMsg({ ok: true, text: `Parsed ${res.data?.records?.length || 0} rows from ${file.name}. Review & execute below.` });
      loadJobs();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'File parse error' });
    }
  };

  const handleExecuteJob = async () => {
    if (!analysis?.data?.id) return;
    try {
      const res = await api.post(`/migration/jobs/${analysis.data.id}/process`, {
        records: analysis.records || [],
        targetEntity,
      });
      setMsg({ ok: true, text: `Imported ${res.data?.data?.processedRecords || 0} records into PostgreSQL!` });
      setAnalysis(null);
      loadJobs();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Execution error' });
    }
  };

  const handleRollback = async (jobId) => {
    try {
      await api.post(`/migration/jobs/${jobId}/rollback`);
      setMsg({ ok: true, text: 'Migration job rolled back cleanly!' });
      loadJobs();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Rollback failed' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title="Enterprise Data Migration Studio (Excel / CSV / JSON)"
        subtitle="Validate columns, detect duplicates, import into PostgreSQL or rollback atomically"
        breadcrumb={['Dashboard', 'Administration', 'Data Migration']}
      />
      {msg && <div className="glass-panel" style={{ padding: 12, marginBottom: 14, color: msg.ok ? '#34D399' : '#FCA5A5' }}>{msg.text}</div>}

      {/* Step-by-Step Institutional Data Migration Guide for Admins & Branch Managers */}
      <div className="glass-panel" style={{ padding: 18, marginBottom: 18, borderColor: 'rgba(212,175,55,0.35)' }}>
        <h3 style={{ margin: '0 0 10px', color: '#D4AF37', fontSize: '1rem' }}>
          Step-by-Step Guide: Migrating Institutional Data Onto GBS Loan System
        </h3>
        <div className="gbs-grid-4" style={{ gap: 10 }}>
          {[
            {
              step: 'Step 1: Prepare Sheet',
              detail: 'Export your legacy records (.xlsx, .csv, or .json) including First Name, Last Name, Phone (+233...), and GPS Digital Address.',
            },
            {
              step: 'Step 2: Choose Entity',
              detail: 'Select Borrowers/Members, Active/Historical Loans, or Repayment Ledger below, then upload your spreadsheet.',
            },
            {
              step: 'Step 3: Review Preview',
              detail: 'Verify mapped columns, phone numbers, monetary amounts, and duplicate-detection preview before committing.',
            },
            {
              step: 'Step 4: Commit / Rollback',
              detail: 'Click Commit Transactional Import to save to PostgreSQL; use Atomic Rollback on any job if corrections are needed.',
            },
          ].map((item) => (
            <div key={item.step} style={{ padding: 12, borderRadius: 10, background: 'rgba(6,12,24,0.75)', border: '1px solid rgba(0,242,254,0.18)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#00F2FE', marginBottom: 4 }}>{item.step}</div>
              <div style={{ fontSize: '0.76rem', color: '#CBD5E1', lineHeight: 1.4 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="gbs-grid-2">
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>1. Upload Legacy Workbook</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <select className="gbs-select" value={targetEntity} onChange={(e) => setTargetEntity(e.target.value)}>
              <option value="MEMBERS">Borrowers / Members</option>
              <option value="LOANS">Active / Historical Loans</option>
              <option value="PAYMENTS">Repayment Ledger</option>
            </select>
            <label className="btn btn-primary" style={{ justifyContent: 'center', cursor: 'pointer' }}>
              <Upload size={16} /> Select .XLSX / .CSV / .JSON File
              <input type="file" accept=".xlsx,.xls,.csv,.json" onChange={handleUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {analysis && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.84rem', color: '#CBD5E1', marginBottom: 8 }}>
                Preview ({analysis.records?.length || 0} rows ready):
              </div>
              <pre style={{ background: '#040810', padding: 10, borderRadius: 8, fontSize: '0.72rem', maxHeight: 180, overflow: 'auto' }}>
                {JSON.stringify(analysis.preview || [], null, 2)}
              </pre>
              <button type="button" className="btn btn-primary" style={{ marginTop: 10 }} onClick={handleExecuteJob}>
                Commit Transactional Import to PostgreSQL
              </button>
            </div>
          )}
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>2. Migration Audit Jobs ({jobs.length})</h3>
          {jobs.map((j) => (
            <div key={j.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{j.fileName}</div>
                <div style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                  {j.status} • Success: {j.processedRecords || 0} / Failed: {j.failedRecords || 0}
                </div>
              </div>
              {j.status === 'COMPLETED' && (
                <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleRollback(j.id)}>
                  <RotateCcw size={13} /> Rollback
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 9. PROFILE, 2FA TOTP, VOICE IDENTITY & FACIAL BIOMETRIC (/profile)         */
/* ========================================================================== */
export function ProfileSecurityPage() {
  const [user, setUser] = useState(() => sessionStore.getTenantUser());
  const [totpSetup, setTotpSetup] = useState(null);
  const [totpVerify, setTotpVerify] = useState('');
  const [faceMsg, setFaceMsg] = useState(null);
  const [picSaving, setPicSaving] = useState(false);

  const handleSaveProfilePhoto = async (dataUrl) => {
    if (!dataUrl) return;
    setPicSaving(true);
    try {
      const res = await api.post('/auth/profile-picture', { profilePicture: dataUrl });
      const savedUrl = res.data?.data?.profilePicture || dataUrl;
      const updatedUser = { ...(user || {}), profilePicture: savedUrl };
      const token = sessionStore.getTenantToken();
      if (token) sessionStore.setTenantSession(token, updatedUser);
      setUser(updatedUser);
      setFaceMsg({ ok: true, text: 'Profile identification photo saved and updated across your dashboard!' });
    } catch (err) {
      setFaceMsg({ ok: false, text: err.response?.data?.message || 'Failed to save profile picture' });
    } finally {
      setPicSaving(false);
    }
  };

  const setup2FA = async () => {
    try {
      const res = await api.post('/auth/2fa/setup');
      setTotpSetup(res.data?.data || null);
    } catch (err) {
      setFaceMsg({ ok: false, text: err.response?.data?.message || 'Failed to initialize 2FA TOTP setup' });
    }
  };

  const enable2FA = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/2fa/enable', { totpToken: totpVerify });
      setFaceMsg({ ok: true, text: '2FA TOTP Security Enabled!' });
      setTotpSetup(null);
      setTotpVerify('');
    } catch (err) {
      setFaceMsg({ ok: false, text: err.response?.data?.message || 'Invalid 2FA verification code' });
    }
  };

  return (
    <div>
      <BackButtonBar
        title="Account Security, Voice Identity & Facial Biometrics"
        subtitle={`${user?.firstName} ${user?.lastName} • ${user?.role}`}
        breadcrumb={['Dashboard', 'Security Center']}
      />

      {faceMsg && <div className="glass-panel" style={{ padding: 12, marginBottom: 16, color: faceMsg.ok ? '#34D399' : '#FCA5A5' }}>{faceMsg.text}</div>}

      <div className="glass-panel" style={{ padding: 20, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt={`${user.firstName} ${user.lastName}`}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #D4AF37' }}
            />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(212,175,55,0.2)', border: '2px solid #D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.3rem', color: '#F4E07B' }}>
              {(user?.firstName?.[0] || 'U')}{(user?.lastName?.[0] || '')}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: '0.88rem', color: '#CBD5E1' }}>{user?.role} • {user?.phone || user?.email}</div>
            <div style={{ fontSize: '0.8rem', color: user?.profilePicture ? '#34D399' : '#FDE68A', marginTop: 2 }}>
              {picSaving ? 'Saving profile photo...' : user?.profilePicture ? 'Identification photo verified on account' : 'No profile photo uploaded yet — capture or upload below'}
            </div>
          </div>
        </div>
        <div style={{ flex: '1 1 320px', maxWidth: 480 }}>
          <FaceScanner
            mode="capture"
            title="Profile Photo Upload & Live Camera Capture"
            onCapture={(dataUrl) => {
              if (dataUrl) handleSaveProfilePhoto(dataUrl);
            }}
          />
        </div>
      </div>

      <div className="gbs-grid-2">
        <VoiceChallengePanel mode="enroll" expectedNameHint={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} />

        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}><Camera size={16} /> Facial Biometric Scanner &amp; 2FA TOTP Security</h3>
          <FaceScanner
            mode="both"
            onSuccess={(data) => setFaceMsg({ ok: true, text: data?.message || 'Facial biometric scanner verification completed!' })}
          />

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(212,175,55,0.2)' }}>
            <button type="button" className="btn btn-secondary" onClick={setup2FA}><KeyRound size={15} /> Setup Authenticator 2FA</button>
            {totpSetup && (
              <form onSubmit={enable2FA} style={{ marginTop: 12 }}>
                {totpSetup.qrCode && <img src={totpSetup.qrCode} alt="2FA QR Code" style={{ width: 140, borderRadius: 8, marginBottom: 8 }} />}
                <input type="text" required maxLength={6} className="gbs-input" placeholder="Enter 6-digit TOTP" value={totpVerify} onChange={(e) => setTotpVerify(e.target.value)} style={{ marginBottom: 8 }} />
                <button type="submit" className="btn btn-primary">Activate 2FA Protection</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 10. SCHOOL / INSTITUTION DETAIL PAGE (/schools/:id, /tenants/:id)         */
/* ========================================================================== */
export function SchoolDetailPage() {
  const { id } = useParams();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/tenants/my/profile`)
      .then((res) => setTenant(res.data?.data || null))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#CBD5E1' }}>
        <p>Loading institution profile from live PostgreSQL...</p>
      </div>
    );
  }

  return (
    <div>
      <BackButtonBar
        title={`Institution Profile: ${tenant?.name || 'Institution'}`}
        subtitle={`Code: ${tenant?.code || id} • ${tenant?.city || 'Accra'}, ${tenant?.region || 'Ghana'}`}
        breadcrumb={['Dashboard', 'School / Institution', tenant?.code || 'Profile']}
        fallbackPath="/dashboard?tab=OVERVIEW"
      />

      <div className="glass-panel" style={{ padding: 24, maxWidth: 760 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          {tenant?.logoUrl ? (
            <img src={tenant.logoUrl} alt="Logo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'contain', background: '#FFF', padding: 4 }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: 12, background: 'rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37', fontWeight: 800, fontSize: '1.4rem' }}>
              {(tenant?.name || 'GBS')[0]}
            </div>
          )}
          <div>
            <h3 style={{ margin: 0, color: '#F4E07B' }}>{tenant?.name}</h3>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{tenant?.institutionType || 'Microfinance / Educational Institution'}</div>
            <span className={`badge ${tenant?.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`} style={{ marginTop: 6 }}>
              {tenant?.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.88rem' }}>
          <div><strong>Registration Number:</strong> {tenant?.registrationNumber || 'N/A'}</div>
          <div><strong>License Number:</strong> {tenant?.businessLicenseNumber || 'N/A'}</div>
          <div><strong>TIN Number:</strong> {tenant?.tinNumber || 'N/A'}</div>
          <div><strong>Contact Email:</strong> {tenant?.contactEmail || 'N/A'}</div>
          <div><strong>Contact Phone:</strong> {tenant?.contactPhone || 'N/A'}</div>
          <div><strong>Representative:</strong> {tenant?.representativeName || 'N/A'}</div>
          <div><strong>City / Region:</strong> {tenant?.city || 'Accra'}, {tenant?.region || 'Ghana'}</div>
          <div><strong>GPS Address:</strong> {tenant?.gpsAddress || tenant?.address || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 11. REPORT SNAPSHOT DETAIL PAGE (/reports/:id)                            */
/* ========================================================================== */
export function ReportDetailPage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/snapshots')
      .then((res) => {
        const list = res.data?.data || [];
        const found = list.find((s) => s.id === id) || list[0] || null;
        setSnapshot(found);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <BackButtonBar
        title={`Financial Report Snapshot: ${snapshot?.reportType || 'Ledger Report'}`}
        subtitle={`Period: ${snapshot?.periodLabel || id}`}
        breadcrumb={['Dashboard', 'Reports', snapshot?.periodLabel || 'Snapshot']}
        fallbackPath="/dashboard?tab=REPORTS"
      />

      <div className="glass-panel" style={{ padding: 24, maxWidth: 720 }}>
        <h3 style={{ margin: '0 0 14px', color: '#D4AF37' }}>
          Executive Ledger Summary ({snapshot?.periodLabel || 'Current Period'})
        </h3>
        {snapshot ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: '0.9rem' }}>
            <div><strong>Report Type:</strong> {snapshot.reportType}</div>
            <div><strong>Period:</strong> {snapshot.periodLabel}</div>
            <div><strong>Total Disbursed:</strong> {formatGHS(snapshot.totalDisbursedGhs || 0)}</div>
            <div><strong>Total Collected:</strong> {formatGHS(snapshot.totalCollectedGhs || 0)}</div>
            <div><strong>Active Loans Count:</strong> {snapshot.activeLoansCount || 0}</div>
            <div><strong>Default Rate:</strong> {Number(snapshot.defaultRatePct || 0).toFixed(1)}%</div>
            <div><strong>Generated At:</strong> {new Date(snapshot.createdAt).toLocaleString()}</div>
          </div>
        ) : (
          <p style={{ color: '#94A3B8' }}>No report record available for this period.</p>
        )}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 12. MEETING DETAIL PAGE (/meetings/:id)                                   */
/* ========================================================================== */
export function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/meetings')
      .then((res) => {
        const list = res.data?.data || [];
        const found = list.find((m) => m.id === id) || null;
        setMeeting(found);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <BackButtonBar
        title={`Meeting: ${meeting?.title || 'Operational Briefing'}`}
        subtitle={`Scheduled: ${meeting?.scheduledAt ? new Date(meeting.scheduledAt).toLocaleString() : 'N/A'}`}
        breadcrumb={['Dashboard', 'Meetings', meeting?.title || 'Briefing']}
        fallbackPath="/dashboard?tab=MEETINGS"
      />

      <div className="glass-panel" style={{ padding: 24, maxWidth: 680 }}>
        <h3 style={{ margin: '0 0 14px', color: '#38BDF8' }}>Meeting Information</h3>
        {meeting ? (
          <div style={{ display: 'grid', gap: 12, fontSize: '0.9rem' }}>
            <div><strong>Title:</strong> {meeting.title}</div>
            <div><strong>Audience:</strong> {meeting.audienceType || 'All Staff'}</div>
            <div><strong>Scheduled At:</strong> {new Date(meeting.scheduledAt).toLocaleString()}</div>
            <div><strong>Host / Organizer:</strong> {meeting.hostUser ? `${meeting.hostUser.firstName} ${meeting.hostUser.lastName}` : 'Management'}</div>
            {meeting.joinUrl && (
              <div style={{ marginTop: 10 }}>
                <a href={meeting.joinUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '8px 16px' }}>
                  Join Zoom Meeting
                </a>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: '#94A3B8' }}>Meeting details not found or removed.</p>
        )}
      </div>
    </div>
  );
}

