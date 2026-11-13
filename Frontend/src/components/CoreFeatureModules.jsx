import React, { useState, useEffect } from 'react';

// ============================================================================
// 1. MEMBER REGISTRATION & PROFILE VERIFICATION MODULE (WITH MANAGER DELETION APPROVAL)
// ============================================================================
export function MemberRegistrationModule() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', idType: 'Ghana Card', idNum: '', address: '' });
  const [toast, setToast] = useState(null);

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('gbs_token') || sessionStorage.getItem('accessToken') || 'jwt-gbs-token-2026';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/members', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || 'Member';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const res = await fetch('/api/v1/members', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          firstName,
          lastName,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          ghanaCardNumber: formData.idNum,
          address: formData.address,
        }),
      });

      const data = await res.json();
      if (data.success || data.data) {
        showToast(`Member ${formData.name} registered and KYC profile created!`);
        setFormData({ name: '', phone: '', email: '', idType: 'Ghana Card', idNum: '', address: '' });
        loadMembers();
      } else {
        showToast(data.message || 'Registration failed', true);
      }
    } catch (err) {
      showToast('Network error: ' + err.message, true);
    }
  };

  // Staff Requests Deletion (Sent to Manager for Approval)
  const handleRequestDeletion = async (id, name, paymentsCount) => {
    try {
      const res = await fetch(`/api/v1/members/${id}/request-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: `Staff requested removal (${paymentsCount} payments on record)` }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Deletion Request for ${name} sent to Manager for Approval!`, true);
        loadMembers();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Manager Approves Deletion (Permanent Removal)
  const handleApproveDeletion = async (id, name) => {
    try {
      const res = await fetch(`/api/v1/members/${id}/approve-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Manager APPROVED deletion of ${name}. Record permanently removed from system.`);
        loadMembers();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Manager Rejects Deletion
  const handleRejectDeletion = async (id, name) => {
    try {
      const res = await fetch(`/api/v1/members/${id}/reject-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Manager REJECTED deletion of ${name}. Record restored to Active.`);
        loadMembers();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {toast && (
        <div style={{ background: toast.isErr ? '#f59e0b' : '#10b981', color: '#040810', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {toast.isErr ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
        👤 Member Directory & Manager Deletion Approval Queue
      </h2>
      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
        Rule Enforced: Members with existing payment records require explicit Manager Approval before removal.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <input type="text" placeholder="Full Name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <input type="tel" placeholder="Phone Number" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <select value={formData.idType} onChange={(e) => setFormData({ ...formData, idType: e.target.value })} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }}>
          <option value="Ghana Card">Ghana Card</option>
          <option value="Passport">Passport</option>
          <option value="Voter ID">Voter ID</option>
        </select>
        <input type="text" placeholder="National ID Number" required value={formData.idNum} onChange={(e) => setFormData({ ...formData, idNum: e.target.value })} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <input type="text" placeholder="Residential Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <button type="submit" className="btn btn-primary" style={{ fontWeight: 'bold' }}>Register Member</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Member ID</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Payments Record</th>
            <th>Address</th>
            <th>Status</th>
            <th>Actions / Manager Approval</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.name}</td>
              <td>{m.phone}</td>
              <td><span className="badge badge-gold">{m.paymentsCount} Payments Recorded</span></td>
              <td>{m.address}</td>
              <td>
                <span className={`badge ${m.status === 'VERIFIED' ? 'badge-success' : 'badge-warning'}`}>
                  {m.status === 'PENDING_DELETION_APPROVAL' ? 'PENDING MANAGER APPROVAL' : m.status}
                </span>
              </td>
              <td>
                {m.status === 'PENDING_DELETION_APPROVAL' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#10b981', color: '#000', fontWeight: 'bold' }} onClick={() => handleApproveDeletion(m.id, m.name)}>
                      ✅ Manager Approve Deletion
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRejectDeletion(m.id, m.name)}>
                      ❌ Reject
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRequestDeletion(m.id, m.name, m.paymentsCount)}>
                    🗑️ Request Deletion
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 2. LOAN APPLICATION & WORKFLOW MODULE
// ============================================================================
export function LoanApplicationModule() {
  const [loans, setLoans] = useState([
    { id: 'LN-501', borrower: 'Kwame Mensah', product: 'Micro-Business Loan', principal: 15000, rate: 12.5, term: 6, monthly: 2812.5, status: 'PENDING_APPROVAL' },
    { id: 'LN-502', borrower: 'Abena Osei', product: 'SME Commercial Credit', principal: 45000, rate: 15.0, term: 12, monthly: 4312.5, status: 'APPROVED' },
    { id: 'LN-503', borrower: 'Kofi Annan', product: 'Personal Agriculture Loan', principal: 8000, rate: 10.0, term: 4, monthly: 2200.0, status: 'DENIED' }
  ]);
  const [principal, setPrincipal] = useState(10000);
  const [rate, setRate] = useState(14.0);
  const [term, setTerm] = useState(12);
  const [borrower, setBorrower] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg, isWarn = false) => {
    setToastMsg({ msg, isWarn });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const monthlyCalc = ((principal * (1 + (rate / 100))) / term).toFixed(2);

  const handleApply = (e) => {
    e.preventDefault();
    const newLoan = {
      id: `LN-${500 + loans.length + 1}`,
      borrower: borrower || 'Kofi Annan',
      product: 'Micro-Business Loan',
      principal: Number(principal),
      rate: Number(rate),
      term: Number(term),
      monthly: Number(monthlyCalc),
      status: 'PENDING_APPROVAL'
    };
    setLoans([newLoan, ...loans]);
    showToast(`Loan Application for ${newLoan.borrower} submitted at ${newLoan.rate}% interest rate!`);
    setBorrower('');
  };

  const updateStatus = (idx, status) => {
    const updated = [...loans];
    updated[idx].status = status;
    setLoans(updated);
    if (status === 'APPROVED') {
      showToast(`Loan #${updated[idx].id} APPROVED for ${updated[idx].borrower}! Ready for disbursement.`);
    } else if (status === 'DENIED') {
      showToast(`Loan #${updated[idx].id} DENIED / REJECTED for ${updated[idx].borrower}. Notification logged.`, true);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {toastMsg && (
        <div style={{ background: toastMsg.isWarn ? '#f59e0b' : '#10b981', color: '#040810', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold', fontSize: '0.9rem' }}>
          {toastMsg.isWarn ? '⚠️' : '✅'} {toastMsg.msg}
        </div>
      )}
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📝 Loan Application & Approval / Denial Desk</h2>

      <form onSubmit={handleApply} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Borrower Full Name</label>
          <input type="text" placeholder="Borrower Full Name" required value={borrower} onChange={(e) => setBorrower(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Principal Amount (GH¢)</label>
          <input type="number" placeholder="Principal Amount (GH¢)" value={principal} onChange={(e) => setPrincipal(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Interest Rate (%)</label>
          <input type="number" step="0.1" placeholder="Interest Rate (%)" value={rate} onChange={(e) => setRate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        </div>
        <div>
          <label className="text-muted" style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Term (Months)</label>
          <input type="number" placeholder="Term (Months)" value={term} onChange={(e) => setTerm(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        </div>
        <div style={{ background: 'rgba(212,175,55,0.1)', padding: '10px', borderRadius: '6px', border: '1px solid var(--gold-primary)', fontSize: '0.85rem' }}>
          Monthly Repayment ({rate}%): <strong style={{ color: 'var(--gold-primary)' }}>GH¢ {monthlyCalc}</strong>
        </div>
        <button type="submit" className="btn btn-primary" style={{ fontWeight: 'bold' }}>Submit Application with % Rate</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Borrower</th>
            <th>Principal Amount</th>
            <th>Interest Rate (%) / Term</th>
            <th>Monthly Repayment</th>
            <th>Approval Status</th>
            <th>Manager Actions</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((l, idx) => (
            <tr key={l.id}>
              <td>{l.id}</td>
              <td>{l.borrower}</td>
              <td>GH¢ {l.principal.toLocaleString()}</td>
              <td><span className="badge badge-cyan">{l.rate}% / {l.term} Mo</span></td>
              <td>GH¢ {l.monthly.toLocaleString()}</td>
              <td>
                <span className={`badge ${l.status === 'APPROVED' ? 'badge-success' : l.status === 'DENIED' ? 'badge-danger' : 'badge-warning'}`}>
                  {l.status}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {l.status !== 'APPROVED' && (
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#10b981', color: '#000', fontWeight: 'bold' }} onClick={() => updateStatus(idx, 'APPROVED')}>
                      ✅ Approve
                    </button>
                  )}
                  {l.status !== 'DENIED' && (
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#ef4444', color: '#fff', fontWeight: 'bold' }} onClick={() => updateStatus(idx, 'DENIED')}>
                      ❌ Deny
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 3. LOAN DISBURSEMENT & MANAGEMENT ENGINE MODULE
// ============================================================================
export function LoanManagementModule() {
  const [disbursals, setDisbursals] = useState([
    { id: 'DISB-801', loanId: 'LN-502', borrower: 'Abena Osei', amount: 45000, channel: 'MTN MoMo', txId: 'MOMO-9021820', status: 'DISBURSED' },
    { id: 'DISB-802', loanId: 'LN-501', borrower: 'Kwame Mensah', amount: 15000, channel: 'Bank Transfer', txId: 'GCB-8812901', status: 'READY_TO_DISBURSE' }
  ]);

  const executeDisbursal = (idx) => {
    const updated = [...disbursals];
    updated[idx].status = 'DISBURSED';
    setDisbursals(updated);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>💰 Loan Disbursement & Management Engine</h2>
      <table className="data-table">
        <thead><tr><th>Disbursement ID</th><th>Loan Ref</th><th>Borrower</th><th>Amount</th><th>Channel</th><th>Transaction ID</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {disbursals.map((d, idx) => (
            <tr key={d.id}>
              <td>{d.id}</td><td>{d.loanId}</td><td>{d.borrower}</td><td>GH¢ {d.amount.toLocaleString()}</td><td>{d.channel}</td><td>{d.txId}</td>
              <td><span className={`badge ${d.status === 'DISBURSED' ? 'badge-success' : 'badge-warning'}`}>{d.status}</span></td>
              <td>
                {d.status !== 'DISBURSED' && (
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => executeDisbursal(idx)}>
                    Execute Disbursal
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 4. PAYMENTS COLLECTION & RECEIPTING MODULE
// ============================================================================
export function PaymentsCollectionModule() {
  const [payments, setPayments] = useState([
    { id: 'PAY-901', borrower: 'Kwame Mensah', amount: 2650, method: 'MTN MoMo', reference: 'Repayment #3', status: 'COMPLETED', date: '2026-09-06' }
  ]);
  const [borrower, setBorrower] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('MTN MoMo');

  const handlePay = (e) => {
    e.preventDefault();
    const newPay = {
      id: `PAY-${900 + payments.length + 1}`,
      borrower: borrower || 'Client',
      amount: Number(amount) || 1000,
      method,
      reference: `Repayment #${payments.length + 1}`,
      status: 'COMPLETED',
      date: new Date().toISOString().split('T')[0]
    };
    setPayments([newPay, ...payments]);
    setBorrower('');
    setAmount('');
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>💳 Payments Collection & MoMo Gateway</h2>
      
      <form onSubmit={handlePay} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <input type="text" placeholder="Borrower Name" required value={borrower} onChange={(e) => setBorrower(e.target.value)} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <input type="number" placeholder="Payment Amount (GH¢)" required value={amount} onChange={(e) => setAmount(e.target.value)} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }} />
        <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: '10px', borderRadius: '6px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border-color)' }}>
          <option value="MTN MoMo">MTN MoMo Instant</option>
          <option value="Bank Transfer">Direct Bank Transfer</option>
          <option value="Cash">Cash Receipt</option>
        </select>
        <button type="submit" className="btn btn-primary" style={{ fontWeight: 'bold' }}>Process Live Payment</button>
      </form>

      <table className="data-table">
        <thead><tr><th>Payment ID</th><th>Borrower</th><th>Amount</th><th>Method</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.borrower}</td><td>GH¢ {p.amount.toLocaleString()}</td><td>{p.method}</td><td>{p.reference}</td><td>{p.date}</td>
              <td><span className="badge badge-success">{p.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 5. COLLECTOR TRACKING & GPS LOCATION INTELLIGENCE MODULE
// ============================================================================
export function CollectorTrackingModule() {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📍 Collector Live GPS Tracking & Location Intelligence</h2>
      <div style={{ background: 'var(--bg-dark)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <p style={{ color: 'var(--cyan-accent)', fontWeight: 'bold' }}>📡 Real-Time GPS Tracking Signal Active</p>
        <p className="text-muted" style={{ fontSize: '0.85rem' }}>Tracking 28 Field Collectors across Accra, Kumasi, and Takoradi regions. Geofence safe zones enforced.</p>
      </div>
    </div>
  );
}

// ============================================================================
// 6. GUARANTOR MANAGEMENT MODULE
// ============================================================================
export function GuarantorManagementModule() {
  const [guarantors, setGuarantors] = useState([
    { id: 'GRT-101', name: 'Dr. Samuel Addo', phone: '+233 24 555 1234', borrower: 'Kwame Mensah', relation: 'Employer', status: 'VERIFIED_SIGNATURE' }
  ]);
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>🛡️ Guarantor Management & Digital Agreements</h2>
      <table className="data-table">
        <thead><tr><th>Guarantor ID</th><th>Guarantor Name</th><th>Phone</th><th>Guaranteed Borrower</th><th>Relationship</th><th>Agreement Status</th></tr></thead>
        <tbody>
          {guarantors.map((g) => (
            <tr key={g.id}>
              <td>{g.id}</td><td>{g.name}</td><td>{g.phone}</td><td>{g.borrower}</td><td>{g.relation}</td>
              <td><span className="badge badge-success">{g.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 7. NOTIFICATIONS & COMMUNICATION ENGINE MODULE
// ============================================================================
export function NotificationsCenterModule() {
  const [logs, setLogs] = useState([
    { id: 'MSG-01', recipient: '+233 24 123 4567', channel: 'SMS', content: 'Payment due reminder for LN-501', status: 'DELIVERED' }
  ]);

  const sendReminder = () => {
    const newMsg = { id: `MSG-0${logs.length + 1}`, recipient: '+233 20 987 6543', channel: 'SMS & WhatsApp', content: 'Repayment confirmation received', status: 'DELIVERED' };
    setLogs([newMsg, ...logs]);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', margin: 0 }}>🔔 Notifications & SMS Reminder Engine</h2>
        <button className="btn btn-primary" onClick={sendReminder}>📲 Trigger Bulk SMS Reminders</button>
      </div>
      <table className="data-table">
        <thead><tr><th>Message ID</th><th>Recipient</th><th>Channel</th><th>Content</th><th>Status</th></tr></thead>
        <tbody>
          {logs.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td><td>{m.recipient}</td><td>{m.channel}</td><td>{m.content}</td>
              <td><span className="badge badge-success">{m.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 8. REPORTS & ANALYTICS MODULE
// ============================================================================
export function ReportsAnalyticsModule() {
  const [exportStatus, setExportStatus] = useState('');
  const triggerDownload = (format) => {
    setExportStatus(`Triggered /api/v1/enterprise/reports/export/loans?format=${format}`);
  };
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '16px' }}>📊 Reports &amp; Financial Analytics Hub</h2>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={() => triggerDownload('pdf')}>📄 Export PDF Report</button>
        <button className="btn btn-secondary" onClick={() => triggerDownload('xlsx')}>📊 Export Excel Sheet</button>
        <button className="btn btn-secondary" onClick={() => triggerDownload('csv')}>📁 Export CSV File</button>
      </div>
      {exportStatus && <div style={{ fontSize: '0.82rem', color: '#34D399' }}>{exportStatus}</div>}
    </div>
  );
}

// ============================================================================
// 9. STAFF & SALARY / HR MANAGEMENT MODULE (WITH MANAGER DELETION APPROVAL)
// ============================================================================
export function StaffSalaryHRModule() {
  const [staffList, setStaffList] = useState([
    { id: 'EMP-014', name: 'Kwaku Bonsu', designation: 'Loan Officer', grade: 'Grade 7 Step 3', netPay: 'GH¢ 6,850', status: 'ACTIVE', paymentsCount: 14 },
    { id: 'EMP-019', name: 'Akua Mansa', designation: 'Credit Officer', grade: 'Grade 9 Step 1', netPay: 'GH¢ 9,400', status: 'ACTIVE', paymentsCount: 8 },
    { id: 'EMP-022', name: 'Yaw Frimpong', designation: 'Field Collector', grade: 'Grade 5 Step 2', netPay: 'GH¢ 4,500', status: 'PENDING_DELETION_APPROVAL', paymentsCount: 5 }
  ]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRequestDeletion = (id, name, paymentsCount) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'PENDING_DELETION_APPROVAL' } : s))
    );
    showToast(`Staff Deletion Request for ${name} (${paymentsCount} payments on ledger) sent to Manager!`, true);
  };

  const handleApproveDeletion = (id, name) => {
    setStaffList((prev) => prev.filter((s) => s.id !== id));
    showToast(`Manager APPROVED deletion of Staff Member ${name}! Permanently removed.`);
  };

  const handleRejectDeletion = (id, name) => {
    setStaffList((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'ACTIVE' } : s))
    );
    showToast(`Manager REJECTED deletion of ${name}. Staff restored.`);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      {toast && (
        <div style={{ background: toast.isErr ? '#f59e0b' : '#10b981', color: '#040810', padding: '12px 18px', borderRadius: '8px', marginBottom: '16px', fontWeight: 'bold' }}>
          {toast.isErr ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}
      <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', marginBottom: '8px' }}>👥 Staff Directory & HR Deletion Approvals</h2>
      <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
        Rule Enforced: Deletion of staff members with recorded payments requires explicit Manager Approval.
      </p>

      <table className="data-table">
        <thead>
          <tr>
            <th>Emp ID</th>
            <th>Staff Name</th>
            <th>Designation</th>
            <th>Salary Grade</th>
            <th>Net Salary</th>
            <th>Payments Processed</th>
            <th>Status</th>
            <th>Manager Approval Actions</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.designation}</td>
              <td>{s.grade}</td>
              <td>{s.netPay}</td>
              <td><span className="badge badge-gold">{s.paymentsCount} Payrolls</span></td>
              <td>
                <span className={`badge ${s.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                  {s.status === 'PENDING_DELETION_APPROVAL' ? 'PENDING MANAGER APPROVAL' : s.status}
                </span>
              </td>
              <td>
                {s.status === 'PENDING_DELETION_APPROVAL' ? (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.75rem', background: '#10b981', color: '#000', fontWeight: 'bold' }} onClick={() => handleApproveDeletion(s.id, s.name)}>
                      ✅ Approve Deletion
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRejectDeletion(s.id, s.name)}>
                      ❌ Reject
                    </button>
                  </div>
                ) : (
                  <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleRequestDeletion(s.id, s.name, s.paymentsCount)}>
                    🗑️ Request Removal
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 10. INTEGRATED ZOOM & VIDEO MEETINGS MODULE
// ============================================================================
export function ZoomMeetingsModule() {
  const [meetings, setMeetings] = useState([
    { id: 'ROOM-881', title: 'Q3 Board Financial Review', host: 'Company Owner', link: 'https://zoom.gbsloan.com/j/8819021', status: 'ACTIVE' }
  ]);

  const createRoom = () => {
    const room = { id: `ROOM-${Math.floor(100 + Math.random() * 900)}`, title: 'Branch Managers Strategy Session', host: 'Operations Manager', link: `https://zoom.gbsloan.com/j/${Date.now().toString().slice(-7)}`, status: 'ACTIVE' };
    setMeetings([room, ...meetings]);
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 className="gold-gradient-text" style={{ fontSize: '1.4rem', margin: 0 }}>📹 Integrated Zoom Video Meetings</h2>
        <button className="btn btn-primary" onClick={createRoom}>📹 Create Instant Zoom Meeting</button>
      </div>
      <table className="data-table">
        <thead><tr><th>Meeting ID</th><th>Title</th><th>Host</th><th>Zoom Join Link</th><th>Status</th></tr></thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td><td>{m.title}</td><td>{m.host}</td>
              <td><a href={m.link} target="_blank" rel="noreferrer" style={{ color: 'var(--cyan-accent)', fontWeight: 'bold' }}>{m.link}</a></td>
              <td><span className="badge badge-success">{m.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
