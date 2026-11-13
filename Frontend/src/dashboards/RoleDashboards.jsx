import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Landmark, CreditCard, Users, ShieldCheck, AlertTriangle, Download, Plus, Video,
  Navigation, Clock, CheckCircle2, Database, Briefcase, Megaphone, TrendingUp,
  Bell, ArrowUpRight, RefreshCw, Upload, Search, MapPin
} from 'lucide-react';
import api, { sessionStore } from '../services/api';
import { resolveRoleMeta, USER_COUNT_DROPDOWN_ROLES } from '../constants/rolesMeta';
import { useNavigationState } from '../context/NavigationContext';
import LiveLocationTrackerMap from '../components/LiveLocationTrackerMap';

const formatGHS = (n) =>
  `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function RoleDashboards({ user: propUser, countdown: propCountdown }) {
  const user = propUser || sessionStore.getTenantUser();
  const roleKey = String(user?.role || 'MEMBER_PORTAL').toUpperCase();
  const roleMeta = resolveRoleMeta(roleKey);
  const navigate = useNavigate();

  const { savedState, saveState, restoreScroll } = useNavigationState({
    activeTab: 'OVERVIEW',
    search: '',
    statusFilter: '',
  });

  const [activeTab, setActiveTab] = useState(savedState.activeTab || 'OVERVIEW');
  const [search, setSearch] = useState(savedState.search || '');
  const [statusFilter, setStatusFilter] = useState(savedState.statusFilter || '');

  const [roleMetrics, setRoleMetrics] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loanChart, setLoanChart] = useState([]);
  const [paymentChart, setPaymentChart] = useState([]);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [guarantors, setGuarantors] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [loanProducts, setLoanProducts] = useState([]);
  const [cases, setCases] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [deletionQueue, setDeletionQueue] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [devMessages, setDevMessages] = useState([]);
  const [countdown, setCountdown] = useState(propCountdown || null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberSearchCount, setMemberSearchCount] = useState(null);
  const [locatePhoneTarget, setLocatePhoneTarget] = useState('');

  // Operational Forms
  const [newMember, setNewMember] = useState({ firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '', occupation: '', monthlyIncome: '', address: '' });
  const [newLoan, setNewLoan] = useState({ memberId: '', loanProductId: '', principalAmount: '', termMonths: '12', purpose: '' });
  const [newPayment, setNewPayment] = useState({ loanId: '', amount: '', method: 'MOMO', momoPhone: '', momoNetwork: 'MTN' });
  const [newMeeting, setNewMeeting] = useState({ title: '', scheduledAt: '', participants: '' });
  const [newCase, setNewCase] = useState({ caseType: 'COMPLIANCE', severity: 'HIGH', title: '', description: '' });
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category: 'REPAYMENT_INQUIRY', priority: 'NORMAL' });
  const [newCampaign, setNewCampaign] = useState({ name: '', channel: 'SMS', budget: '', reachCount: '' });
  const [newInvestor, setNewInvestor] = useState({ investorName: '', email: '', investedAmount: '', interestRate: '14.5', maturityDate: '' });
  const [visitForm, setVisitForm] = useState({ customerName: '', visitOutcome: 'PAYMENT_COLLECTED', notes: '', latitude: '5.6037', longitude: '-0.1870' });

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    saveState({ activeTab, search, statusFilter });
  }, [activeTab, search, statusFilter]);

  const isMemberOnly = ['MEMBER', 'MEMBER_PORTAL'].includes(roleKey);
  const isGuarantorOnly = ['GUARANTOR', 'GUARANTOR_PORTAL'].includes(roleKey);
  const isManagement = [
    'SUPER_ADMIN', 'COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT',
    'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  ].includes(roleKey);
  const isFinance = ['SUPER_ADMIN', 'COMPANY_OWNER', 'ACCOUNTANT', 'FINANCE_MANAGER', 'TREASURY'].includes(roleKey);
  const isCredit = ['SUPER_ADMIN', 'COMPANY_OWNER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER', 'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER'].includes(roleKey);
  const isField = ['SUPER_ADMIN', 'COMPANY_OWNER', 'COLLECTIONS', 'FIELD_OFFICER', 'STAFF', 'MOBILE_STAFF', 'COLLECTOR', 'BRANCH_MANAGER'].includes(roleKey);
  const isHR = ['SUPER_ADMIN', 'COMPANY_OWNER', 'HUMAN_RESOURCE', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER'].includes(roleKey);
  const isRiskLegal = ['SUPER_ADMIN', 'COMPANY_OWNER', 'LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS'].includes(roleKey);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const safe = (p) => p.catch(() => ({ data: { data: null } }));
      const requests = [
        safe(api.get('/dashboard/my-role')),
        safe(api.get('/tenants/my/countdown')),
        safe(api.get('/tenants/my/messages')),
        safe(api.get('/enterprise/loan-products')),
      ];

      if (isMemberOnly || isGuarantorOnly) {
        requests.push(safe(api.get('/loans/my-loans')));
        if (isGuarantorOnly) {
          requests.push(safe(api.get('/guarantors')));
        }
      } else {
        requests.push(
          safe(api.get('/dashboard/overview')),
          safe(api.get('/dashboard/loan-chart')),
          safe(api.get('/dashboard/payment-chart')),
          safe(api.get('/loans')),
          safe(api.get('/members')),
          safe(api.get('/payments')),
          safe(api.get('/collectors')),
          safe(api.get('/staff')),
          safe(api.get('/guarantors')),
          safe(api.get('/meetings')),
          safe(api.get('/salaries')),
          safe(api.get('/enterprise/compliance-cases')),
          safe(api.get('/enterprise/support-tickets')),
          safe(api.get('/enterprise/investors')),
          safe(api.get('/enterprise/campaigns')),
        );
        if (isManagement) requests.push(safe(api.get('/enterprise/deletion-requests')));
        if (isRiskLegal || isManagement) requests.push(safe(api.get('/audit-logs')));
      }

      const res = await Promise.all(requests);
      setRoleMetrics(res[0].data?.data || null);
      setCountdown(res[1].data?.data || propCountdown || null);
      setDevMessages(res[2].data?.data || []);
      setLoanProducts(res[3].data?.data || []);

      if (isMemberOnly || isGuarantorOnly) {
        setLoans(res[4]?.data?.data || []);
        if (isGuarantorOnly && res[5]) setGuarantors(res[5].data?.data || []);
      } else {
        setOverview(res[4]?.data?.data || null);
        setLoanChart(res[5]?.data?.data || []);
        setPaymentChart(res[6]?.data?.data || []);
        setLoans(res[7]?.data?.data || []);
        setMembers(res[8]?.data?.data || []);
        setPayments(res[9]?.data?.data || []);
        setCollectors(res[10]?.data?.data || []);
        setStaffList(res[11]?.data?.data || []);
        setGuarantors(res[12]?.data?.data || []);
        setMeetings(res[13]?.data?.data || []);
        setSalaries(res[14]?.data?.data || []);
        setCases(res[15]?.data?.data || []);
        setTickets(res[16]?.data?.data || []);
        setInvestors(res[17]?.data?.data || []);
        setCampaigns(res[18]?.data?.data || []);
        let idx = 19;
        if (isManagement && res[idx]) {
          setDeletionQueue(res[idx].data?.data || []);
          idx++;
        }
        if ((isRiskLegal || isManagement) && res[idx]) {
          setAuditLogs(res[idx].data?.data || []);
        }
      }
      restoreScroll();
    } finally {
      setLoading(false);
    }
  }, [roleKey, isMemberOnly, isGuarantorOnly, isManagement, isRiskLegal]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Real File Export Downloader (CSV / Excel XLSX / PDF)
  const handleDownloadReport = async (type, format) => {
    try {
      const response = await api.get(`/enterprise/reports/export/${type}?format=${format}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gbs-${type}-report.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${type.toUpperCase()} report as .${format.toUpperCase()}`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Report export failed', true);
    }
  };

  // Click-to-Search Members / Customers directly against PostgreSQL
  const handleSearchMembers = async (e, overrideQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = overrideQuery !== null ? overrideQuery : memberSearchInput.trim();
    setMemberSearching(true);
    try {
      const res = await api.get('/members', { params: { search: q || undefined, limit: 100 } });
      const rows = res.data?.data || [];
      setMembers(rows);
      setMemberSearchCount(rows.length);
      if (q) {
        showToast(`Found ${rows.length} borrower/customer record(s) matching "${q}".`);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Customer search failed', true);
    } finally {
      setMemberSearching(false);
    }
  };

  // CRUD Action Handlers
  const handleCreateMember = async (e) => {
    e.preventDefault();
    try {
      await api.post('/members', newMember);
      showToast(`Member ${newMember.firstName} ${newMember.lastName} registered cleanly!`);
      setNewMember({ firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '', occupation: '', monthlyIncome: '', address: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Member registration failed', true);
    }
  };

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/loans/apply', {
        memberId: newLoan.memberId || undefined,
        loanProductId: newLoan.loanProductId || loanProducts[0]?.id,
        principalAmount: Number(newLoan.principalAmount),
        termMonths: Number(newLoan.termMonths),
        purpose: newLoan.purpose,
      });
      showToast('Loan application submitted to workflow!');
      setNewLoan({ memberId: '', loanProductId: '', principalAmount: '', termMonths: '12', purpose: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Loan application failed', true);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      if (newPayment.method === 'MOMO') {
        await api.post('/payments/momo/initiate', {
          loanId: newPayment.loanId,
          amount: Number(newPayment.amount),
          phoneNumber: newPayment.momoPhone,
          network: newPayment.momoNetwork,
        });
      } else {
        await api.post('/payments', {
          loanId: newPayment.loanId,
          amount: Number(newPayment.amount),
          method: newPayment.method,
        });
      }
      showToast('Repayment transaction logged in PostgreSQL!');
      setNewPayment({ loanId: '', amount: '', method: 'MOMO', momoPhone: '', momoNetwork: 'MTN' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Payment failed', true);
    }
  };

  const handleReviewDeletion = async (reqId, decision) => {
    try {
      await api.put(`/enterprise/deletion-requests/${reqId}`, { decision });
      showToast(`Deletion request ${decision}.`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Review failed', true);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const res = await api.post('/enterprise/hr/payroll/generate', { month });
      showToast(res.data?.message || `Payroll generated for ${month}`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Payroll generation failed', true);
    }
  };

  const handlePaySalary = async (salaryId) => {
    try {
      await api.put(`/salaries/${salaryId}/pay`, { salaryId, notes: 'Processed via HR & Payroll Dashboard' });
      showToast('Salary marked PAID!');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Salary disbursement failed', true);
    }
  };

  const handleScheduleMeeting = async (e) => {
    e.preventDefault();
    try {
      await api.post('/meetings', {
        topic: newMeeting.title,
        startTime: new Date(newMeeting.scheduledAt || Date.now() + 3600000).toISOString(),
        duration: 60,
      });
      showToast('Live Video Meeting Room scheduled!');
      setNewMeeting({ title: '', scheduledAt: '', participants: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to schedule meeting', true);
    }
  };

  const handleRecordVisit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enterprise/visits', visitForm);
      showToast('Customer visit & GPS telemetry recorded!');
      setVisitForm({ customerName: '', visitOutcome: 'PAYMENT_COLLECTED', notes: '', latitude: '5.6037', longitude: '-0.1870' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Visit log failed', true);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enterprise/compliance-cases', newCase);
      showToast('Risk/Compliance case opened cleanly!');
      setNewCase({ caseType: 'COMPLIANCE', severity: 'HIGH', title: '', description: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create case', true);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enterprise/support-tickets', newTicket);
      showToast('Customer support ticket opened!');
      setNewTicket({ subject: '', description: '', category: 'REPAYMENT_INQUIRY', priority: 'NORMAL' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not open ticket', true);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enterprise/campaigns', {
        ...newCampaign,
        budget: Number(newCampaign.budget || 0),
        reachCount: Number(newCampaign.reachCount || 0),
      });
      showToast('Marketing campaign launched!');
      setNewCampaign({ name: '', channel: 'SMS', budget: '', reachCount: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create campaign', true);
    }
  };

  const handleCreateInvestor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/enterprise/investors', {
        ...newInvestor,
        investedAmount: Number(newInvestor.investedAmount),
        interestRate: Number(newInvestor.interestRate),
      });
      showToast('Investor capital tranche recorded!');
      setNewInvestor({ investorName: '', email: '', investedAmount: '', interestRate: '14.5', maturityDate: '' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add investor tranche', true);
    }
  };

  const filteredLoans = loans.filter((l) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (l.loanNumber || '').toLowerCase().includes(q) ||
      `${l.member?.user?.firstName || ''} ${l.member?.user?.lastName || ''}`.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Tab Navigation tailorable by role
  const tabs = [
    { id: 'OVERVIEW', label: 'Overview & Analytics' },
    { id: 'LOANS', label: isMemberOnly ? 'My Loans & Apply' : 'Loans & Approvals' },
    { id: 'PAYMENTS', label: 'Repayments (MoMo/Bank/Cash)' },
  ];
  if (!isMemberOnly && !isGuarantorOnly) {
    tabs.push({ id: 'MEMBERS', label: 'Borrowers & KYC' });
  }
  if (isGuarantorOnly || !isMemberOnly) {
    tabs.push({ id: 'GUARANTORS', label: 'Guarantors' });
  }
  if (isField || isCredit || isManagement) {
    tabs.push({ id: 'FIELD_OPS', label: 'Live GPS Map & Visits' });
  }
  if (isHR || isFinance) {
    tabs.push({ id: 'HR_PAYROLL', label: 'Staff & Payroll' });
  }
  if (isRiskLegal || isManagement) {
    tabs.push({ id: 'RISK_AUDIT', label: 'Compliance, Audit & Deletions' });
  }
  if (roleKey === 'CUSTOMER_SERVICE' || roleKey === 'RECEPTION' || isManagement) {
    tabs.push({ id: 'SUPPORT', label: 'Support & Front Desk' });
  }
  if (roleKey === 'MARKETING' || roleKey === 'INVESTOR' || isManagement) {
    tabs.push({ id: 'GROWTH_CAPITAL', label: 'Marketing & Investors' });
  }
  if (!isMemberOnly && !isGuarantorOnly) {
    tabs.push({ id: 'MEETINGS_REPORTS', label: 'Meetings & Reports' });
  }

  return (
    <div>
      {/* 1. UNIQUE REAL-LIFE ROLE DASHBOARD PHOTO HERO BANNER */}
      <div className="role-hero-banner">
        <img src={roleMeta.dashboardImage} alt={`${roleMeta.title} Dashboard`} className="role-hero-bg" />
        <div className="role-hero-overlay">
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span className="badge badge-gold">{roleMeta.category}</span>
              <span className="badge badge-success">{user?.tenantName || 'GBS Lending Institution'}</span>
              {countdown && (
                <span className={`badge ${countdown.daysLeft <= 10 ? 'badge-warning' : 'badge-cyan'}`}>
                  <Clock size={12} style={{ marginRight: 4 }} />
                  {countdown.daysLeft ?? 90} Days Remaining ({countdown.planTier || 'ENTERPRISE'})
                </span>
              )}
            </div>
            <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              {roleMeta.title} Command Dashboard
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#E2E8F0', maxWidth: 680 }}>
              Welcome back, <strong>{user?.firstName} {user?.lastName}</strong> — {roleMeta.subtitle}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {USER_COUNT_DROPDOWN_ROLES.has(roleKey) && (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin/users-crosscheck')}>
                <ShieldCheck size={15} /> Qualification Cross-Check
              </button>
            )}
            {(isManagement || isFinance) && (
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/migrations')}>
                <Upload size={15} /> Data Migration
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={loadDashboardData}>
              <RefreshCw size={15} /> Sync PostgreSQL
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEVELOPER AUTHORITY NOTICES FOR THIS TENANT */}
      {devMessages.length > 0 && (
        <div className="glass-panel" style={{ padding: 14, marginBottom: 18, borderColor: 'rgba(0, 242, 254, 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00F2FE', fontWeight: 700, fontSize: '0.84rem', marginBottom: 6 }}>
            <Bell size={15} /> Official Notice from GBS Platform Authority:
          </div>
          {devMessages.slice(0, 2).map((m) => (
            <div key={m.id} style={{ fontSize: '0.82rem', color: '#E2E8F0', paddingTop: 4 }}>
              <strong>{m.title}:</strong> {m.body}
            </div>
          ))}
        </div>
      )}

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
          {toast.msg}
        </div>
      )}

      {/* 3. WORKSPACE SUB-NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={activeTab === t.id ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !overview && !roleMetrics ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
          Loading live PostgreSQL metrics for {roleMeta.title}...
        </div>
      ) : null}

      {/* ===================================================================== */}
      {/* TAB: OVERVIEW & CHARTS                                                */}
      {/* ===================================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="dashboard-grid">
            <div className="glass-panel metric-card">
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {isMemberOnly ? 'MY ACTIVE LOANS' : 'ACTIVE / TOTAL LOANS'}
                </div>
                <div className="metric-value" style={{ color: '#D4AF37' }}>
                  {overview?.activeLoans ?? loans.length}
                </div>
              </div>
              <Landmark size={26} color="#D4AF37" />
            </div>

            <div className="glass-panel metric-card">
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>DISBURSED PRINCIPAL</div>
                <div className="metric-value" style={{ fontSize: '1.35rem', color: '#10B981' }}>
                  {formatGHS(overview?.totalDisbursed ?? loans.reduce((s, l) => s + Number(l.principalAmount || 0), 0))}
                </div>
              </div>
              <TrendingUp size={26} color="#10B981" />
            </div>

            <div className="glass-panel metric-card">
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {isMemberOnly ? 'REMAINING BALANCE' : 'TOTAL REPAID / OUTSTANDING'}
                </div>
                <div className="metric-value" style={{ fontSize: '1.35rem', color: '#38BDF8' }}>
                  {formatGHS(overview?.totalRepaid ?? payments.reduce((s, p) => s + Number(p.amount || 0), 0))}
                </div>
              </div>
              <CreditCard size={26} color="#38BDF8" />
            </div>

            <div className="glass-panel metric-card">
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                  {isRiskLegal ? 'OPEN AUDIT / COMPLIANCE CASES' : isHR ? 'STAFF PAYROLL RECORDS' : 'REGISTERED BORROWERS'}
                </div>
                <div className="metric-value" style={{ color: '#F4E07B' }}>
                  {isRiskLegal ? cases.length : isHR ? salaries.length : (overview?.totalMembers ?? members.length)}
                </div>
              </div>
              <Users size={26} color="#F4E07B" />
            </div>
          </div>

          {!isMemberOnly && !isGuarantorOnly && (
            <div className="glass-panel" style={{ padding: 16 }}>
              <form
                onSubmit={(e) => handleSearchMembers(e)}
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Search size={18} color="#00F2FE" />
                <input
                  type="search"
                  className="gbs-input"
                  style={{ flex: 1, minWidth: 230 }}
                  placeholder="Quick customer/member search by Name, Phone, Member # or Ghana Card..."
                  value={memberSearchInput}
                  onChange={(e) => setMemberSearchInput(e.target.value)}
                />
                <button type="submit" disabled={memberSearching} className="btn btn-primary" style={{ padding: '9px 16px' }}>
                  <Search size={14} /> {memberSearching ? 'Searching...' : 'Search Customers'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('MEMBERS')}
                >
                  Open Directory ({members.length})
                </button>
              </form>
              {memberSearchCount !== null && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {members.slice(0, 6).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                      onClick={() => navigate(`/members/${m.id}`)}
                    >
                      {m.memberNumber} — {m.user?.firstName} {m.user?.lastName} ({m.user?.phone})
                    </button>
                  ))}
                  {members.length === 0 && (
                    <span style={{ fontSize: '0.8rem', color: '#FBBF24' }}>No customers matched your search query.</span>
                  )}
                </div>
              )}
            </div>
          )}

          {!isMemberOnly && !isGuarantorOnly && (
            <div className="gbs-grid-2">
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#D4AF37', fontSize: '1rem' }}>
                  Loan Portfolio Status Distribution (PostgreSQL)
                </h3>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loanChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="status" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#060c18', border: '1px solid #D4AF37' }} />
                      <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#00F2FE', fontSize: '1rem' }}>
                  Monthly Repayment Collections Trend
                </h3>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={paymentChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#060c18', border: '1px solid #00F2FE' }} />
                      <Area type="monotone" dataKey="total" stroke="#00F2FE" fill="rgba(0,242,254,0.22)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Role-Specific Backend Telemetry Snapshot */}
          {roleMetrics && (
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 10px', color: '#D4AF37', fontSize: '1rem' }}>
                {roleMeta.title} — Specialized Live Telemetry
              </h3>
              <div className="gbs-grid-3">
                {Object.entries(roleMetrics)
                  .filter(([, v]) => typeof v !== 'object' || v === null)
                  .slice(0, 9)
                  .map(([k, v]) => (
                    <div key={k} style={{ background: 'rgba(6,12,24,0.75)', padding: 12, borderRadius: 8, border: '1px solid rgba(212,175,55,0.18)' }}>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8', textTransform: 'uppercase' }}>{k.replace(/([A-Z])/g, ' $1')}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F1F5F9', marginTop: 4 }}>{String(v ?? '0')}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: LOANS & APPROVALS                                                */}
      {/* ===================================================================== */}
      {activeTab === 'LOANS' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>
              <Plus size={16} style={{ verticalAlign: 'middle' }} /> New Loan Application
            </h3>
            <form onSubmit={handleApplyLoan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!isMemberOnly && (
                <div>
                  <label className="gbs-label">Borrower / Member</label>
                  <select className="gbs-select" value={newLoan.memberId} onChange={(e) => setNewLoan({ ...newLoan, memberId: e.target.value })}>
                    <option value="">Select Registered Member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.memberNumber} — {m.user?.firstName} {m.user?.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="gbs-label">Loan Product</label>
                <select className="gbs-select" required value={newLoan.loanProductId || loanProducts[0]?.id || ''} onChange={(e) => setNewLoan({ ...newLoan, loanProductId: e.target.value })}>
                  {loanProducts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.interestRate}% • {p.minTermMonths}-{p.maxTermMonths} mo)</option>
                  ))}
                </select>
              </div>
              <div className="gbs-grid-2" style={{ gap: 10 }}>
                <div>
                  <label className="gbs-label">Principal Amount (GHS)</label>
                  <input type="number" required min="100" className="gbs-input" value={newLoan.principalAmount} onChange={(e) => setNewLoan({ ...newLoan, principalAmount: e.target.value })} placeholder="5000" />
                </div>
                <div>
                  <label className="gbs-label">Term (Months)</label>
                  <input type="number" required min="1" max="60" className="gbs-input" value={newLoan.termMonths} onChange={(e) => setNewLoan({ ...newLoan, termMonths: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="gbs-label">Loan Purpose</label>
                <input type="text" required className="gbs-input" value={newLoan.purpose} onChange={(e) => setNewLoan({ ...newLoan, purpose: e.target.value })} placeholder="Working Capital / Retail Expansion" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                Submit Application to Underwriting
              </button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, color: '#00F2FE' }}>Loan Portfolio ({filteredLoans.length})</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="gbs-input" style={{ width: 170, padding: '6px 10px' }} placeholder="Search loan / member..." value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="gbs-select" style={{ width: 130, padding: '6px 10px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="OVERDUE">OVERDUE</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
            </div>
            <div className="data-table-container" style={{ maxHeight: 420 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Loan #</th>
                    <th>Borrower</th>
                    <th>Principal</th>
                    <th>Status</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLoans.map((l) => (
                    <tr key={l.id} onClick={() => navigate(`/loans/${l.id}`)} style={{ cursor: 'pointer' }}>
                      <td><strong>{l.loanNumber}</strong></td>
                      <td>{l.member?.user?.firstName} {l.member?.user?.lastName}</td>
                      <td>{formatGHS(l.principalAmount)}</td>
                      <td><span className={`badge ${l.status === 'ACTIVE' || l.status === 'APPROVED' ? 'badge-success' : l.status === 'OVERDUE' || l.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span></td>
                      <td>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.74rem' }}>
                          Open <ArrowUpRight size={12} />
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

      {/* ===================================================================== */}
      {/* TAB: PAYMENTS (MOMO / BANK / CASH)                                    */}
      {/* ===================================================================== */}
      {activeTab === 'PAYMENTS' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Record Loan Repayment</h3>
            <form onSubmit={handleRecordPayment} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="gbs-label">Target Loan</label>
                <select className="gbs-select" required value={newPayment.loanId} onChange={(e) => setNewPayment({ ...newPayment, loanId: e.target.value })}>
                  <option value="">Select Active Loan...</option>
                  {loans.map((l) => (
                    <option key={l.id} value={l.id}>{l.loanNumber} — {l.member?.user?.firstName} ({formatGHS(l.outstandingAmount ?? l.totalOutstanding)})</option>
                  ))}
                </select>
              </div>
              <div className="gbs-grid-2" style={{ gap: 10 }}>
                <div>
                  <label className="gbs-label">Amount (GHS)</label>
                  <input type="number" required min="1" step="0.01" className="gbs-input" value={newPayment.amount} onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })} placeholder="350" />
                </div>
                <div>
                  <label className="gbs-label">Method</label>
                  <select className="gbs-select" value={newPayment.method} onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}>
                    <option value="MOMO">Mobile Money (MTN/Telecel)</option>
                    <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                    <option value="CASH">Cash Payment (Needs Accounting Approval)</option>
                  </select>
                </div>
              </div>
              {newPayment.method === 'MOMO' && (
                <div className="gbs-grid-2" style={{ gap: 10 }}>
                  <div>
                    <label className="gbs-label">MoMo Phone</label>
                    <input type="tel" required className="gbs-input" value={newPayment.momoPhone} onChange={(e) => setNewPayment({ ...newPayment, momoPhone: e.target.value })} placeholder="+233240000000" />
                  </div>
                  <div>
                    <label className="gbs-label">Network</label>
                    <select className="gbs-select" value={newPayment.momoNetwork} onChange={(e) => setNewPayment({ ...newPayment, momoNetwork: e.target.value })}>
                      <option value="MTN">MTN MoMo</option>
                      <option value="TELECEL">Telecel Cash</option>
                      <option value="AT">AT Money</option>
                    </select>
                  </div>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Process Payment</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Payment &amp; Receipt Ledger ({payments.length})</h3>
            <div className="data-table-container" style={{ maxHeight: 420 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)} style={{ cursor: 'pointer' }}>
                      <td><strong>{p.transactionRef || p.receiptNumber || p.reference || p.id.slice(0, 8)}</strong></td>
                      <td>{p.method}</td>
                      <td>{formatGHS(p.amount)}</td>
                      <td><span className={`badge ${p.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                      <td><button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>Inspect</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: MEMBERS & KYC                                                    */}
      {/* ===================================================================== */}
      {activeTab === 'MEMBERS' && !isMemberOnly && !isGuarantorOnly && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Register Borrower &amp; Ghana Card KYC</h3>
            <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="gbs-grid-2" style={{ gap: 10 }}>
                <input type="text" required className="gbs-input" placeholder="First Name" value={newMember.firstName} onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })} />
                <input type="text" required className="gbs-input" placeholder="Last Name" value={newMember.lastName} onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })} />
              </div>
              <input type="tel" required className="gbs-input" placeholder="Phone (+233...)" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
              <input type="email" className="gbs-input" placeholder="Email (optional)" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
              <input type="text" className="gbs-input" placeholder="Ghana Card No. (GHA-...)" value={newMember.ghanaCardNumber} onChange={(e) => setNewMember({ ...newMember, ghanaCardNumber: e.target.value })} />
              <input type="text" className="gbs-input" placeholder="Address / Business Location" value={newMember.address} onChange={(e) => setNewMember({ ...newMember, address: e.target.value })} />
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Register Borrower Profile</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Borrowers Directory ({members.length})</h3>
            <form
              onSubmit={(e) => handleSearchMembers(e)}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}
            >
              <input
                type="search"
                className="gbs-input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Search customer by name, phone, MBR #, Ghana Card..."
                value={memberSearchInput}
                onChange={(e) => setMemberSearchInput(e.target.value)}
              />
              <button type="submit" disabled={memberSearching} className="btn btn-primary" style={{ padding: '8px 14px' }}>
                <Search size={14} /> {memberSearching ? 'Searching...' : 'Search'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 12px' }}
                onClick={() => {
                  setMemberSearchInput('');
                  setMemberSearchCount(null);
                  handleSearchMembers(null, '');
                }}
              >
                Show All
              </button>
            </form>
            <div className="data-table-container" style={{ maxHeight: 420 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member #</th>
                    <th>Full Name</th>
                    <th>Phone</th>
                    <th>KYC Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} onClick={() => navigate(`/members/${m.id}`)} style={{ cursor: 'pointer' }}>
                      <td><strong>{m.memberNumber}</strong></td>
                      <td>{m.user?.firstName} {m.user?.lastName}</td>
                      <td>{m.user?.phone}</td>
                      <td><span className={`badge ${m.ghanaCardVerified ? 'badge-success' : 'badge-warning'}`}>{m.ghanaCardVerified ? 'KYC VERIFIED' : 'PENDING KYC'}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>Open</button>
                        {m.user?.phone && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setLocatePhoneTarget(m.user.phone);
                              setActiveTab('FIELD_OPS');
                            }}
                          >
                            <MapPin size={12} /> Locate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                        No members/customers found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: GUARANTORS                                                       */}
      {/* ===================================================================== */}
      {activeTab === 'GUARANTORS' && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Registered Loan Guarantors ({guarantors.length})</h3>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Agreement Status</th>
                  <th>Penalty Alerts</th>
                  <th>Open Detail</th>
                </tr>
              </thead>
              <tbody>
                {guarantors.map((g) => (
                  <tr key={g.id} onClick={() => navigate(`/guarantors/${g.id}`)} style={{ cursor: 'pointer' }}>
                    <td><strong>{g.user?.firstName} {g.user?.lastName}</strong></td>
                    <td>{g.user?.phone}</td>
                    <td><span className={`badge ${g.agreementSigned ? 'badge-success' : 'badge-warning'}`}>{g.agreementSigned ? 'SIGNED' : 'UNSIGNED'}</span></td>
                    <td>{g.penaltyNotifications ? 'Enabled' : 'Disabled'}</td>
                    <td><button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.75rem' }}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: LIVE GOOGLE MAPS PHONE LOCATOR, FIELD COLLECTORS & VISITS        */}
      {/* ===================================================================== */}
      {activeTab === 'FIELD_OPS' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <LiveLocationTrackerMap
            mode="tenant"
            initialPhone={locatePhoneTarget}
            onLocationPublished={loadDashboardData}
            markers={collectors
              .filter((c) => c.lastLatitude != null && c.lastLongitude != null)
              .map((c) => ({
                id: c.id,
                type: 'COLLECTOR',
                name: `${c.user?.firstName || 'Collector'} ${c.user?.lastName || ''}`.trim(),
                phone: c.user?.phone,
                status: c.status,
                lastUpdatedAt: c.lastLocationAt,
                coordinates: { latitude: Number(c.lastLatitude), longitude: Number(c.lastLongitude) },
              }))}
          />
          <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Log Customer Visit &amp; GPS Telemetry</h3>
            <form onSubmit={handleRecordVisit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" required className="gbs-input" placeholder="Customer Name" value={visitForm.customerName} onChange={(e) => setVisitForm({ ...visitForm, customerName: e.target.value })} />
              <select className="gbs-select" value={visitForm.visitOutcome} onChange={(e) => setVisitForm({ ...visitForm, visitOutcome: e.target.value })}>
                <option value="PAYMENT_COLLECTED">Payment Collected</option>
                <option value="PROMISE_TO_PAY">Promise to Pay</option>
                <option value="KYC_RESIDENCE_VERIFIED">KYC Residence Verified</option>
                <option value="CUSTOMER_UNAVAILABLE">Customer Unavailable</option>
              </select>
              <textarea rows={2} className="gbs-textarea" placeholder="Field inspection notes..." value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} />
              <div className="gbs-grid-2" style={{ gap: 10 }}>
                <input type="text" className="gbs-input" value={visitForm.latitude} onChange={(e) => setVisitForm({ ...visitForm, latitude: e.target.value })} placeholder="Lat" />
                <input type="text" className="gbs-input" value={visitForm.longitude} onChange={(e) => setVisitForm({ ...visitForm, longitude: e.target.value })} placeholder="Lng" />
              </div>
              <button type="submit" className="btn btn-primary">Record Field Visit</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Active Field Collectors ({collectors.length})</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Collector</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {collectors.map((c) => (
                    <tr key={c.id} onClick={() => navigate(`/collectors/${c.id}`)} style={{ cursor: 'pointer' }}>
                      <td>{c.employeeId}</td>
                      <td>{c.user?.firstName} {c.user?.lastName}</td>
                      <td>{c.user?.phone || c.assignedZone || 'N/A'}</td>
                      <td><span className="badge badge-success">{c.status}</span></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}><Navigation size={12} /> History</button>
                        {c.user?.phone && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setLocatePhoneTarget(c.user.phone);
                            }}
                          >
                            <MapPin size={12} /> Pin
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: HR STAFF & PAYROLL                                               */}
      {/* ===================================================================== */}
      {activeTab === 'HR_PAYROLL' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#D4AF37' }}>Staff Roster ({staffList.length})</h3>
              <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={handleGeneratePayroll}>
                Generate Monthly Payroll
              </button>
            </div>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Salary</th>
                    <th>Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s) => (
                    <tr key={s.id} onClick={() => navigate(`/staff/${s.id}`)} style={{ cursor: 'pointer' }}>
                      <td><strong>{s.user?.firstName} {s.user?.lastName}</strong></td>
                      <td>{s.department} ({s.position})</td>
                      <td>{formatGHS(s.baseSalary)}</td>
                      <td><button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Salary Group</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Monthly Salary Ledger ({salaries.length})</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Staff</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {salaries.map((sal) => (
                    <tr key={sal.id}>
                      <td>{sal.month}/{sal.year}</td>
                      <td>{sal.staff?.user?.firstName} {sal.staff?.user?.lastName}</td>
                      <td>{formatGHS(sal.netAmount ?? sal.netSalary)}</td>
                      <td><span className={`badge ${sal.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>{sal.status}</span></td>
                      <td>
                        {sal.status !== 'PAID' && (
                          <button type="button" className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.72rem' }} onClick={() => handlePaySalary(sal.id)}>
                            Disburse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: COMPLIANCE, AUDIT, FRAUD & MANAGER DELETION APPROVALS            */}
      {/* ===================================================================== */}
      {activeTab === 'RISK_AUDIT' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#F87171' }}>Manager Deletion Approval Queue ({deletionQueue.length})</h3>
            {deletionQueue.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: '0.84rem' }}>No pending staff deletion requests.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {deletionQueue.map((req) => (
                  <div key={req.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(239,68,68,0.28)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong>{req.entityType} ({req.entityId.slice(0, 8)})</strong>
                      <span className={`badge ${req.status === 'APPROVED' ? 'badge-success' : req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>{req.status}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 8 }}>{req.reason}</div>
                    {req.status === 'PENDING' && isManagement && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleReviewDeletion(req.id, 'APPROVED')}>Approve Deletion</button>
                        <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleReviewDeletion(req.id, 'REJECTED')}>Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <h4 style={{ marginTop: 20, color: '#D4AF37' }}>Open Legal / Fraud / Risk Case</h4>
            <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="gbs-grid-2" style={{ gap: 8 }}>
                <select className="gbs-select" value={newCase.caseType} onChange={(e) => setNewCase({ ...newCase, caseType: e.target.value })}>
                  <option value="COMPLIANCE">KYC / AML Compliance</option>
                  <option value="FRAUD">Fraud Investigation</option>
                  <option value="RISK">Credit Risk Alert</option>
                  <option value="LEGAL">Legal Recovery Filing</option>
                </select>
                <select className="gbs-select" value={newCase.severity} onChange={(e) => setNewCase({ ...newCase, severity: e.target.value })}>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
              <input type="text" required className="gbs-input" placeholder="Case Title" value={newCase.title} onChange={(e) => setNewCase({ ...newCase, title: e.target.value })} />
              <textarea rows={2} required className="gbs-textarea" placeholder="Case evidence & investigation summary..." value={newCase.description} onChange={(e) => setNewCase({ ...newCase, description: e.target.value })} />
              <button type="submit" className="btn btn-primary">File Case Record</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Cases ({cases.length}) &amp; Immutable Audit Trail ({auditLogs.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto', marginBottom: 16 }}>
              {cases.map((c) => (
                <div key={c.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(0,242,254,0.2)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#F4E07B' }}>[{c.caseType}] {c.title}</div>
                  <div style={{ fontSize: '0.76rem', color: '#CBD5E1' }}>{c.description}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {auditLogs.slice(0, 20).map((log) => (
                <div key={log.id} style={{ padding: 8, borderRadius: 6, background: 'rgba(4,8,16,0.75)', fontSize: '0.74rem', borderLeft: '2px solid #D4AF37' }}>
                  <strong style={{ color: '#D4AF37' }}>{log.action}</strong> on {log.entityType} • {new Date(log.createdAt).toLocaleString()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: CUSTOMER SERVICE & RECEPTION TICKETS                             */}
      {/* ===================================================================== */}
      {activeTab === 'SUPPORT' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Log Borrower Support Inquiry / Front Desk Ticket</h3>
            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="text" required className="gbs-input" placeholder="Ticket Subject" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} />
              <div className="gbs-grid-2" style={{ gap: 10 }}>
                <select className="gbs-select" value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}>
                  <option value="REPAYMENT_INQUIRY">Repayment Inquiry</option>
                  <option value="KYC_WALK_IN">Walk-In KYC Intake</option>
                  <option value="MOMO_SETTLEMENT">MoMo Reconciliation</option>
                </select>
                <select className="gbs-select" value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}>
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>
              <textarea rows={3} required className="gbs-textarea" placeholder="Customer request notes..." value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} />
              <button type="submit" className="btn btn-primary">Open Support Ticket</button>
            </form>
          </div>
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Active Service Queue ({tickets.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tickets.map((t) => (
                <div key={t.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{t.subject}</strong>
                    <span className="badge badge-gold">{t.status}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: 4 }}>{t.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: MARKETING & INVESTORS                                            */}
      {/* ===================================================================== */}
      {activeTab === 'GROWTH_CAPITAL' && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#A78BFA' }}><Megaphone size={16} /> Marketing Outreach Campaigns ({campaigns.length})</h3>
            <form onSubmit={handleCreateCampaign} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              <input type="text" required className="gbs-input" placeholder="Campaign Name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} />
              <div className="gbs-grid-3" style={{ gap: 8 }}>
                <select className="gbs-select" value={newCampaign.channel} onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value })}>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="FIELD_DRIVE">Field Drive</option>
                </select>
                <input type="number" className="gbs-input" placeholder="Budget GHS" value={newCampaign.budget} onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })} />
                <input type="number" className="gbs-input" placeholder="Est. Reach" value={newCampaign.reachCount} onChange={(e) => setNewCampaign({ ...newCampaign, reachCount: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Launch Campaign</button>
            </form>
            {campaigns.map((c) => (
              <div key={c.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', marginBottom: 6, fontSize: '0.8rem' }}>
                <strong>{c.name}</strong> ({c.channel}) • Budget: {formatGHS(c.budget)} • Reach: {c.reachCount}
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><Briefcase size={16} /> Institutional Investors &amp; Yield ({investors.length})</h3>
            {isFinance && (
              <form onSubmit={handleCreateInvestor} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                <div className="gbs-grid-2" style={{ gap: 8 }}>
                  <input type="text" required className="gbs-input" placeholder="Investor Name" value={newInvestor.investorName} onChange={(e) => setNewInvestor({ ...newInvestor, investorName: e.target.value })} />
                  <input type="email" className="gbs-input" placeholder="Email" value={newInvestor.email} onChange={(e) => setNewInvestor({ ...newInvestor, email: e.target.value })} />
                </div>
                <div className="gbs-grid-2" style={{ gap: 8 }}>
                  <input type="number" required className="gbs-input" placeholder="Invested GHS" value={newInvestor.investedAmount} onChange={(e) => setNewInvestor({ ...newInvestor, investedAmount: e.target.value })} />
                  <input type="number" step="0.1" className="gbs-input" placeholder="Yield %" value={newInvestor.interestRate} onChange={(e) => setNewInvestor({ ...newInvestor, interestRate: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary">Add Capital Tranche</button>
              </form>
            )}
            {investors.map((inv) => (
              <div key={inv.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', marginBottom: 6, fontSize: '0.8rem' }}>
                <strong>{inv.investorName}</strong> — {formatGHS(inv.investedAmount)} @ {inv.interestRate}% APR
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB: VIDEO MEETINGS & EXPORTABLE REPORTS                              */}
      {/* ===================================================================== */}
      {activeTab === 'MEETINGS_REPORTS' && !isMemberOnly && !isGuarantorOnly && (
        <div className="gbs-grid-2">
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}><Video size={16} /> Instant WebRTC / Zoom Meetings ({meetings.length})</h3>
            <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              <input type="text" required className="gbs-input" placeholder="Credit Committee / Daily Standup" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })} />
              <input type="datetime-local" className="gbs-input" value={newMeeting.scheduledAt} onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })} />
              <button type="submit" className="btn btn-primary">Schedule Live Video Room</button>
            </form>
            {meetings.map((m) => (
              <div key={m.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(0,242,254,0.2)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.topic || m.title}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{new Date(m.startTime || m.scheduledAt).toLocaleString()}</div>
                </div>
                {m.joinUrl && (
                  <a href={m.joinUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                    Join Room
                  </a>
                )}
              </div>
            ))}
          </div>

          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><Download size={16} /> Live Database Report Exports (CSV, XLSX, PDF)</h3>
            <p style={{ fontSize: '0.82rem', color: '#CBD5E1', marginBottom: 16 }}>
              Every report streams directly from live PostgreSQL records scoped cleanly to your institution.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { type: 'loans', label: 'Loan Portfolio & Disbursement Ledger' },
                { type: 'payments', label: 'MoMo, Bank & Cash Repayments Statement' },
                { type: 'members', label: 'Borrower KYC & Registration Directory' },
                { type: 'audit', label: 'Immutable Governance & Security Audit Trail' },
              ].map((rep) => (
                <div key={rep.type} style={{ padding: 12, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{rep.label}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleDownloadReport(rep.type, 'csv')}>CSV</button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleDownloadReport(rep.type, 'xlsx')}>XLSX</button>
                    <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleDownloadReport(rep.type, 'pdf')}>PDF</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
