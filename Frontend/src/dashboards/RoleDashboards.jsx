import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid
} from 'recharts';
import {
  Landmark, CreditCard, Users, ShieldCheck, AlertTriangle, Download, Plus, Video,
  Navigation, Clock, CheckCircle2, Database, Briefcase, Megaphone, TrendingUp,
  Bell, ArrowUpRight, RefreshCw, Upload, Search, MapPin, Eye, EyeOff, Calculator,
  Building2, CalendarCheck, Send, UserPlus, LogIn, LogOut, ArrowLeft,
  Camera, UserCheck, MessageSquare, Star, X
} from 'lucide-react';
import api, { sessionStore } from '../services/api';
import LiveCameraCapture from '../components/common/LiveCameraCapture';
import FeedbackModal, { FeedbackFloatingTrigger } from '../components/common/FeedbackModal';
import { ROLES_META, resolveRoleMeta, USER_COUNT_DROPDOWN_ROLES } from '../constants/rolesMeta';
import { BackButtonBar, useNavigationState } from '../context/NavigationContext';
import LiveLocationTrackerMap from '../components/LiveLocationTrackerMap';
import AccountingAuditPanel from '../components/AccountingAuditPanel';
import { CctvMobilePanel } from '../components/CctvMobilePanel';
import { RegistersCrossCheckPanel } from '../components/UserCountDropdownWidget';

const formatGHS = (n) =>
  `GHS ${Number(n || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTxDateParts = (rawDate) => {
  const d = rawDate ? new Date(rawDate) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return { day: '—', date: '—', month: '—', full: '—' };
  }
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' });
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const month = d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { day, date, month, time, full: `${day}, ${date} (${month}) • ${time}` };
};

export default function RoleDashboards({ user: propUser, countdown: propCountdown }) {
  const user = propUser || sessionStore.getTenantUser();
  const roleKey = String(user?.role || 'MEMBER_PORTAL').toUpperCase();
  const roleMeta = resolveRoleMeta(roleKey);
  const navigate = useNavigate();
  const { tabId: routeTabId } = useParams();
  const [searchParams] = useSearchParams();

  const { savedState, saveState, restoreScroll } = useNavigationState({
    activeTab: 'OVERVIEW',
    search: '',
    statusFilter: '',
  });

  const urlTab = routeTabId ? routeTabId.toUpperCase() : searchParams.get('tab');
  const urlLocate = searchParams.get('locate') || '';

  const [activeTab, setActiveTab] = useState(urlTab || savedState.activeTab || 'OVERVIEW');
  const [search, setSearch] = useState(savedState.search || '');
  const [statusFilter, setStatusFilter] = useState(savedState.statusFilter || '');

  useEffect(() => {
    const reqTab = routeTabId ? routeTabId.toUpperCase() : (searchParams.get('tab') || 'OVERVIEW');
    setActiveTab(reqTab);
    const reqLocate = searchParams.get('locate');
    if (reqLocate) setLocatePhoneTarget(reqLocate);
  }, [routeTabId, searchParams]);

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
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);
  const [memberSearchInput, setMemberSearchInput] = useState('');
  const [memberSearching, setMemberSearching] = useState(false);
  const [memberSearchCount, setMemberSearchCount] = useState(null);
  const [includeHiddenMembers, setIncludeHiddenMembers] = useState(false);
  const [locatePhoneTarget, setLocatePhoneTarget] = useState(urlLocate);

  // Enterprise v3 States: Branding, Plans, Staff Approval & Provision, Attendance, Messaging, Alerts, Reports
  const [tenantProfile, setTenantProfile] = useState(null);
  const [brandingForm, setBrandingForm] = useState({ name: '', logoFile: null, logoPreview: '' });
  const [savingBranding, setSavingBranding] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState('');
  const [pendingStaff, setPendingStaff] = useState([]);
  const [branchApprovedStaff, setBranchApprovedStaff] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackReplyText, setFeedbackReplyText] = useState({});
  const [respondingFeedbackId, setRespondingFeedbackId] = useState(null);
  const [selectedStaffDossier, setSelectedStaffDossier] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', password: '',
    role: 'LOAN_OFFICER', department: 'CREDIT', position: 'Loan Officer', baseSalary: '2500', gpsAddress: '',
    livePhoto: '',
  });
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [staffSearchInput, setStaffSearchInput] = useState('');
  const [includeHiddenStaff, setIncludeHiddenStaff] = useState(false);
  const [guarantorSearchInput, setGuarantorSearchInput] = useState('');
  const [includeHiddenGuarantors, setIncludeHiddenGuarantors] = useState(false);
  const [newGuarantor, setNewGuarantor] = useState({
    firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '',
    relationship: 'Family / Business Surety', gpsAddress: '', address: '', isHidden: false,
  });
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceGpsAddress, setAttendanceGpsAddress] = useState('');
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [broadcastInbox, setBroadcastInbox] = useState([]);
  const [broadcastForm, setBroadcastForm] = useState({ sendToAll: true, recipientUserIds: [], title: '', message: '', priority: 'NORMAL' });
  const [repaymentAlerts, setRepaymentAlerts] = useState({ dueLoans: [], totalBorrowers: 0, overdueCount: 0, totalDueAmountGhs: 0 });
  const [dispatchingAlerts, setDispatchingAlerts] = useState(false);
  const [reportSnapshots, setReportSnapshots] = useState([]);
  const [wrappingPeriod, setWrappingPeriod] = useState('');

  // Operational Forms
  const [newMember, setNewMember] = useState({
    firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '',
    occupation: '', monthlyIncome: '', address: '', gpsAddress: '', isHidden: false, livePhoto: '',
  });
  const [newLoan, setNewLoan] = useState({ memberId: '', loanProductId: '', principalAmount: '', termMonths: '12', purpose: '' });
  const [newPayment, setNewPayment] = useState({ loanId: '', amount: '', method: 'MOMO', momoPhone: '', momoNetwork: 'MTN' });
  const [newMeeting, setNewMeeting] = useState({ title: '', scheduledAt: '', audienceType: 'ALL_STAFF', participantUserIds: [] });
  const [newCase, setNewCase] = useState({ caseType: 'COMPLIANCE', severity: 'HIGH', title: '', description: '' });
  const [newTicket, setNewTicket] = useState({ requesterName: '', requesterPhone: '', subject: '', description: '', category: 'REPAYMENT_INQUIRY', priority: 'NORMAL' });
  const [newCampaign, setNewCampaign] = useState({ name: '', channel: 'SMS', budget: '', reachCount: '' });
  const [newInvestor, setNewInvestor] = useState({ investorName: '', email: '', investedAmount: '', interestRate: '14.5', maturityDate: '' });
  const [visitForm, setVisitForm] = useState({ customerName: '', visitOutcome: 'PAYMENT_COLLECTED', notes: '', latitude: '5.6037', longitude: '-0.1870' });
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    saveState({ activeTab, search, statusFilter });
  }, [activeTab, search, statusFilter]);

  const isMemberOnly = ['MEMBER', 'MEMBER_PORTAL'].includes(roleKey);
  const isGuarantorOnly = ['GUARANTOR', 'GUARANTOR_PORTAL'].includes(roleKey);
  const isCompanyOwner = roleKey === 'COMPANY_OWNER';
  const isManagement = [
    'COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT',
    'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  ].includes(roleKey);
  const canBrandCompany = ['COMPANY_OWNER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'EXECUTIVE_MANAGEMENT'].includes(roleKey);
  const canCreateStaff = ['COMPANY_OWNER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'HUMAN_RESOURCE', 'EXECUTIVE_MANAGEMENT'].includes(roleKey);
  const isFinance = ['COMPANY_OWNER', 'ACCOUNTANT', 'FINANCE_MANAGER', 'TREASURY', 'INTERNAL_AUDIT'].includes(roleKey);
  const isCredit = ['COMPANY_OWNER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER', 'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER'].includes(roleKey);
  const isField = ['COMPANY_OWNER', 'COLLECTIONS', 'FIELD_OFFICER', 'STAFF', 'MOBILE_STAFF', 'COLLECTOR', 'BRANCH_MANAGER'].includes(roleKey);
  const isHR = ['COMPANY_OWNER', 'HUMAN_RESOURCE', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER'].includes(roleKey);
  const isRiskLegal = ['COMPANY_OWNER', 'LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS'].includes(roleKey);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      let coreFailure = '';
      const safe = (p, isCore = false) => p.catch((err) => {
        if (isCore && !coreFailure) {
          coreFailure = err?.response?.data?.message || err?.message || 'Unable to reach live database server.';
        }
        return { data: { data: null } };
      });
      // Wave 1: Core role & tenant state (small batch to avoid DB pool spikes)
      const [roleRes, countdownRes, messagesRes, productsRes] = await Promise.all([
        safe(api.get('/dashboard/my-role'), true),
        safe(api.get('/tenants/my/countdown')),
        safe(api.get('/tenants/my/messages')),
        safe(api.get('/enterprise/loan-products')),
      ]);

      setRoleMetrics(roleRes.data?.data || null);
      setCountdown(countdownRes.data?.data || propCountdown || null);
      setDevMessages(messagesRes.data?.data || []);
      setLoanProducts(productsRes.data?.data || []);

      if (isMemberOnly || isGuarantorOnly) {
        const [myLoansRes, myGuaranteesRes] = await Promise.all([
          safe(api.get('/loans/my-loans')),
          isGuarantorOnly ? safe(api.get('/guarantors/my-guarantees')) : Promise.resolve({ data: { data: null } }),
        ]);
        const myLoansList = myLoansRes.data?.data || [];
        setLoans(myLoansList);
        if (isMemberOnly) {
          const derivedPayments = myLoansList
            .flatMap((loan) => (loan.payments || []).map((p) => ({
              ...p,
              loan: p.loan || { id: loan.id, loanNumber: loan.loanNumber },
            })))
            .sort((a, b) => new Date(b.paidAt || b.createdAt || 0) - new Date(a.paidAt || a.createdAt || 0));
          setPayments(derivedPayments);
        }
        if (isGuarantorOnly && myGuaranteesRes) setGuarantors(myGuaranteesRes.data?.data || []);
      } else {
        // Wave 2: Primary overview, charts & core ledgers
        const [overviewRes, loanChartRes, paymentChartRes, loansRes, membersRes, paymentsRes] = await Promise.all([
          safe(api.get('/dashboard/overview'), true),
          safe(api.get('/dashboard/loan-chart')),
          safe(api.get('/dashboard/payment-chart')),
          safe(api.get('/loans')),
          safe(api.get('/members')),
          safe(api.get('/payments')),
        ]);
        setOverview(overviewRes.data?.data || null);
        setLoanChart(loanChartRes.data?.data || []);
        setPaymentChart(paymentChartRes.data?.data || []);
        setLoans(loansRes.data?.data || []);
        setMembers(membersRes.data?.data || []);
        setPayments(paymentsRes.data?.data || []);

        // Wave 3: Operations & enterprise modules
        const [
          collectorsRes, staffRes, guarantorsRes, meetingsRes, salariesRes,
          casesRes, ticketsRes, investorsRes, campaignsRes,
          deletionRes, auditRes,
        ] = await Promise.all([
          safe(api.get('/collectors')),
          safe(api.get('/staff')),
          safe(api.get('/guarantors')),
          safe(api.get('/meetings')),
          safe(api.get('/salaries')),
          safe(api.get('/enterprise/compliance-cases')),
          safe(api.get('/enterprise/support-tickets')),
          safe(api.get('/enterprise/investors')),
          safe(api.get('/enterprise/campaigns')),
          isManagement ? safe(api.get('/enterprise/deletion-requests')) : Promise.resolve({ data: { data: [] } }),
          (isRiskLegal || isManagement) ? safe(api.get('/audit-logs')) : Promise.resolve({ data: { data: [] } }),
        ]);
        setCollectors(collectorsRes.data?.data || []);
        setStaffList(staffRes.data?.data || []);
        setGuarantors(guarantorsRes.data?.data || []);
        setMeetings(meetingsRes.data?.data || []);
        setSalaries(salariesRes.data?.data || []);
        setCases(casesRes.data?.data || []);
        setTickets(ticketsRes.data?.data || []);
        setInvestors(investorsRes.data?.data || []);
        setCampaigns(campaignsRes.data?.data || []);
        if (isManagement) setDeletionQueue(deletionRes.data?.data || []);
        if (isRiskLegal || isManagement) setAuditLogs(auditRes.data?.data || []);

        // Wave 4: Enterprise v3 secondary telemetry slices
        const [
          profileRes,
          attMyRes,
          bcastRes,
          alertsRes,
          snapRes,
          pendingRes,
          attLogsRes,
          branchApprovedRes,
          feedbackRes,
        ] = await Promise.all([
          safe(api.get('/tenants/my/profile')),
          safe(api.get('/staff/attendance/my-status')),
          safe(api.get('/notifications/broadcasts')),
          safe(api.get('/notifications/repayment-alerts')),
          safe(api.get('/reports/snapshots')),
          (isManagement || roleActions.canApproveStaff || roleKey === 'BRANCH_MANAGER') ? safe(api.get('/staff/pending-approvals')) : Promise.resolve({ data: { data: [] } }),
          isManagement || isHR ? safe(api.get('/staff/attendance')) : Promise.resolve({ data: { data: [] } }),
          isCompanyOwner ? safe(api.get('/staff/branch-approved')) : Promise.resolve({ data: { data: [] } }),
          (isCompanyOwner || isManagement) ? safe(api.get('/feedback')) : Promise.resolve({ data: { data: [] } }),
        ]);

        const prof = profileRes.data?.data || null;
        if (prof) {
          setTenantProfile(prof);
          setBrandingForm((prev) => ({
            ...prev,
            name: prev.name || prof.name || '',
            logoPreview: prof.logoUrl || prev.logoPreview || '',
          }));
        }
        setAttendanceStatus(attMyRes.data?.data || null);
        setBroadcastInbox(bcastRes.data?.data || []);
        if (alertsRes.data?.data) setRepaymentAlerts(alertsRes.data.data);
        setReportSnapshots(snapRes.data?.data || []);
        setPendingStaff(pendingRes.data?.data || []);
        setAttendanceLogs(attLogsRes.data?.data || []);
        setBranchApprovedStaff(branchApprovedRes.data?.data || []);
        setFeedbacks(feedbackRes.data?.data || []);
      }
      if (coreFailure) {
        setLoadError(coreFailure);
      }
      restoreScroll();
    } finally {
      setLoading(false);
    }
  }, [roleKey, isMemberOnly, isGuarantorOnly, isManagement, isRiskLegal, isHR, isCompanyOwner]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Keep user's live device GPS synced to their registered mobile number when permission is granted
  useEffect(() => {
    if (!navigator.geolocation || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions.query({ name: 'geolocation' }).then((status) => {
      if (cancelled || status.state !== 'granted') return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          api.post('/gps/share-location', {
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
            accuracy: pos.coords.accuracy ? Number(pos.coords.accuracy.toFixed(1)) : undefined,
            status: 'ONLINE',
          }).catch(() => { });
        },
        () => { },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }).catch(() => { });
    return () => { cancelled = true; };
  }, []);

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

  // Click-to-Search Members / Customers (supports Phone, Name, Member #, Ghana Card & GPS Address + Hidden toggle)
  const handleSearchMembers = async (e, overrideQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = overrideQuery !== null ? overrideQuery : memberSearchInput.trim();
    setMemberSearching(true);
    try {
      const res = await api.get('/members', {
        params: {
          search: q || undefined,
          limit: 100,
          includeHidden: (includeHiddenMembers || Boolean(q)) ? 'true' : undefined,
        },
      });
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
    if (!newMember.livePhoto) {
      showToast('Live camera photo is strictly required before registering borrower.', true);
      return;
    }
    try {
      await api.post('/members', newMember);
      showToast(`Member ${newMember.firstName} ${newMember.lastName} registered cleanly!`);
      setNewMember({
        firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '',
        occupation: '', monthlyIncome: '', address: '', gpsAddress: '', isHidden: false, livePhoto: '',
      });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Member registration failed', true);
    }
  };

  const handleSearchGuarantors = async (e, overrideQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = overrideQuery !== null ? overrideQuery : guarantorSearchInput.trim();
    try {
      const res = await api.get('/guarantors', {
        params: {
          search: q || undefined,
          includeHidden: (includeHiddenGuarantors || Boolean(q)) ? 'true' : undefined,
        },
      });
      const rows = res.data?.data || [];
      setGuarantors(rows);
      if (q) showToast(`Found ${rows.length} guarantor record(s) matching "${q}".`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Guarantor search failed', true);
    }
  };

  const handleCreateGuarantor = async (e) => {
    e.preventDefault();
    try {
      await api.post('/guarantors', newGuarantor);
      showToast(`Guarantor ${newGuarantor.firstName} ${newGuarantor.lastName} saved with GPS Address.`);
      setNewGuarantor({
        firstName: '', lastName: '', phone: '', email: '', ghanaCardNumber: '',
        relationship: 'Family / Business Surety', gpsAddress: '', address: '', isHidden: false,
      });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Guarantor registration failed', true);
    }
  };

  const handleSearchStaff = async (e, overrideQuery = null) => {
    if (e && e.preventDefault) e.preventDefault();
    const q = overrideQuery !== null ? overrideQuery : staffSearchInput.trim();
    try {
      const res = await api.get('/staff', {
        params: {
          search: q || undefined,
          limit: 100,
          includeHidden: (includeHiddenStaff || Boolean(q)) ? 'true' : undefined,
        },
      });
      setStaffList(res.data?.data || []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Staff search failed', true);
    }
  };

  const handleCreateStaffAccount = async (e) => {
    e.preventDefault();
    if (!newStaffForm.livePhoto) {
      showToast('Live camera photo is strictly required before employing staff.', true);
      return;
    }
    setCreatingStaff(true);
    try {
      const res = await api.post('/staff/provision', {
        ...newStaffForm,
        baseSalary: Number(newStaffForm.baseSalary || 2500),
      });
      showToast(res.data?.message || 'Staff account created / queued.');
      setNewStaffForm({
        firstName: '', lastName: '', email: '', phone: '', password: '',
        role: 'LOAN_OFFICER', department: 'CREDIT', position: 'Loan Officer', baseSalary: '2500', gpsAddress: '',
        livePhoto: '',
      });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Staff creation failed', true);
    } finally {
      setCreatingStaff(false);
    }
  };

  const handleApprovePendingStaff = async (targetUserId, approve = true) => {
    try {
      const res = await api.post(`/staff/${targetUserId}/approve`, { approve });
      showToast(res.data?.message || `Staff account ${approve ? 'approved' : 'declined'}.`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Staff approval update failed', true);
    }
  };

  const handleOwnerApproveStaff = async (targetUserId) => {
    try {
      const res = await api.post(`/staff/${targetUserId}/owner-approve`);
      showToast(res.data?.message || 'Company Owner approved! Awaiting Branch Manager final sign-off.');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Owner approval failed', true);
    }
  };

  const handleBranchApproveStaff = async (targetUserId) => {
    try {
      const res = await api.post(`/staff/${targetUserId}/branch-approve`);
      showToast(res.data?.message || 'Branch Manager approved and employee activated.');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Branch approval failed', true);
    }
  };

  const handleVerifyEmployment = async (staffId) => {
    try {
      const res = await api.post(`/staff/${staffId}/verify-employment`);
      showToast(res.data?.message || 'Employee profile dossier verified and signed off by Company Owner.');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Employment verification failed', true);
    }
  };

  const handleRespondFeedback = async (feedbackId) => {
    const text = (feedbackReplyText[feedbackId] || '').trim();
    if (!text) {
      showToast('Please type a response before submitting.', true);
      return;
    }
    setRespondingFeedbackId(feedbackId);
    try {
      const res = await api.post(`/feedback/${feedbackId}/respond`, { response: text });
      showToast(res.data?.message || 'Response sent successfully.');
      setFeedbackReplyText((prev) => ({ ...prev, [feedbackId]: '' }));
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit response', true);
    } finally {
      setRespondingFeedbackId(null);
    }
  };

  const handleClockIn = async () => {
    setAttendanceBusy(true);
    const sendClockIn = async (coords = {}) => {
      try {
        const res = await api.post('/staff/attendance/clock-in', {
          gpsAddress: attendanceGpsAddress || undefined,
          ...coords,
        });
        showToast(res.data?.message || 'Clocked in for daily work shift!');
        loadDashboardData();
      } catch (err) {
        showToast(err.response?.data?.message || 'Clock-in failed', true);
      } finally {
        setAttendanceBusy(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendClockIn({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => sendClockIn({}),
        { timeout: 5000 }
      );
    } else {
      await sendClockIn({});
    }
  };

  const handleClockOut = async () => {
    setAttendanceBusy(true);
    const sendClockOut = async (coords = {}) => {
      try {
        const res = await api.post('/staff/attendance/clock-out', {
          gpsAddress: attendanceGpsAddress || undefined,
          ...coords,
        });
        showToast(res.data?.message || 'Clocked out cleanly! Total hours recorded.');
        loadDashboardData();
      } catch (err) {
        showToast(err.response?.data?.message || 'Clock-out failed', true);
      } finally {
        setAttendanceBusy(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendClockOut({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => sendClockOut({}),
        { timeout: 5000 }
      );
    } else {
      await sendClockOut({});
    }
  };

  const handleUpdateBranding = async (e) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const fd = new FormData();
      if (brandingForm.name) fd.append('name', brandingForm.name.trim());
      if (brandingForm.logoFile) fd.append('logo', brandingForm.logoFile);
      const res = await api.put('/tenants/my/branding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data?.data;
      if (updated) {
        setTenantProfile(updated);
        const curUser = sessionStore.getTenantUser();
        const curToken = sessionStore.getTenantToken();
        if (curUser && curToken) {
          sessionStore.setTenantSession(curToken, {
            ...curUser,
            tenantName: updated.name || curUser.tenantName,
            tenantLogoUrl: updated.logoUrl !== undefined ? updated.logoUrl : curUser.tenantLogoUrl,
          });
        }
        window.dispatchEvent(new CustomEvent('gbs:tenant-branding-updated', { detail: updated }));
      }
      showToast(res.data?.message || 'Company Name & Logo branding saved!');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Branding update failed', true);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleSelectSubscription = async (planCode) => {
    setUpgradingPlan(planCode);
    try {
      const res = await api.post('/tenants/my/subscription', { planCode });
      showToast(res.data?.message || `Subscription updated to ${planCode}`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Subscription update failed', true);
    } finally {
      setUpgradingPlan('');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/notifications/broadcast', broadcastForm);
      showToast(res.data?.message || 'Staff message sent!');
      setBroadcastForm({ sendToAll: true, recipientUserIds: [], title: '', message: '', priority: 'NORMAL' });
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send staff message', true);
    }
  };

  const handleDispatchCollectionAlerts = async () => {
    setDispatchingAlerts(true);
    try {
      const res = await api.post('/notifications/repayment-alerts/dispatch-staff', {});
      showToast(res.data?.message || 'Payment collection reminders dispatched to staff!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Collection alert dispatch failed', true);
    } finally {
      setDispatchingAlerts(false);
    }
  };

  const handleWrapReportPeriod = async (period) => {
    setWrappingPeriod(period);
    try {
      const res = await api.post('/reports/wrap-period', { period });
      showToast(res.data?.message || `${period} report wrapped & archived cleanly!`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to wrap period report', true);
    } finally {
      setWrappingPeriod('');
    }
  };

  const handleDownloadWrappedCsv = async (snapshotId, label) => {
    try {
      const res = await api.get(`/reports/snapshots/${snapshotId}/export`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(label || 'wrapped-report').replace(/\s+/g, '-').toLowerCase()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.message || 'CSV download failed', true);
    }
  };

  const handleApplyLoan = async (e) => {
    e.preventDefault();
    try {
      const resolvedMemberId = isMemberOnly
        ? (newLoan.memberId || roleMetrics?.datasets?.memberProfile?.id || undefined)
        : (newLoan.memberId || undefined);
      await api.post('/loans/apply', {
        memberId: resolvedMemberId,
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

  const handleSignGuarantorAgreement = async (guarantorId) => {
    try {
      await api.post(`/guarantors/${guarantorId}/sign-agreement`, {});
      showToast('Guarantor digital surety agreement signed & timestamped!');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not sign guarantor agreement', true);
    }
  };

  const handleToggleGuarantorPenalty = async (guarantorId, enabled) => {
    try {
      await api.put(`/guarantors/${guarantorId}/penalty-notifications`, { enabled });
      showToast(`Guarantor penalty alerts ${enabled ? 'enabled' : 'disabled'}.`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update penalty notifications', true);
    }
  };

  const handleApproveCashPayment = async (paymentId) => {
    try {
      await api.put(`/payments/${paymentId}/approve-cash`, {
        paymentId,
        approved: true,
        notes: 'Cash repayment verified & approved in ledger',
      });
      showToast('Cash repayment verified & approved in ledger!');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Cash approval failed', true);
    }
  };

  const handleUpdateCaseStatus = async (caseId, status) => {
    try {
      await api.put(`/enterprise/compliance-cases/${caseId}`, { status });
      showToast(`Case status updated to ${status}.`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Case update failed', true);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      await api.put(`/enterprise/support-tickets/${ticketId}`, { status });
      showToast(`Support ticket marked ${status}.`);
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Ticket update failed', true);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    try {
      await api.delete(`/meetings/${meetingId}`);
      showToast('Scheduled meeting cancelled.');
      loadDashboardData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not cancel meeting', true);
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
        audienceType: newMeeting.audienceType || 'ALL_STAFF',
        participantUserIds: newMeeting.participantUserIds || [],
      });
      showToast('Online Meeting scheduled and invitations sent!');
      setNewMeeting({ title: '', scheduledAt: '', audienceType: 'ALL_STAFF', participantUserIds: [] });
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
      await api.post('/enterprise/support-tickets', {
        ...newTicket,
        requesterName: newTicket.requesterName || `${user?.firstName || 'Walk-In'} ${user?.lastName || 'Customer'}`.trim(),
      });
      showToast('Customer support ticket opened!');
      setNewTicket({ requesterName: '', requesterPhone: '', subject: '', description: '', category: 'REPAYMENT_INQUIRY', priority: 'NORMAL' });
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

  const filteredPayments = payments.filter((p) => {
    const q = paymentSearch.toLowerCase().trim();
    const refStr = (p.transactionRef || p.receiptNumber || p.reference || p.id || '').toLowerCase();
    const loanNum = (p.loan?.loanNumber || '').toLowerCase();
    const matchesSearch = !q || refStr.includes(q) || loanNum.includes(q);
    const matchesMethod = !paymentMethodFilter || p.method === paymentMethodFilter;
    return matchesSearch && matchesMethod;
  });

  const canViewLoans = isMemberOnly || isManagement || isCredit || isField || isFinance || isRiskLegal;
  const canViewPayments = isMemberOnly || isManagement || isCredit || isField || isFinance || isRiskLegal;
  const canViewMembers = !isMemberOnly && !isGuarantorOnly && (isManagement || isCredit || isField || isRiskLegal || roleKey === 'CUSTOMER_SERVICE' || roleKey === 'RECEPTION');
  const canViewGuarantors = isGuarantorOnly || isManagement || isCredit || isField || isRiskLegal;

  // Tab Navigation strictly scoped to each role's permitted domain
  const tabs = [
    { id: 'OVERVIEW', label: 'Overview & Hub', icon: Landmark, badge: null },
  ];
  if (canViewLoans) {
    tabs.push({ id: 'LOANS', label: isMemberOnly ? 'My Loans & Apply' : 'Loans & Approvals', icon: CreditCard, badge: loans.length });
  }
  if (canViewPayments) {
    tabs.push({ id: 'PAYMENTS', label: 'Repayments (MoMo/Bank/Cash)', icon: TrendingUp, badge: payments.length });
  }
  if (canViewMembers) {
    tabs.push({ id: 'MEMBERS', label: 'Borrowers & KYC', icon: Users, badge: members.length });
  }
  if (canViewGuarantors) {
    tabs.push({ id: 'GUARANTORS', label: isGuarantorOnly ? 'My Guarantees & Surety' : 'Guarantors', icon: ShieldCheck, badge: guarantors.length });
  }
  if (isField || isCredit || isManagement || isRiskLegal) {
    tabs.push({ id: 'FIELD_OPS', label: 'Live GPS Map & Visits', icon: MapPin, badge: collectors.length });
  }
  if (isHR || isFinance || isManagement) {
    tabs.push({ id: 'HR_PAYROLL', label: 'Staff, Approvals & Attendance', icon: UserPlus, badge: pendingStaff.length > 0 ? `${staffList.length}+${pendingStaff.length}` : staffList.length });
  }
  if (isFinance || isManagement || isRiskLegal) {
    tabs.push({ id: 'ACCOUNTING_AUDIT', label: 'Accountant Audit & Sign-Off', icon: Calculator, badge: null });
  }
  if (canBrandCompany) {
    tabs.push({ id: 'BRANDING_CCTV', label: 'Branding, Plans & CCTV', icon: Building2, badge: null });
  }
  if (isRiskLegal || isManagement) {
    tabs.push({ id: 'RISK_AUDIT', label: 'Compliance, Audit & Deletions', icon: AlertTriangle, badge: cases.length + deletionQueue.length });
  }
  if (roleKey === 'CUSTOMER_SERVICE' || roleKey === 'RECEPTION' || isManagement) {
    tabs.push({ id: 'SUPPORT', label: 'Support & Front Desk', icon: Bell, badge: tickets.length });
  }
  if (roleKey === 'MARKETING' || roleKey === 'INVESTOR' || isManagement) {
    tabs.push({ id: 'GROWTH_CAPITAL', label: 'Marketing & Investors', icon: Megaphone, badge: campaigns.length + investors.length });
  }
  if (!isMemberOnly && !isGuarantorOnly) {
    tabs.push({ id: 'STAFF_COMMS', label: 'Staff Messaging', icon: Send, badge: broadcastInbox.length });
    tabs.push({ id: 'MEETINGS_REPORTS', label: 'Meetings & Reports', icon: Video, badge: meetings.length });
  }

  // Role-Tailored Quick-Action Command Hub for all 29 Canonical Roles
  const buildRoleQuickCommands = () => {
    if (isMemberOnly) {
      return [
        { title: 'Apply for New Loan', desc: 'Submit a new personal or SME facility request with instant installment preview.', icon: Plus, to: '/dashboard/tab/LOANS' },
        { title: 'Pay Installment via MoMo', desc: 'Make an instant MTN MoMo, Telecel Cash, or Bank repayment toward your loan.', icon: CreditCard, to: '/dashboard/tab/PAYMENTS' },
        { title: 'Inspect Loan Schedule', desc: 'View your active loan balance, installment breakdown, and payment receipts.', icon: Landmark, to: loans[0] ? `/loans/${loans[0].id}` : '/dashboard/tab/LOANS' },
        { title: 'Security & Biometric Settings', desc: 'Manage 2FA authenticator, Voice ID passphrase, and Facial verification.', icon: ShieldCheck, to: '/profile/security' },
      ];
    }
    if (isGuarantorOnly) {
      return [
        { title: 'Review & Sign Surety Agreements', desc: 'Inspect guaranteed borrower facilities and digitally sign surety agreements.', icon: ShieldCheck, to: '/dashboard/tab/GUARANTORS' },
        { title: 'Inspect Guaranteed Loans', desc: 'Check live repayment standing and outstanding balances on guaranteed loans.', icon: Landmark, to: '/dashboard/tab/LOANS' },
        { title: 'Make Surety Repayment', desc: 'Submit a MoMo or Bank payment on behalf of a guaranteed borrower.', icon: CreditCard, to: '/dashboard/tab/PAYMENTS' },
        { title: 'Security & Alert Preferences', desc: 'Configure penalty notification alerts and biometric security settings.', icon: Bell, to: '/profile/security' },
      ];
    }
    if (isCompanyOwner || ['BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT'].includes(roleKey)) {
      return [
        { title: 'Company Branding, Plans & CCTV', desc: 'Customize institution name/logo, renew subscription plan, and view live branch CCTV.', icon: Building2, to: '/dashboard/tab/BRANDING_CCTV' },
        { title: `Approve Staff & Payroll (${pendingStaff.length} Pending)`, desc: 'Review pending staff accounts, provision new roles, and oversee monthly payroll.', icon: UserPlus, to: '/dashboard/tab/HR_PAYROLL' },
        { title: 'Accountant Ledger Sign-Off', desc: 'Review and sign off balanced or flagged general ledger audits.', icon: Calculator, to: '/dashboard/tab/ACCOUNTING_AUDIT' },
        { title: 'Meetings & Wrapped Reports', desc: 'Host executive online meetings and wrap Weekly/Monthly/Yearly snapshots.', icon: Video, to: '/dashboard/tab/MEETINGS_REPORTS' },
      ];
    }
    if (['REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER'].includes(roleKey)) {
      return [
        { title: `Review Loan Approvals (${loans.filter((l) => ['PENDING', 'UNDER_REVIEW'].includes(l.status)).length})`, desc: 'Appraise, approve, or disburse pending borrower loan facilities.', icon: Landmark, to: '/dashboard/tab/LOANS' },
        { title: 'Live GPS Collector & Customer Map', desc: 'Track field collectors and locate borrowers or guarantors by phone or GPS.', icon: MapPin, to: '/dashboard/tab/FIELD_OPS' },
        { title: 'Branch Staff & Daily Attendance', desc: 'Create branch staff accounts and audit daily clock-in/clock-out logs.', icon: Users, to: '/dashboard/tab/HR_PAYROLL' },
        { title: 'Deletion Approvals & Compliance', desc: `Review ${deletionQueue.length} pending deletion requests and compliance cases.`, icon: ShieldCheck, to: '/dashboard/tab/RISK_AUDIT' },
      ];
    }
    if (['LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER'].includes(roleKey)) {
      return [
        { title: 'Originate & Underwrite Loans', desc: 'Create new loan applications, run 5Cs credit scoring, and approve facilities.', icon: Landmark, to: '/dashboard/tab/LOANS' },
        { title: 'Onboard Borrower & Verify KYC', desc: 'Register borrowers with Ghana Card and mandatory GhanaPost GPS Digital Address.', icon: Users, to: '/dashboard/tab/MEMBERS' },
        { title: 'Register & Verify Guarantors', desc: 'Attach loan guarantors, record GPS addresses, and verify surety agreements.', icon: ShieldCheck, to: '/dashboard/tab/GUARANTORS' },
        { title: 'Field Residence Verification Map', desc: 'Locate borrower business/residence coordinates on Google Live Map.', icon: MapPin, to: '/dashboard/tab/FIELD_OPS' },
      ];
    }
    if (['COLLECTIONS', 'FIELD_OFFICER', 'MOBILE_STAFF', 'STAFF', 'COLLECTOR'].includes(roleKey)) {
      return [
        { title: 'Live Emergency GPS Locator & Visit Log', desc: 'Locate any borrower or guarantor by phone/GPS and log field collection visits.', icon: MapPin, to: '/dashboard/tab/FIELD_OPS' },
        { title: 'Record Field Repayment (MoMo / Cash)', desc: 'Log borrower MoMo or cash collections directly into the loan ledger.', icon: CreditCard, to: '/dashboard/tab/PAYMENTS' },
        { title: 'Search Borrowers & Confidential Records', desc: 'Look up borrower phone contacts, GhanaPost GPS addresses, and overdue schedules.', icon: Search, to: '/dashboard/tab/MEMBERS' },
        { title: 'Guarantor Recovery Follow-Up', desc: 'Inspect guarantor contacts and surety obligations for overdue accounts.', icon: ShieldCheck, to: '/dashboard/tab/GUARANTORS' },
      ];
    }
    if (['ACCOUNTANT', 'FINANCE_MANAGER', 'TREASURY'].includes(roleKey)) {
      return [
        { title: 'Run Ledger Reconciliation & Audit', desc: 'Compute pesewa-accurate ledger totals and submit audit report to Company Owner.', icon: Calculator, to: '/dashboard/tab/ACCOUNTING_AUDIT' },
        { title: 'Verify & Approve Repayments', desc: 'Reconcile MoMo, Bank Transfer, and Cash repayments across all active loans.', icon: CreditCard, to: '/dashboard/tab/PAYMENTS' },
        { title: 'Process Monthly Staff Payroll', desc: 'Generate monthly salary runs and disburse staff net salaries.', icon: Briefcase, to: '/dashboard/tab/HR_PAYROLL' },
        { title: 'Export Financial Ledgers (CSV/XLSX/PDF)', desc: 'Download certified loan, payment, and audit statements.', icon: Download, to: '/dashboard/tab/MEETINGS_REPORTS' },
      ];
    }
    if (roleKey === 'HUMAN_RESOURCE') {
      return [
        { title: 'Create Staff & Manage Roster', desc: `Provision staff across all ${ROLES_META.length} roles with GPS Digital Address.`, icon: UserPlus, to: '/dashboard/tab/HR_PAYROLL' },
        { title: 'Qualification Cross-Check Portal', desc: 'Verify newly registered staff credentials and approve or remove unqualified accounts.', icon: ShieldCheck, to: '/admin/users-crosscheck' },
        { title: 'Broadcast HR Notice to Staff', desc: 'Send general or targeted policy announcements to institution employees.', icon: Send, to: '/dashboard/tab/STAFF_COMMS' },
        { title: 'Schedule Staff Online Meeting', desc: 'Create online training or HR review sessions for staff.', icon: Video, to: '/dashboard/tab/MEETINGS_REPORTS' },
      ];
    }
    if (['LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS'].includes(roleKey)) {
      return [
        { title: `Manage ${roleMeta.title} Cases (${cases.length})`, desc: 'Open, investigate, and resolve AML, KYC, fraud, legal, or security cases.', icon: AlertTriangle, to: '/dashboard/tab/RISK_AUDIT' },
        { title: 'Inspect Ledger Audits & Discrepancies', desc: 'Review accountant reconciliation reports and financial variance flags.', icon: Calculator, to: '/dashboard/tab/ACCOUNTING_AUDIT' },
        { title: 'Emergency GPS & Field Audit Map', desc: 'Verify borrower, guarantor, and collector locations on the live GPS map.', icon: MapPin, to: '/dashboard/tab/FIELD_OPS' },
        { title: 'Export Governance Audit Trail', desc: 'Download immutable system activity logs in CSV, XLSX, or PDF.', icon: Download, to: '/dashboard/tab/MEETINGS_REPORTS' },
      ];
    }
    if (['CUSTOMER_SERVICE', 'RECEPTION'].includes(roleKey)) {
      return [
        { title: `Front Desk & Support Queue (${tickets.length})`, desc: 'Log walk-in visitor inquiries, repayment questions, and resolve customer tickets.', icon: Bell, to: '/dashboard/tab/SUPPORT' },
        { title: 'Register Walk-In Borrower KYC', desc: 'Onboard new customers with Ghana Card and mandatory GPS Digital Address.', icon: Users, to: '/dashboard/tab/MEMBERS' },
        { title: 'Assist Customer Loan Application', desc: 'Help borrowers submit a new loan application or check approval status.', icon: Landmark, to: '/dashboard/tab/LOANS' },
        { title: 'Check Borrower Repayment Receipt', desc: 'Look up customer MoMo or cash payment status and receipt numbers.', icon: CreditCard, to: '/dashboard/tab/PAYMENTS' },
      ];
    }
    // MARKETING / INVESTOR
    return [
      { title: 'Marketing Outreach & Investor Tranches', desc: 'Launch SMS/WhatsApp borrower acquisition campaigns and track investor capital yields.', icon: Megaphone, to: '/dashboard/tab/GROWTH_CAPITAL' },
      { title: 'Team Notices & Broadcasts', desc: 'Read institutional directives and coordinate campaign launches with management.', icon: Send, to: '/dashboard/tab/STAFF_COMMS' },
      { title: 'Meetings & Executive Reports', desc: 'Join Zoom briefings and download wrapped period performance snapshots.', icon: Download, to: '/dashboard/tab/MEETINGS_REPORTS' },
    ];
  };
  const roleQuickCommands = buildRoleQuickCommands();

  const isTabPage = activeTab !== 'OVERVIEW';
  const currentTabLabel = tabs.find((t) => t.id === activeTab)?.label || activeTab;

  return (
    <div className={`dashboard-page-shell ${isTabPage ? 'tab-page-container' : ''}`}>
      <div
        className="dashboard-page-backdrop"
        aria-hidden="true"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 12, 24, 0.55) 0%, rgba(6, 12, 24, 0.72) 100%), url(${roleMeta.dashboardImage})` }}
      />
      <div className="dashboard-page-content">
        {isTabPage ? (
          <BackButtonBar
            title={currentTabLabel}
            subtitle={`${roleMeta.title} • ${tenantProfile?.name || user?.tenantName || 'GBS Lending Institution'}`}
            breadcrumb={['Overview Dashboard', currentTabLabel]}
            fallbackPath="/dashboard"
            actions={
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {USER_COUNT_DROPDOWN_ROLES.has(roleKey) && (
                  <Link to="/admin/users-crosscheck" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                    <ShieldCheck size={14} /> Cross-Check
                  </Link>
                )}
                <button type="button" className="btn btn-primary" style={{ padding: '7px 12px', fontSize: '0.8rem' }} onClick={loadDashboardData}>
                  <RefreshCw size={14} /> Sync PostgreSQL
                </button>
              </div>
            }
          />
        ) : (
          /* 1. UNIQUE REAL-LIFE ROLE DASHBOARD PHOTO HERO BANNER (Shown on Overview Page) */
          <div className="role-hero-banner">
            <img src={roleMeta.dashboardImage} alt={`${roleMeta.title} Dashboard`} className="role-hero-bg" />
            <div className="role-hero-overlay">
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <span className="badge badge-gold">{roleMeta.category}</span>
                  <span className="badge badge-success">{tenantProfile?.name || user?.tenantName || 'GBS Lending Institution'}</span>
                  {countdown && (
                    <span className={`badge ${countdown.isLifetime ? 'badge-gold' : countdown.daysLeft <= 10 ? 'badge-warning' : 'badge-cyan'}`}>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      {countdown.isLifetime
                        ? 'LIFETIME LICENSE'
                        : `${countdown.daysLeft ?? 30} Days Remaining (${countdown.subscriptionPlan || countdown.planTier || 'TRIAL_1M'})`}
                    </span>
                  )}
                  {canViewMembers && (
                    <span className="badge badge-cyan">
                      <Users size={12} style={{ marginRight: 4 }} />
                      Registered Customers: {overview?.totalMembers ?? members.length}
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                  {roleMeta.title} Command Dashboard
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  <Link to="/profile/security" title="Update profile picture or live camera capture" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', background: 'rgba(6,12,24,0.68)', padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(212,175,55,0.45)' }}>
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #D4AF37' }} />
                    ) : (
                      <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,175,55,0.22)', color: '#F4E07B', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.88rem', border: '1.5px solid #D4AF37' }}>
                        {(user?.firstName?.[0] || 'U')}{(user?.lastName?.[0] || '')}
                      </span>
                    )}
                    <span style={{ color: '#FFFFFF', fontSize: '0.92rem' }}>
                      <strong>{user?.firstName} {user?.lastName}</strong>
                      <span style={{ color: '#94A3B8', marginLeft: 8, fontSize: '0.82rem' }}>{user?.phone || user?.email}</span>
                      {!user?.profilePicture && <span style={{ color: '#FDE68A', marginLeft: 8, fontSize: '0.78rem' }}>• Upload Photo</span>}
                    </span>
                  </Link>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: '#E2E8F0', maxWidth: 680 }}>
                  {roleMeta.subtitle}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {USER_COUNT_DROPDOWN_ROLES.has(roleKey) && (
                  <Link
                    to="/admin/users-crosscheck"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    <ShieldCheck size={15} /> Qualification Cross-Check
                  </Link>
                )}
                {(isManagement || isFinance) && (
                  <Link
                    to="/migrations"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Upload size={15} /> Data Migration
                  </Link>
                )}
                <button type="button" className="btn btn-primary" onClick={loadDashboardData}>
                  <RefreshCw size={15} /> Sync PostgreSQL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1B. COMPANY OWNER BRANDING NOTIFICATION & STAFF CLOCK IN/OUT STRIP */}
        {isCompanyOwner && tenantProfile && !tenantProfile.companyNameUpdated && (
          <div
            className="glass-panel"
            style={{
              padding: 14,
              marginBottom: 16,
              borderColor: 'rgba(245, 158, 11, 0.6)',
              background: 'linear-gradient(90deg, rgba(107,29,47,0.35), rgba(212,175,55,0.18))',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#FDE68A' }}>
              <strong>Action Required for Company Owner:</strong> Update your registered institution name &amp; upload your company logo so it appears across all company dashboards (your change will never overwrite the GBS platform core name).
            </div>
            <Link
              to="/dashboard/tab/BRANDING_CCTV"
              className="btn btn-primary"
              style={{ padding: '7px 14px', textDecoration: 'none' }}
            >
              <Building2 size={14} /> Update Company Name &amp; Logo <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {!isMemberOnly && !isGuarantorOnly && (
          <div
            className="glass-panel"
            style={{
              padding: '12px 16px',
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              borderColor: 'rgba(16, 185, 129, 0.35)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <CalendarCheck size={18} color="#10B981" />
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F1F5F9' }}>
                  Daily Staff Attendance Shift: <span style={{ color: attendanceStatus?.clockedIn ? '#34D399' : '#FBBF24' }}>
                    {attendanceStatus?.clockedIn
                      ? `CLOCKED IN (${new Date(attendanceStatus.todayRecord?.clockInAt || Date.now()).toLocaleTimeString()})`
                      : attendanceStatus?.todayRecord?.clockOutAt
                        ? `CLOSED SHIFT (${attendanceStatus.todayRecord?.durationMinutes || 0} mins logged)`
                        : 'NOT CLOCKED IN YET'}
                  </span>
                </div>
                <div style={{ fontSize: '0.73rem', color: '#94A3B8' }}>
                  Work reporting and closing timestamps + live GPS location are audited automatically.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                className="gbs-input"
                style={{ width: 175, padding: '6px 10px', fontSize: '0.78rem' }}
                placeholder="GPS Address (optional)"
                value={attendanceGpsAddress}
                onChange={(e) => setAttendanceGpsAddress(e.target.value)}
              />
              {!attendanceStatus?.clockedIn ? (
                <button type="button" disabled={attendanceBusy} className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.8rem' }} onClick={handleClockIn}>
                  <LogIn size={14} /> {attendanceBusy ? 'Saving...' : 'Clock In (Report to Work)'}
                </button>
              ) : (
                <button type="button" disabled={attendanceBusy} className="btn btn-danger" style={{ padding: '7px 14px', fontSize: '0.8rem' }} onClick={handleClockOut}>
                  <LogOut size={14} /> {attendanceBusy ? 'Saving...' : 'Clock Out (Close Work)'}
                </button>
              )}
            </div>
          </div>
        )}

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

        {loadError && (
          <div
            className="glass-panel"
            role="alert"
            style={{
              padding: '12px 16px',
              marginBottom: 18,
              borderColor: 'rgba(239, 68, 68, 0.55)',
              background: 'rgba(127, 29, 29, 0.35)',
              color: '#FECACA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span><strong>Live Data Sync Notice:</strong> {loadError}</span>
            <button type="button" className="btn btn-primary" style={{ padding: '6px 14px' }} onClick={loadDashboardData}>
              <RefreshCw size={14} /> Retry Sync
            </button>
          </div>
        )}

        {toast && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: 'sticky',
              top: 12,
              zIndex: 45,
              padding: '12px 16px',
              marginBottom: 18,
              borderRadius: 10,
              background: toast.isErr ? 'rgba(127, 29, 29, 0.94)' : 'rgba(6, 78, 59, 0.94)',
              border: `1px solid ${toast.isErr ? '#EF4444' : '#10B981'}`,
              color: toast.isErr ? '#FECACA' : '#A7F3D0',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 10px 28px rgba(2, 6, 23, 0.65)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span>{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '1rem',
                lineHeight: 1,
                padding: '2px 6px',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* 3. WORKSPACE SUB-NAVIGATION TABS (Organized Command Bar with Icons & Live Badge Counts) */}
        <div className="dashboard-tab-bar" role="navigation" aria-label="Workspace Sections">
          {tabs.map((t) => {
            const TabIcon = t.icon || Landmark;
            const isCurrent = activeTab === t.id;
            return (
              <Link
                key={t.id}
                to={t.id === 'OVERVIEW' ? '/dashboard' : `/dashboard/tab/${encodeURIComponent(t.id)}`}
                className={`dashboard-tab-pill ${isCurrent ? 'active' : ''}`}
                style={{ textDecoration: 'none' }}
              >
                <TabIcon size={14} />
                <span>{t.label}</span>
                {t.badge !== null && t.badge !== undefined && (
                  <span className="dashboard-tab-badge">{t.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        {!tabs.some((t) => t.id === activeTab) && (
          <div className="glass-panel" style={{ padding: 22, marginBottom: 18 }}>
            <p style={{ margin: '0 0 12px', color: '#FDE68A' }}>
              The workspace tab <strong>{activeTab}</strong> is not available for the {roleMeta.title} portal.
            </p>
            <Link to="/dashboard" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Return to Overview Dashboard
            </Link>
          </div>
        )}

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
                    {isRiskLegal ? 'TOTAL REGISTERED CUSTOMERS / CASES' : isHR ? 'TOTAL CUSTOMERS / PAYROLL' : 'TOTAL REGISTERED CUSTOMERS'}
                  </div>
                  <div className="metric-value" style={{ color: '#F4E07B' }}>
                    {isRiskLegal
                      ? `${overview?.totalMembers ?? members.length} / ${cases.length}`
                      : isHR
                        ? `${overview?.totalMembers ?? members.length} / ${salaries.length}`
                        : (overview?.totalMembers ?? members.length)}
                  </div>
                </div>
                <Users size={26} color="#F4E07B" />
              </div>
            </div>

            {/* Role-Tailored Quick-Action Command Hub (All 29 Canonical Roles) */}
            <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(212, 175, 55, 0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ShieldCheck size={18} /> {roleMeta.title} — Quick-Action Command Hub
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 2 }}>
                    Tailored operational commands and direct workspace shortcuts for {roleMeta.category} ({roleMeta.focus?.join(' • ') || 'Live Operations'}).
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(roleMeta.focus || []).map((f) => (
                    <span key={f} className="badge badge-gold" style={{ fontSize: '0.68rem' }}>{f}</span>
                  ))}
                </div>
              </div>
              <div className="quick-command-grid">
                {roleQuickCommands.map((cmd) => {
                  const CmdIcon = cmd.icon || Landmark;
                  return (
                    <Link
                      key={cmd.title}
                      to={cmd.to}
                      className="quick-command-card"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="quick-command-icon">
                        <CmdIcon size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                          <span>{cmd.title}</span>
                          <ArrowUpRight size={13} color="#D4AF37" />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4, lineHeight: 1.4 }}>
                          {cmd.desc}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {USER_COUNT_DROPDOWN_ROLES.has(roleKey) && (
              <RegistersCrossCheckPanel
                userRole={roleKey}
                totalCustomers={overview?.totalMembers ?? members.length}
                onUpdated={loadDashboardData}
              />
            )}

            {canCreateStaff && (
              <div className="glass-panel" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderColor: 'rgba(16, 185, 129, 0.35)' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#34D399', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <UserPlus size={17} /> Institution &amp; Branch Staff Provisioning ({staffList.length} Active / {pendingStaff.length} Pending Approval)
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: 2 }}>
                    {isCompanyOwner
                      ? `Create staff across all ${ROLES_META.length} roles and approve branch-submitted staff registrations.`
                      : 'Branch Managers & HR can create new staff with GPS Digital Address; Company Owner approves final portal access.'}
                  </div>
                </div>
                <Link
                  to="/dashboard/tab/HR_PAYROLL"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  <UserPlus size={15} /> Create New Staff Account <ArrowUpRight size={13} />
                </Link>
              </div>
            )}

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
                    placeholder="Find customer (including hidden) by Name, Mobile, GPS Digital Address, Member # or Ghana Card..."
                    value={memberSearchInput}
                    onChange={(e) => setMemberSearchInput(e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#CBD5E1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={includeHiddenMembers}
                      onChange={(e) => setIncludeHiddenMembers(e.target.checked)}
                    />
                    Include Hidden
                  </label>
                  <button type="submit" disabled={memberSearching} className="btn btn-primary" style={{ padding: '9px 16px' }}>
                    <Search size={14} /> {memberSearching ? 'Searching...' : 'Search Customers'}
                  </button>
                  <Link
                    to="/dashboard/tab/MEMBERS"
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none' }}
                  >
                    Open Directory ({members.length}) <ArrowUpRight size={13} />
                  </Link>
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
                        {m.memberNumber} — {m.user?.firstName} {m.user?.lastName} ({m.user?.phone}){m.gpsAddress || m.user?.gpsAddress ? ` • ${m.gpsAddress || m.user?.gpsAddress}` : ''}
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
              <div className="glass-panel" style={{ padding: 18, borderColor: 'rgba(245, 158, 11, 0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#FBBF24', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={17} /> Borrower Payment Collection Alerts ({repaymentAlerts.totalBorrowers || 0} Installments Due / {repaymentAlerts.overdueCount || 0} Overdue)
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: 2 }}>
                      Total Due Recovery Target: <strong>{formatGHS(repaymentAlerts.totalDueAmountGhs)}</strong> — Staff must follow up to ensure borrowers pay on schedule.
                    </div>
                  </div>
                  {(isManagement || isCredit || isField || isFinance) && (
                    <button
                      type="button"
                      disabled={dispatchingAlerts}
                      className="btn btn-primary"
                      style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                      onClick={handleDispatchCollectionAlerts}
                    >
                      <Bell size={14} /> {dispatchingAlerts ? 'Dispatching...' : 'Notify Collection Staff Now'}
                    </button>
                  )}
                </div>
                {repaymentAlerts.dueLoans?.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {repaymentAlerts.dueLoans.slice(0, 6).map((item) => (
                      <div key={item.scheduleId} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: `1px solid ${item.isOverdue ? 'rgba(239,68,68,0.45)' : 'rgba(212,175,55,0.22)'}`, fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#F1F5F9' }}>
                          <span>{item.borrowerName} ({item.loanNumber})</span>
                          <span style={{ color: item.isOverdue ? '#F87171' : '#FBBF24' }}>{formatGHS(item.amountDueGhs)}</span>
                        </div>
                        <div style={{ color: '#94A3B8', marginTop: 2 }}>
                          Phone: {item.borrowerPhone || 'N/A'}{item.borrowerGpsAddress ? ` • GPS: ${item.borrowerGpsAddress}` : ''}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: item.isOverdue ? '#FCA5A5' : '#00F2FE', marginTop: 2 }}>
                          {item.isOverdue ? 'OVERDUE' : 'DUE SOON'} • {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#34D399' }}>All scheduled installments are currently up to date.</div>
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

            {/* Self-Service Summary Cards for Borrower (Member Portal) & Guarantor Portal */}
            {(isMemberOnly || isGuarantorOnly) && (
              <div className="gbs-grid-2">
                <div className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1rem' }}>
                      {isMemberOnly ? `My Loan Facilities (${loans.length})` : `Guaranteed Loan Facilities (${loans.length})`}
                    </h3>
                    <Link to="/dashboard/tab/LOANS" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem', textDecoration: 'none' }}>
                      {isMemberOnly ? 'Apply / View All' : 'Inspect Loans'} <ArrowUpRight size={12} />
                    </Link>
                  </div>
                  {loans.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontSize: '0.84rem' }}>
                      {isMemberOnly ? 'No active loans yet. Click "Apply / View All" to submit a new loan application.' : 'No guaranteed loans linked to your profile yet.'}
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {loans.slice(0, 5).map((l) => (
                        <div key={l.id} style={{ padding: 12, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <div>
                            <strong style={{ color: '#F8FAFC', fontSize: '0.86rem' }}>{l.loanNumber}</strong>
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>
                              Principal: {formatGHS(l.principalAmount)} • Outstanding: {formatGHS(l.outstandingAmount ?? l.totalOutstanding ?? l.principalAmount)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className={`badge ${['APPROVED', 'DISBURSED', 'ONGOING', 'PAID'].includes(l.status) ? 'badge-success' : 'badge-warning'}`}>{l.status}</span>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.74rem' }} onClick={() => navigate(`/loans/${l.id}`)}>
                              Schedule
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, color: '#00F2FE', fontSize: '1rem' }}>
                      {isGuarantorOnly ? 'My Surety Agreement Standing' : `Recent Repayments (${payments.length})`}
                    </h3>
                    <Link
                      to={isGuarantorOnly ? '/dashboard/tab/GUARANTORS' : '/dashboard/tab/PAYMENTS'}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem', textDecoration: 'none' }}
                    >
                      {isGuarantorOnly ? 'Manage Surety' : 'Pay via MoMo'} <ArrowUpRight size={12} />
                    </Link>
                  </div>
                  {isGuarantorOnly ? (
                    guarantors.length === 0 ? (
                      <p style={{ color: '#94A3B8', fontSize: '0.84rem' }}>Your guarantor profile is active and ready for digital surety signing.</p>
                    ) : (
                      guarantors.map((g) => (
                        <div key={g.id} style={{ padding: 14, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(0,242,254,0.25)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <strong>{g.user?.firstName || user?.firstName} {g.user?.lastName || user?.lastName}</strong>
                            <span className={`badge ${g.agreementSigned ? 'badge-success' : 'badge-warning'}`}>
                              {g.agreementSigned ? 'SURETY SIGNED' : 'PENDING SIGNATURE'}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginBottom: 10 }}>
                            GPS Digital Address: <strong style={{ color: '#00F2FE' }}>{g.gpsAddress || g.user?.gpsAddress || user?.gpsAddress || 'Verified'}</strong> • Guaranteed Loans: {(g.loanGuarantors || []).length}
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {!g.agreementSigned && (
                              <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => handleSignGuarantorAgreement(g.id)}>
                                <CheckCircle2 size={14} /> Sign Digital Surety Agreement
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.76rem' }}
                              onClick={() => handleToggleGuarantorPenalty(g.id, !g.penaltyNotifyEnabled)}
                            >
                              <Bell size={14} /> {g.penaltyNotifyEnabled ? 'Penalty Alerts: ON' : 'Enable Penalty Alerts'}
                            </button>
                          </div>
                        </div>
                      ))
                    )
                  ) : payments.length === 0 ? (
                    <p style={{ color: '#94A3B8', fontSize: '0.84rem' }}>No repayments recorded yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {payments.slice(0, 5).map((p) => {
                        const dt = formatTxDateParts(p.paidAt || p.createdAt);
                        const refName = p.payerName || (p.loan?.member ? `${p.loan.member.firstName} ${p.loan.member.lastName}` : null) || p.loan?.loanNumber || 'Loan Repayment';
                        return (
                          <div key={p.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(0,242,254,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <div>
                              <strong style={{ fontSize: '0.88rem' }}>{p.transactionRef || p.receiptNumber || p.id.slice(0, 8)} — {refName}</strong>
                              <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>{p.method} • {p.loan?.loanNumber || 'Loan'}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{dt.full}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#34D399', fontSize: '0.9rem' }}>{formatGHS(p.amount)}</div>
                              <span className={`badge ${p.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>{p.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
                {isMemberOnly ? (
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.8rem', color: '#34D399' }}>
                    <strong>Borrower Applicant:</strong> {user?.firstName} {user?.lastName} ({user?.phone || user?.email}) — Self-Service Facility Application
                  </div>
                ) : (
                  <div>
                    <label className="gbs-label">Borrower / Member</label>
                    <select required className="gbs-select" value={newLoan.memberId} onChange={(e) => setNewLoan({ ...newLoan, memberId: e.target.value })}>
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
                {Number(newLoan.principalAmount) > 0 && Number(newLoan.termMonths) > 0 && (() => {
                  const selectedProd = loanProducts.find((p) => p.id === (newLoan.loanProductId || loanProducts[0]?.id)) || loanProducts[0];
                  const ratePct = Number(selectedProd?.interestRate || 15);
                  const principal = Number(newLoan.principalAmount);
                  const term = Math.max(1, Number(newLoan.termMonths));
                  const estTotal = principal + (principal * (ratePct / 100));
                  const estMonthly = estTotal / term;
                  return (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <span>Est. Monthly Installment: <strong style={{ color: '#F4E07B' }}>{formatGHS(estMonthly)}/mo</strong></span>
                      <span>Total Repayable ({ratePct}%): <strong style={{ color: '#00F2FE' }}>{formatGHS(estTotal)}</strong></span>
                    </div>
                  );
                })()}
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
                    <option value="DISBURSED">DISBURSED</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="OVERDUE">OVERDUE</option>
                    <option value="DEFAULTED">DEFAULTED</option>
                    <option value="PAID">PAID</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="REJECTED">REJECTED</option>
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((l) => (
                      <tr key={l.id} onClick={() => navigate(`/loans/${l.id}`)} style={{ cursor: 'pointer' }}>
                        <td><strong>{l.loanNumber}</strong></td>
                        <td>{l.member?.user?.firstName || user?.firstName} {l.member?.user?.lastName || user?.lastName}</td>
                        <td>{formatGHS(l.principalAmount)}</td>
                        <td><span className={`badge ${['APPROVED', 'DISBURSED', 'ONGOING', 'PAID'].includes(l.status) ? 'badge-success' : ['OVERDUE', 'DEFAULTED', 'REJECTED'].includes(l.status) ? 'badge-danger' : 'badge-warning'}`}>{l.status}</span></td>
                        <td style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.74rem' }}>
                            Open <ArrowUpRight size={12} />
                          </button>
                          {['DISBURSED', 'ONGOING', 'OVERDUE', 'APPROVED'].includes(l.status) && (
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                const outBal = Number(l.outstandingAmount ?? l.totalOutstanding ?? l.principalAmount ?? 0);
                                setNewPayment((prev) => ({
                                  ...prev,
                                  loanId: l.id,
                                  amount: outBal > 0 ? String(Math.min(outBal, Math.round((outBal / Math.max(1, Number(l.termMonths || 12))) * 100) / 100)) : prev.amount,
                                }));
                                navigate('/dashboard/tab/PAYMENTS');
                              }}
                            >
                              Pay
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredLoans.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                          No loan records match the current filter.
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
                      <option key={l.id} value={l.id}>{l.loanNumber} — {l.member?.user?.firstName || user?.firstName} ({formatGHS(l.outstandingAmount ?? l.totalOutstanding ?? l.principalAmount)})</option>
                    ))}
                  </select>
                </div>
                {newPayment.loanId && (() => {
                  const selLoan = loans.find((x) => x.id === newPayment.loanId);
                  if (!selLoan) return null;
                  const fullOut = Number(selLoan.outstandingAmount ?? selLoan.totalOutstanding ?? selLoan.principalAmount ?? 0);
                  const estInstallment = Math.max(1, Math.round((fullOut / Math.max(1, Number(selLoan.termMonths || 12))) * 100) / 100);
                  return (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                        onClick={() => setNewPayment((prev) => ({ ...prev, amount: String(estInstallment) }))}
                      >
                        Fill Est. Installment ({formatGHS(estInstallment)})
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                        onClick={() => setNewPayment((prev) => ({ ...prev, amount: String(fullOut) }))}
                      >
                        Fill Full Balance ({formatGHS(fullOut)})
                      </button>
                    </div>
                  );
                })()}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, color: '#00F2FE' }}>Payment &amp; Receipt Ledger ({filteredPayments.length})</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="gbs-input"
                    style={{ width: 155, padding: '6px 10px' }}
                    placeholder="Search receipt / loan..."
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                  />
                  <select
                    className="gbs-select"
                    style={{ width: 130, padding: '6px 10px' }}
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  >
                    <option value="">All Methods</option>
                    <option value="MOMO">MOMO</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="CASH">CASH</option>
                  </select>
                </div>
              </div>
              <div className="data-table-container" style={{ maxHeight: 420 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Reference &amp; Name</th>
                      <th>Day / Date / Month</th>
                      <th>Method</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const dt = formatTxDateParts(p.paidAt || p.createdAt);
                      const refName = p.payerName || (p.loan?.member ? `${p.loan.member.firstName} ${p.loan.member.lastName}` : null) || p.loan?.loanNumber || 'Customer Repayment';
                      return (
                        <tr key={p.id} onClick={() => navigate(`/payments/${p.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong>{p.transactionRef || p.receiptNumber || p.reference || p.id.slice(0, 8)}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>{refName}{p.loan?.loanNumber ? ` • ${p.loan.loanNumber}` : ''}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, color: '#F1F5F9', fontSize: '0.84rem' }}>{dt.day}, {dt.date}</div>
                            <div style={{ fontSize: '0.76rem', color: '#94A3B8' }}>{dt.month} • {dt.time}</div>
                          </td>
                          <td>{p.method}</td>
                          <td>{formatGHS(p.amount)}</td>
                          <td><span className={`badge ${p.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{p.status}</span></td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.78rem' }}>Inspect</button>
                            {p.method === 'CASH' && p.status !== 'COMPLETED' && (isFinance || isManagement) && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.76rem' }}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleApproveCashPayment(p.id);
                                }}
                              >
                                Approve Cash
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPayments.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                          No repayments match the current filter.
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
        {/* TAB: MEMBERS & KYC                                                    */}
        {/* ===================================================================== */}
        {activeTab === 'MEMBERS' && !isMemberOnly && !isGuarantorOnly && (
          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Register Borrower &amp; Mandatory GPS Digital Address</h3>
              <form onSubmit={handleCreateMember} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <LiveCameraCapture
                  label="Mandatory Borrower Live Camera Shot (Face ID)"
                  onCapture={(shot) => setNewMember((prev) => ({ ...prev, livePhoto: shot }))}
                  capturedImage={newMember.livePhoto}
                  required={true}
                />
                <div className="gbs-grid-2" style={{ gap: 10 }}>
                  <input type="text" required className="gbs-input" placeholder="First Name" value={newMember.firstName} onChange={(e) => setNewMember({ ...newMember, firstName: e.target.value })} />
                  <input type="text" required className="gbs-input" placeholder="Last Name" value={newMember.lastName} onChange={(e) => setNewMember({ ...newMember, lastName: e.target.value })} />
                </div>
                <input type="tel" required className="gbs-input" placeholder="Phone (+233...)" value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} />
                <input type="email" className="gbs-input" placeholder="Email (optional)" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} />
                <input type="text" className="gbs-input" placeholder="Ghana Card No. (GHA-...)" value={newMember.ghanaCardNumber} onChange={(e) => setNewMember({ ...newMember, ghanaCardNumber: e.target.value })} />
                <input type="text" required className="gbs-input" placeholder="GPS Digital Address (e.g. GA-183-8164)" value={newMember.gpsAddress} onChange={(e) => setNewMember({ ...newMember, gpsAddress: e.target.value })} />
                <input type="text" className="gbs-input" placeholder="Physical Street / Business Location" value={newMember.address} onChange={(e) => setNewMember({ ...newMember, address: e.target.value })} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newMember.isHidden} onChange={(e) => setNewMember({ ...newMember, isHidden: e.target.checked })} />
                  Mark customer confidential/hidden (locatable when searching phone or GPS address)
                </label>
                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Register Borrower Profile</button>
              </form>
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Borrowers Directory ({members.length})</h3>
              <form
                onSubmit={(e) => handleSearchMembers(e)}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}
              >
                <input
                  type="search"
                  className="gbs-input"
                  style={{ flex: 1, minWidth: 190 }}
                  placeholder="Search customer by name, phone, GPS address, MBR #, Ghana Card..."
                  value={memberSearchInput}
                  onChange={(e) => setMemberSearchInput(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  <input type="checkbox" checked={includeHiddenMembers} onChange={(e) => setIncludeHiddenMembers(e.target.checked)} />
                  Hidden
                </label>
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
                      <th style={{ width: 44 }}>Photo</th>
                      <th>Member #</th>
                      <th>Full Name</th>
                      <th>Phone / GPS Address</th>
                      <th>KYC Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const photo = m.user?.profilePicture || m.user?.metadata?.liveCameraShot;
                      return (
                        <tr key={m.id} onClick={() => navigate(`/members/${m.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            {photo ? (
                              <img
                                src={photo}
                                alt="Live Shot"
                                style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #D4AF37' }}
                              />
                            ) : (
                              <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                <Camera size={14} />
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{m.memberNumber}</strong>
                            {m.isHidden && <div><span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>HIDDEN</span></div>}
                          </td>
                          <td>{m.user?.firstName} {m.user?.lastName}</td>
                          <td>
                            <div>{m.user?.phone}</div>
                            <div style={{ fontSize: '0.72rem', color: '#00F2FE' }}>{m.gpsAddress || m.user?.gpsAddress || 'No GPS Addr'}</div>
                          </td>
                          <td><span className={`badge ${m.ghanaCardVerified ? 'badge-success' : 'badge-warning'}`}>{m.ghanaCardVerified ? 'KYC VERIFIED' : 'PENDING KYC'}</span></td>
                          <td style={{ display: 'flex', gap: 6 }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>Open</button>
                            {(m.user?.phone || m.gpsAddress) && (
                              <Link
                                to={`/dashboard/tab/FIELD_OPS?locate=${encodeURIComponent(m.user?.phone || m.gpsAddress || '')}`}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem', textDecoration: 'none' }}
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <MapPin size={12} /> Locate
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
          isGuarantorOnly ? (
            <div className="gbs-grid-2">
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>My Digital Surety Profile &amp; Agreement Controls</h3>
                {guarantors.length === 0 ? (
                  <div style={{ fontSize: '0.84rem', color: '#CBD5E1' }}>
                    Your Guarantor Portal account (<strong>{user?.firstName} {user?.lastName}</strong>) is active. When a Loan Officer links you as a surety to a borrower facility, your digital agreement and penalty alert controls will appear here.
                  </div>
                ) : (
                  guarantors.map((g) => (
                    <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ padding: 14, borderRadius: 10, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.28)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ fontSize: '0.96rem', color: '#F8FAFC' }}>{g.user?.firstName || user?.firstName} {g.user?.lastName || user?.lastName}</strong>
                          <span className={`badge ${g.agreementSigned ? 'badge-success' : 'badge-warning'}`}>
                            {g.agreementSigned ? 'DIGITAL SURETY SIGNED' : 'SIGNATURE REQUIRED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'grid', gap: 4 }}>
                          <div>Phone Contact: <strong>{g.user?.phone || user?.phone || 'N/A'}</strong></div>
                          <div>GPS Digital Address: <strong style={{ color: '#00F2FE' }}>{g.gpsAddress || g.user?.gpsAddress || user?.gpsAddress || 'N/A'}</strong></div>
                          <div>Ghana Card: <strong>{g.ghanaCardNumber || 'Verified on File'}</strong></div>
                          <div>Relationship: <strong>{g.relationship || 'Business / Family Surety'}</strong></div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {!g.agreementSigned && (
                          <button type="button" className="btn btn-primary" onClick={() => handleSignGuarantorAgreement(g.id)}>
                            <CheckCircle2 size={15} /> Sign Digital Surety Agreement
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleToggleGuarantorPenalty(g.id, !g.penaltyNotifyEnabled)}
                        >
                          <Bell size={15} /> {g.penaltyNotifyEnabled ? 'Disable Penalty SMS Alerts' : 'Enable Penalty SMS Alerts'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/guarantors/${g.id}`)}>
                          View Full Surety Dossier <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>
                  Loans I Have Guaranteed ({guarantors.reduce((acc, g) => acc + (g.loanGuarantors?.length || 0), 0)})
                </h3>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Loan #</th>
                        <th>Borrower</th>
                        <th>Principal</th>
                        <th>Status</th>
                        <th>Inspect</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guarantors.flatMap((g) => g.loanGuarantors || []).map((lg) => (
                        <tr key={lg.id} onClick={() => lg.loan?.id && navigate(`/loans/${lg.loan.id}`)} style={{ cursor: 'pointer' }}>
                          <td><strong>{lg.loan?.loanNumber || 'N/A'}</strong></td>
                          <td>{lg.loan?.member?.user?.firstName} {lg.loan?.member?.user?.lastName}</td>
                          <td>{formatGHS(lg.loan?.principalAmount)}</td>
                          <td><span className={`badge ${['APPROVED', 'DISBURSED', 'ONGOING', 'PAID'].includes(lg.loan?.status) ? 'badge-success' : 'badge-warning'}`}>{lg.loan?.status}</span></td>
                          <td>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>
                              Inspect <ArrowUpRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {guarantors.flatMap((g) => g.loanGuarantors || []).length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8', padding: 24 }}>
                            No guaranteed loan facilities currently linked.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="gbs-grid-2">
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}>Register Loan Guarantor (with GPS Address)</h3>
                <form onSubmit={handleCreateGuarantor} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <input type="text" required className="gbs-input" placeholder="First Name" value={newGuarantor.firstName} onChange={(e) => setNewGuarantor({ ...newGuarantor, firstName: e.target.value })} />
                    <input type="text" required className="gbs-input" placeholder="Last Name" value={newGuarantor.lastName} onChange={(e) => setNewGuarantor({ ...newGuarantor, lastName: e.target.value })} />
                  </div>
                  <input type="tel" required className="gbs-input" placeholder="Mobile Phone (+233...)" value={newGuarantor.phone} onChange={(e) => setNewGuarantor({ ...newGuarantor, phone: e.target.value })} />
                  <input type="email" className="gbs-input" placeholder="Email (optional)" value={newGuarantor.email} onChange={(e) => setNewGuarantor({ ...newGuarantor, email: e.target.value })} />
                  <input type="text" required className="gbs-input" placeholder="GPS Digital Address (e.g. GA-492-1180)" value={newGuarantor.gpsAddress} onChange={(e) => setNewGuarantor({ ...newGuarantor, gpsAddress: e.target.value })} />
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <input type="text" className="gbs-input" placeholder="Ghana Card No." value={newGuarantor.ghanaCardNumber} onChange={(e) => setNewGuarantor({ ...newGuarantor, ghanaCardNumber: e.target.value })} />
                    <input type="text" className="gbs-input" placeholder="Relationship" value={newGuarantor.relationship} onChange={(e) => setNewGuarantor({ ...newGuarantor, relationship: e.target.value })} />
                  </div>
                  <input type="text" className="gbs-input" placeholder="Residential / Work Physical Address" value={newGuarantor.address} onChange={(e) => setNewGuarantor({ ...newGuarantor, address: e.target.value })} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#CBD5E1', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newGuarantor.isHidden} onChange={(e) => setNewGuarantor({ ...newGuarantor, isHidden: e.target.checked })} />
                    Mark guarantor hidden (findable by Mobile Contact or GPS Digital Address)
                  </label>
                  <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>Save Guarantor Profile</button>
                </form>
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Registered Loan Guarantors ({guarantors.length})</h3>
                <form onSubmit={(e) => handleSearchGuarantors(e)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                  <input
                    type="search"
                    className="gbs-input"
                    style={{ flex: 1, minWidth: 180 }}
                    placeholder="Search guarantor by phone, GPS digital address, name..."
                    value={guarantorSearchInput}
                    onChange={(e) => setGuarantorSearchInput(e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#CBD5E1', cursor: 'pointer' }}>
                    <input type="checkbox" checked={includeHiddenGuarantors} onChange={(e) => setIncludeHiddenGuarantors(e.target.checked)} />
                    Hidden
                  </label>
                  <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>Find</button>
                </form>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone / GPS Address</th>
                        <th>Agreement</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guarantors.map((g) => (
                        <tr key={g.id} onClick={() => navigate(`/guarantors/${g.id}`)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong>{g.user?.firstName} {g.user?.lastName}</strong>
                            {g.isHidden && <div><span className="badge badge-danger" style={{ fontSize: '0.62rem' }}>HIDDEN</span></div>}
                          </td>
                          <td>
                            <div>{g.user?.phone}</div>
                            <div style={{ fontSize: '0.72rem', color: '#00F2FE' }}>{g.gpsAddress || g.user?.gpsAddress || 'No GPS Addr'}</div>
                          </td>
                          <td><span className={`badge ${g.agreementSigned ? 'badge-success' : 'badge-warning'}`}>{g.agreementSigned ? 'SIGNED' : 'UNSIGNED'}</span></td>
                          <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.75rem' }}>Manage</button>
                            {!g.agreementSigned && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleSignGuarantorAgreement(g.id);
                                }}
                              >
                                Sign
                              </button>
                            )}
                            {(g.user?.phone || g.gpsAddress) && (
                              <Link
                                to={`/dashboard/tab/FIELD_OPS?locate=${encodeURIComponent(g.user?.phone || g.gpsAddress || '')}`}
                                className="btn btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem', textDecoration: 'none' }}
                                onClick={(ev) => ev.stopPropagation()}
                              >
                                <MapPin size={12} /> Locate
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
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
        {/* TAB: HR STAFF, APPROVAL QUEUE, ATTENDANCE LOGS & PAYROLL              */}
        {/* ===================================================================== */}
        {activeTab === 'HR_PAYROLL' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 1. COMPANY OWNER: TIER-1 STAFF APPROVAL QUEUE */}
            {(isCompanyOwner || roleActions.canApproveStaff) && (
              <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#FBBF24', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={18} /> Company Owner Staff Approval Queue ({pendingStaff.length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                      Branch managers submit requests to employ new staff. Review candidate profiles, live camera reference shots, and grant approval for the branch manager to finalize.
                    </p>
                  </div>
                  <span className="badge badge-gold">TIER-1 OWNER APPROVAL</span>
                </div>

                {pendingStaff.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0 }}>
                    All newly created or registered institution staff have been reviewed.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingStaff.map((u) => {
                      const photo = u.profilePicture || u.metadata?.liveCameraShot;
                      const reqBy = u.metadata?.employedByBranchManagerName || u.metadata?.requestedByBranchManagerName || 'Branch Portal';
                      const stage = u.metadata?.approvalStage || 'PENDING_OWNER_APPROVAL';
                      const isOwnerApproved = stage === 'OWNER_APPROVED_AWAITING_BRANCH';

                      return (
                        <div key={u.id} style={{ padding: 14, borderRadius: 10, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {photo ? (
                              <img
                                src={photo}
                                alt="Live Shot"
                                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', border: '2px solid #D4AF37', cursor: 'pointer' }}
                                onClick={() => setSelectedStaffDossier({ user: u, ...u })}
                                title="Click to inspect live camera shot"
                              />
                            ) : (
                              <div style={{ width: 52, height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                                <Camera size={20} />
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.92rem' }}>
                                {u.firstName} {u.lastName} — <span className="badge badge-gold">{u.role}</span>
                                {isOwnerApproved && <span className="badge badge-cyan" style={{ marginLeft: 6 }}>OWNER APPROVED • AWAITING BRANCH</span>}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                                {u.email} • {u.phone} {u.gpsAddress ? `• GPS: ${u.gpsAddress}` : ''}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#38BDF8', marginTop: 2 }}>
                                Requesting Authority: <strong>{reqBy}</strong>
                                {u.metadata?.cameraCapturedAt && ` • Photo Captured: ${new Date(u.metadata.cameraCapturedAt).toLocaleDateString()}`}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {!isOwnerApproved && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                                onClick={() => handleOwnerApproveStaff(u.id)}
                              >
                                <CheckCircle2 size={14} /> Approve for Branch Manager
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              onClick={() => handleApprovePendingStaff(u.id, true)}
                            >
                              <ShieldCheck size={14} /> Direct Activate
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                              onClick={() => handleApprovePendingStaff(u.id, false)}
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. BRANCH MANAGER: TIER-2 FINAL ACTIVATION QUEUE */}
            {(roleKey === 'BRANCH_MANAGER' || roleKey === 'OPERATIONS_MANAGER') && (
              <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(56, 189, 248, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#38BDF8', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <UserCheck size={18} /> Branch Manager Employment Final Sign-Off Queue
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                      Staff requests approved by the Company Owner appear here for your final branch sign-off and activation.
                    </p>
                  </div>
                  <span className="badge badge-cyan">TIER-2 BRANCH APPROVAL</span>
                </div>

                {pendingStaff.filter((u) => u.metadata?.approvalStage === 'OWNER_APPROVED_AWAITING_BRANCH').length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0 }}>
                    No staff currently awaiting final branch manager sign-off.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pendingStaff
                      .filter((u) => u.metadata?.approvalStage === 'OWNER_APPROVED_AWAITING_BRANCH')
                      .map((u) => {
                        const photo = u.profilePicture || u.metadata?.liveCameraShot;
                        return (
                          <div key={u.id} style={{ padding: 14, borderRadius: 10, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              {photo ? (
                                <img
                                  src={photo}
                                  alt="Live Shot"
                                  style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', border: '2px solid #38BDF8', cursor: 'pointer' }}
                                  onClick={() => setSelectedStaffDossier({ user: u, ...u })}
                                />
                              ) : (
                                <div style={{ width: 50, height: 50, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Camera size={20} />
                                </div>
                              )}
                              <div>
                                <div style={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.92rem' }}>
                                  {u.firstName} {u.lastName} — <span className="badge badge-gold">{u.role}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: 3 }}>
                                  {u.email} • {u.phone} {u.gpsAddress ? `• GPS: ${u.gpsAddress}` : ''}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#10B981', marginTop: 2 }}>
                                  ✓ Company Owner Approved on: {u.metadata?.ownerApprovedAt ? new Date(u.metadata.ownerApprovedAt).toLocaleString() : 'Recent'}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                              onClick={() => handleBranchApproveStaff(u.id)}
                            >
                              <CheckCircle2 size={15} /> Final Branch Approval &amp; Activate Staff
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* 3. COMPANY OWNER: BRANCH MANAGER EMPLOYED STAFF DIRECTORY & VERIFICATION */}
            {isCompanyOwner && (
              <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={18} /> Branch Manager Employed Staff Directory &amp; Verification ({branchApprovedStaff.length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                      Live directory of new staff employed or approved by Branch Managers. Inspect candidate profile details, live camera reference shots, and verify employee dossiers.
                    </p>
                  </div>
                  <span className="badge badge-success">OWNER VERIFICATION ACTIVE</span>
                </div>

                {branchApprovedStaff.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0 }}>
                    No branch-employed staff records found yet.
                  </p>
                ) : (
                  <div className="data-table-container" style={{ maxHeight: 420 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Live Shot</th>
                          <th>Employee</th>
                          <th>Role &amp; Department</th>
                          <th>Salary</th>
                          <th>Employed By (BM)</th>
                          <th>GPS Address</th>
                          <th>Verification Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchApprovedStaff.map((s) => {
                          const photo = s.user?.profilePicture || s.user?.metadata?.liveCameraShot || s.metadata?.liveCameraShot;
                          const bmName = s.metadata?.employedByBranchManagerName || s.user?.metadata?.employedByBranchManagerName || 'Branch Manager';
                          const isVerified = Boolean(s.metadata?.ownerVerifiedAt || s.user?.metadata?.ownerVerifiedAt);
                          const verifiedAt = s.metadata?.ownerVerifiedAt || s.user?.metadata?.ownerVerifiedAt;

                          return (
                            <tr key={s.id} onClick={() => setSelectedStaffDossier(s)} style={{ cursor: 'pointer' }}>
                              <td>
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt="Live Shot"
                                    style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid #10B981' }}
                                  />
                                ) : (
                                  <div style={{ width: 40, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Camera size={16} />
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong>{s.user?.firstName} {s.user?.lastName}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{s.user?.email} • {s.user?.phone}</div>
                              </td>
                              <td>
                                <div><span className="badge badge-gold">{s.user?.role || 'STAFF'}</span></div>
                                <div style={{ fontSize: '0.72rem', color: '#CBD5E1' }}>{s.department} • {s.position}</div>
                              </td>
                              <td>{formatGHS(s.baseSalary)}</td>
                              <td>
                                <strong style={{ color: '#38BDF8' }}>{bmName}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{s.branch?.name || 'Main Branch'}</div>
                              </td>
                              <td style={{ fontSize: '0.74rem', color: '#00F2FE' }}>
                                {s.gpsAddress || s.user?.gpsAddress || '—'}
                              </td>
                              <td>
                                {isVerified ? (
                                  <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={11} /> Verified {verifiedAt ? new Date(verifiedAt).toLocaleDateString() : ''}
                                  </span>
                                ) : (
                                  <span className="badge badge-warning">Awaiting Owner Verification</span>
                                )}
                              </td>
                              <td onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                                {!isVerified && (
                                  <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                    onClick={() => handleVerifyEmployment(s.id)}
                                  >
                                    <CheckCircle2 size={13} /> Verify Dossier
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                  onClick={() => setSelectedStaffDossier(s)}
                                >
                                  Dossier
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="gbs-grid-2">
              {canCreateStaff && (
                <div className="glass-panel" style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><UserPlus size={16} /> Create New Staff Account (All {ROLES_META.length} Roles + GPS Address)</h3>
                  <form onSubmit={handleCreateStaffAccount} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <LiveCameraCapture
                      label="Mandatory Staff Live Camera Shot (Employment Reference)"
                      onCapture={(shot) => setNewStaffForm((prev) => ({ ...prev, livePhoto: shot }))}
                      capturedImage={newStaffForm.livePhoto}
                      required={true}
                    />
                    <div className="gbs-grid-2" style={{ gap: 10 }}>
                      <input type="text" required className="gbs-input" placeholder="First Name" value={newStaffForm.firstName} onChange={(e) => setNewStaffForm({ ...newStaffForm, firstName: e.target.value })} />
                      <input type="text" required className="gbs-input" placeholder="Last Name" value={newStaffForm.lastName} onChange={(e) => setNewStaffForm({ ...newStaffForm, lastName: e.target.value })} />
                    </div>
                    <div className="gbs-grid-2" style={{ gap: 10 }}>
                      <input type="email" required className="gbs-input" placeholder="Work Email" value={newStaffForm.email} onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })} />
                      <input type="tel" required className="gbs-input" placeholder="Phone (+233...)" value={newStaffForm.phone} onChange={(e) => setNewStaffForm({ ...newStaffForm, phone: e.target.value })} />
                    </div>
                    <div className="gbs-grid-2" style={{ gap: 10 }}>
                      <select className="gbs-select" value={newStaffForm.role} onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}>
                        {ROLES_META.map((rm) => (
                          <option key={rm.key} value={rm.key}>{rm.title} ({rm.key})</option>
                        ))}
                      </select>
                      <input type="text" required className="gbs-input" placeholder="Staff GPS Address (e.g. GA-183-8164)" value={newStaffForm.gpsAddress} onChange={(e) => setNewStaffForm({ ...newStaffForm, gpsAddress: e.target.value })} />
                    </div>
                    <div className="gbs-grid-2" style={{ gap: 10 }}>
                      <input type="text" className="gbs-input" placeholder="Department (e.g. CREDIT)" value={newStaffForm.department} onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })} />
                      <input type="number" min="0" className="gbs-input" placeholder="Monthly Base Salary (GHS)" value={newStaffForm.baseSalary} onChange={(e) => setNewStaffForm({ ...newStaffForm, baseSalary: e.target.value })} />
                    </div>
                    <div className="gbs-password-wrap">
                      <input
                        type={showStaffPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        className="gbs-input gbs-input-with-eye"
                        placeholder="Initial Staff Password (min 6 chars)"
                        value={newStaffForm.password}
                        onChange={(e) => setNewStaffForm({ ...newStaffForm, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="gbs-password-toggle"
                        aria-label={showStaffPass ? 'Hide password' : 'Show password'}
                        onClick={() => setShowStaffPass((v) => !v)}
                      >
                        {showStaffPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button type="submit" disabled={creatingStaff} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                      <UserPlus size={15} /> {creatingStaff ? 'Creating Staff...' : isCompanyOwner ? 'Create & Activate Staff' : 'Create Staff (Queue for Owner Approval)'}
                    </button>
                  </form>
                </div>
              )}

              <div className="glass-panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ margin: 0, color: '#D4AF37' }}>Staff Roster ({staffList.length})</h3>
                  <button type="button" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={handleGeneratePayroll}>
                    Generate Monthly Payroll
                  </button>
                </div>
                <form onSubmit={(e) => handleSearchStaff(e)} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                  <input
                    type="search"
                    className="gbs-input"
                    style={{ flex: 1, minWidth: 160 }}
                    placeholder="Find staff by name, mobile, GPS address, ID..."
                    value={staffSearchInput}
                    onChange={(e) => setStaffSearchInput(e.target.value)}
                  />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.74rem', color: '#CBD5E1', cursor: 'pointer' }}>
                    <input type="checkbox" checked={includeHiddenStaff} onChange={(e) => setIncludeHiddenStaff(e.target.checked)} />
                    Hidden
                  </label>
                  <button type="submit" className="btn btn-secondary" style={{ padding: '7px 12px' }}>Find</button>
                </form>
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}>Photo</th>
                        <th>Employee</th>
                        <th>Role / GPS Addr</th>
                        <th>Salary</th>
                        <th>Locate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((s) => {
                        const photo = s.user?.profilePicture || s.user?.metadata?.liveCameraShot || s.metadata?.liveCameraShot;
                        return (
                          <tr key={s.id} onClick={() => navigate(`/staff/${s.id}`)} style={{ cursor: 'pointer' }}>
                            <td>
                              {photo ? (
                                <img
                                  src={photo}
                                  alt="Live Shot"
                                  style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', border: '1px solid #D4AF37' }}
                                />
                              ) : (
                                <div style={{ width: 34, height: 34, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Camera size={14} />
                                </div>
                              )}
                            </td>
                            <td><strong>{s.user?.firstName} {s.user?.lastName}</strong></td>
                            <td>
                              <div>{s.department} ({s.position})</div>
                              <div style={{ fontSize: '0.72rem', color: '#00F2FE' }}>{s.user?.gpsAddress || s.gpsAddress || 'No GPS Addr'}</div>
                            </td>
                            <td>{formatGHS(s.baseSalary)}</td>
                            <td>
                              {(s.user?.phone || s.user?.gpsAddress || s.gpsAddress) ? (
                                <Link
                                  to={`/dashboard/tab/FIELD_OPS?locate=${encodeURIComponent(s.user?.phone || s.user?.gpsAddress || s.gpsAddress || '')}`}
                                  className="btn btn-primary"
                                  style={{ padding: '4px 8px', fontSize: '0.74rem', textDecoration: 'none' }}
                                  onClick={(ev) => ev.stopPropagation()}
                                >
                                  <MapPin size={12} /> Locate
                                </Link>
                              ) : (
                                <button type="button" className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.74rem' }}>Open</button>
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

            <div className="gbs-grid-2">
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#10B981' }}>Daily Staff Clock In / Clock Out Logs ({attendanceLogs.length})</h3>
                <div className="data-table-container" style={{ maxHeight: 320 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Date</th>
                        <th>Clock In / Out</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceLogs.map((a) => (
                        <tr key={a.id}>
                          <td><strong>{a.staffName || a.userEmail || 'Staff'}</strong></td>
                          <td>{a.workDate}</td>
                          <td>
                            {new Date(a.clockInAt).toLocaleTimeString()} → {a.clockOutAt ? new Date(a.clockOutAt).toLocaleTimeString() : 'Active'}
                            {a.durationMinutes != null ? ` (${a.durationMinutes}m)` : ''}
                          </td>
                          <td><span className={`badge ${a.status === 'CLOCKED_OUT' ? 'badge-success' : 'badge-cyan'}`}>{a.status}</span></td>
                        </tr>
                      ))}
                      {attendanceLogs.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#94A3B8', padding: 18 }}>No attendance shifts logged yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}>Monthly Salary Ledger ({salaries.length})</h3>
                <div className="data-table-container" style={{ maxHeight: 320 }}>
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
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB: ACCOUNTANT AUDITING & COMPANY OWNER SIGN-OFF                     */}
        {/* ===================================================================== */}
        {activeTab === 'ACCOUNTING_AUDIT' && (isFinance || isManagement || isRiskLegal) && (
          <AccountingAuditPanel userRole={roleKey} />
        )}

        {/* ===================================================================== */}
        {/* TAB: COMPANY BRANDING, SUBSCRIPTIONS & CCTV MOBILE LINKING            */}
        {/* ===================================================================== */}
        {activeTab === 'BRANDING_CCTV' && canBrandCompany && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="gbs-grid-2">
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 10px', color: '#D4AF37' }}><Building2 size={16} /> Company Name &amp; Logo Branding</h3>
                <p style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 12 }}>
                  Update your institution&rsquo;s exact operating name and upload your company logo. Your branding reflects immediately across all dashboards for your organization (excluding the core GBS Developer Portal).
                </p>
                <form onSubmit={handleUpdateBranding} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="gbs-label">Registered Company Name</label>
                    <input
                      type="text"
                      required
                      className="gbs-input"
                      value={brandingForm.name}
                      onChange={(e) => setBrandingForm({ ...brandingForm, name: e.target.value })}
                      placeholder="Enter your official institution name"
                    />
                  </div>
                  <div>
                    <label className="gbs-label">Company Logo Image (PNG / JPG / WEBP)</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="gbs-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setBrandingForm({
                          ...brandingForm,
                          logoFile: f,
                          logoPreview: f ? URL.createObjectURL(f) : brandingForm.logoPreview,
                        });
                      }}
                    />
                  </div>
                  {brandingForm.logoPreview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={brandingForm.logoPreview} alt="Company Logo Preview" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid #D4AF37' }} />
                      <span style={{ fontSize: '0.78rem', color: '#34D399' }}>Active logo preview</span>
                    </div>
                  )}
                  <button type="submit" disabled={savingBranding} className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    {savingBranding ? 'Updating Branding...' : 'Save Company Name & Logo'}
                  </button>
                </form>
              </div>

              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 10px', color: '#00F2FE' }}><Clock size={16} /> Subscription Plan &amp; Trial Renewal</h3>
                <p style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 12 }}>
                  Active Plan: <strong>{tenantProfile?.subscriptionPlan || countdown?.subscriptionPlan || 'TRIAL_1M'}</strong>{' '}
                  ({tenantProfile?.isLifetime ? 'LIFETIME' : `${tenantProfile?.daysLeft ?? countdown?.daysLeft ?? 30} days remaining`}).
                  Choose a subscription duration after or during your 1-month free trial:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
                  {[
                    { code: 'PLAN_3M', label: '3 Months', sub: '90 Days Access' },
                    { code: 'PLAN_6M', label: '6 Months', sub: '180 Days Access' },
                    { code: 'PLAN_9M', label: '9 Months', sub: '270 Days Access' },
                    { code: 'PLAN_12M', label: '12 Months', sub: '365 Days Access' },
                    { code: 'LIFETIME', label: 'Lifetime License', sub: 'Permanent Unlock' },
                  ].map((plan) => (
                    <button
                      key={plan.code}
                      type="button"
                      disabled={upgradingPlan === plan.code}
                      onClick={() => handleSelectSubscription(plan.code)}
                      className={(tenantProfile?.subscriptionPlan || countdown?.subscriptionPlan) === plan.code ? 'btn btn-primary' : 'btn btn-secondary'}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '12px' }}
                    >
                      <strong style={{ fontSize: '0.88rem' }}>{plan.label}</strong>
                      <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>{upgradingPlan === plan.code ? 'Applying...' : plan.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <CctvMobilePanel />
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
                      {['PENDING', 'PENDING_MANAGER_APPROVAL'].includes(req.status) && isManagement && (
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
                {cases.map((c) => (
                  <div key={c.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(0,242,254,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#F4E07B' }}>
                        [{c.category || c.caseType || 'COMPLIANCE'}] {c.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`badge ${c.severity === 'CRITICAL' || c.severity === 'HIGH' ? 'badge-danger' : 'badge-gold'}`}>{c.severity}</span>
                        <span className={`badge ${c.status === 'RESOLVED' ? 'badge-success' : 'badge-cyan'}`}>{c.status || 'OPEN'}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: 8 }}>{c.description}</div>
                    {c.status !== 'RESOLVED' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status !== 'INVESTIGATING' && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleUpdateCaseStatus(c.id, 'INVESTIGATING')}>
                            Mark Investigating
                          </button>
                        )}
                        <button type="button" className="btn btn-primary" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleUpdateCaseStatus(c.id, 'RESOLVED')}>
                          <CheckCircle2 size={12} /> Resolve Case
                        </button>
                      </div>
                    )}
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
                <div className="gbs-grid-2" style={{ gap: 10 }}>
                  <input type="text" required className="gbs-input" placeholder="Customer / Visitor Name" value={newTicket.requesterName} onChange={(e) => setNewTicket({ ...newTicket, requesterName: e.target.value })} />
                  <input type="tel" className="gbs-input" placeholder="Customer Phone (+233...)" value={newTicket.requesterPhone} onChange={(e) => setNewTicket({ ...newTicket, requesterPhone: e.target.value })} />
                </div>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
                {tickets.map((t) => (
                  <div key={t.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong>{t.ticketNumber ? `${t.ticketNumber} — ` : ''}{t.subject}</strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-cyan">{t.priority || 'NORMAL'}</span>
                        <span className={`badge ${t.status === 'RESOLVED' ? 'badge-success' : 'badge-gold'}`}>{t.status}</span>
                      </div>
                    </div>
                    {t.requesterName && (
                      <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: 2 }}>
                        Requester: {t.requesterName}{t.requesterPhone ? ` (${t.requesterPhone})` : ''}
                      </div>
                    )}
                    <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: 4, marginBottom: 8 }}>{t.description}</div>
                    {t.status !== 'RESOLVED' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {t.status !== 'IN_PROGRESS' && (
                          <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleUpdateTicketStatus(t.id, 'IN_PROGRESS')}>
                            In Progress
                          </button>
                        )}
                        <button type="button" className="btn btn-primary" style={{ padding: '4px 9px', fontSize: '0.72rem' }} onClick={() => handleUpdateTicketStatus(t.id, 'RESOLVED')}>
                          <CheckCircle2 size={12} /> Resolve Ticket
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Customer & Staff Feedbacks & Resolution Center */}
            <div className="glass-panel" style={{ padding: 20, gridColumn: 'span 2', borderColor: 'rgba(212, 175, 55, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquare size={18} /> Customer &amp; Staff Feedbacks &amp; Inquiry Responses ({feedbacks.length})
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#94A3B8' }}>
                    Direct system feedbacks, user satisfaction ratings, and issue reports submitted across all portals. Respond to customers or staff instantly.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                  onClick={() => setShowFeedbackModal(true)}
                >
                  <Plus size={14} /> Submit New Feedback
                </button>
              </div>

              {feedbacks.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: '0.84rem', margin: 0 }}>
                  No customer or staff feedback submissions received yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {feedbacks.map((fb) => {
                    const isResponded = fb.status === 'RESPONDED' || Boolean(fb.response);
                    return (
                      <div key={fb.id} style={{ padding: 14, borderRadius: 10, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ color: '#F1F5F9', fontSize: '0.9rem' }}>{fb.name || 'Anonymous User'}</strong>
                              {fb.userRole && <span className="badge badge-gold">{fb.userRole}</span>}
                              <span className="badge badge-cyan">{fb.category || 'GENERAL'}</span>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: 2 }}>
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

                        <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginBottom: 10, lineHeight: 1.4, background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 6 }}>
                          {fb.message}
                        </div>

                        {isResponded ? (
                          <div style={{ padding: 10, borderRadius: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', fontSize: '0.78rem' }}>
                            <div style={{ color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <CheckCircle2 size={13} /> Official Management Response
                              {fb.respondedAt && <span style={{ color: '#94A3B8', fontWeight: 400 }}>({new Date(fb.respondedAt).toLocaleString()})</span>}
                            </div>
                            <div style={{ color: '#F1F5F9' }}>{fb.response}</div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <input
                              type="text"
                              className="gbs-input"
                              placeholder="Type management response to user feedback..."
                              style={{ flex: 1, fontSize: '0.8rem' }}
                              value={feedbackReplyText[fb.id] || ''}
                              onChange={(e) => setFeedbackReplyText((prev) => ({ ...prev, [fb.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRespondFeedback(fb.id); }}
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={respondingFeedbackId === fb.id}
                              style={{ padding: '8px 14px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                              onClick={() => handleRespondFeedback(fb.id)}
                            >
                              {respondingFeedbackId === fb.id ? 'Sending...' : 'Send Response'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
                <div key={c.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', marginBottom: 6, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{c.name}</strong> <span className="badge badge-cyan" style={{ fontSize: '0.64rem', marginLeft: 4 }}>{c.channel}</span>
                  </div>
                  <div style={{ color: '#CBD5E1' }}>
                    Budget: <strong>{formatGHS(c.budget)}</strong> • Leads/Reach: <strong>{c.leadsCount ?? c.reachCount ?? 0}</strong>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><Briefcase size={16} /> Institutional Investors &amp; Yield ({investors.length})</h3>
              {(isFinance || isManagement || roleKey === 'INVESTOR') && (
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
                <div key={inv.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', marginBottom: 6, fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <strong>{inv.investorName}</strong>
                    {inv.investorCode && <span style={{ fontSize: '0.72rem', color: '#94A3B8', marginLeft: 6 }}>({inv.investorCode})</span>}
                  </div>
                  <div>
                    <strong style={{ color: '#34D399' }}>{formatGHS(inv.committedCapital ?? inv.investedAmount)}</strong> @ <span className="badge badge-gold">{inv.annualYieldRate ?? inv.interestRate ?? 18.5}% APR</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB: COMPANY OWNER / MANAGEMENT STAFF BROADCAST & SELECTIVE MESSAGING */}
        {/* ===================================================================== */}
        {activeTab === 'STAFF_COMMS' && !isMemberOnly && !isGuarantorOnly && (
          <div className="gbs-grid-2">
            {isManagement && (
              <div className="glass-panel" style={{ padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', color: '#D4AF37' }}><Send size={16} /> Send General or Selected Staff Message</h3>
                <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={broadcastForm.sendToAll}
                        onChange={() => setBroadcastForm({ ...broadcastForm, sendToAll: true, recipientUserIds: [] })}
                      />
                      General Notice (All Staff)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        checked={!broadcastForm.sendToAll}
                        onChange={() => setBroadcastForm({ ...broadcastForm, sendToAll: false })}
                      />
                      Selected Staff Members
                    </label>
                  </div>

                  {!broadcastForm.sendToAll && (
                    <div style={{ maxHeight: 140, overflowY: 'auto', padding: 8, borderRadius: 8, background: 'rgba(6,12,24,0.75)', border: '1px solid rgba(0,242,254,0.2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 6 }}>
                      {staffList.filter((s) => s.user?.id).map((s) => {
                        const uid = s.user.id;
                        const checked = broadcastForm.recipientUserIds.includes(uid);
                        return (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...broadcastForm.recipientUserIds, uid]
                                  : broadcastForm.recipientUserIds.filter((id) => id !== uid);
                                setBroadcastForm({ ...broadcastForm, recipientUserIds: next });
                              }}
                            />
                            {s.user.firstName} {s.user.lastName}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <input type="text" required className="gbs-input" placeholder="Message Subject / Title" value={broadcastForm.title} onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })} />
                    <select className="gbs-select" value={broadcastForm.priority} onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}>
                      <option value="NORMAL">Priority: NORMAL</option>
                      <option value="HIGH">Priority: HIGH</option>
                      <option value="URGENT">Priority: URGENT</option>
                    </select>
                  </div>
                  <textarea rows={4} required className="gbs-textarea" placeholder="Write directive or operational announcement for staff..." value={broadcastForm.message} onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })} />
                  <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                    <Send size={15} /> {broadcastForm.sendToAll ? 'Broadcast to All Staff' : 'Send to Selected Staff'}
                  </button>
                </form>
              </div>
            )}

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}><Bell size={16} /> Staff Communications Inbox ({broadcastInbox.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
                {broadcastInbox.map((b) => (
                  <div key={b.id} style={{ padding: 12, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(212,175,55,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ color: '#F4E07B', fontSize: '0.86rem' }}>{b.title || b.subject}</strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span className="badge badge-cyan">{b.targetScope === 'ALL_STAFF' ? 'ALL STAFF' : 'SELECTED'}</span>
                        <span className="badge badge-gold">{b.priority}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#E2E8F0', marginBottom: 6 }}>{b.message || b.body}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      From: {b.senderName || 'Management'} ({b.senderRole || 'OWNER'}) • {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {broadcastInbox.length === 0 && (
                  <p style={{ color: '#94A3B8', fontSize: '0.84rem' }}>No internal staff announcements sent yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB: VIDEO MEETINGS & WRAPPED WEEKLY/MONTHLY/YEARLY REPORTS           */}
        {/* ===================================================================== */}
        {activeTab === 'MEETINGS_REPORTS' && !isMemberOnly && !isGuarantorOnly && (
          <div className="gbs-grid-2">
            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', color: '#00F2FE' }}><Video size={16} /> Executive &amp; Staff Online Meetings ({meetings.length})</h3>
              {isManagement && (
                <form onSubmit={handleScheduleMeeting} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <input type="text" required className="gbs-input" placeholder="Credit Committee / Executive Briefing / Daily Standup" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })} />
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <input type="datetime-local" className="gbs-input" value={newMeeting.scheduledAt} onChange={(e) => setNewMeeting({ ...newMeeting, scheduledAt: e.target.value })} />
                    <select className="gbs-select" value={newMeeting.audienceType} onChange={(e) => setNewMeeting({ ...newMeeting, audienceType: e.target.value })}>
                      <option value="ALL_STAFF">All Company Staff</option>
                      <option value="EXECUTIVES_ONLY">Executives &amp; Managers Only</option>
                      <option value="SELECTED_PARTICIPANTS">Selected Participants</option>
                    </select>
                  </div>
                  {newMeeting.audienceType === 'SELECTED_PARTICIPANTS' && (
                    <div style={{ maxHeight: 110, overflowY: 'auto', padding: 8, borderRadius: 8, background: 'rgba(6,12,24,0.75)', border: '1px solid rgba(0,242,254,0.2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: 6 }}>
                      {staffList.filter((s) => s.user?.id).map((s) => {
                        const uid = s.user.id;
                        const checked = newMeeting.participantUserIds.includes(uid);
                        return (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const next = e.target.checked
                                  ? [...newMeeting.participantUserIds, uid]
                                  : newMeeting.participantUserIds.filter((id) => id !== uid);
                                setNewMeeting({ ...newMeeting, participantUserIds: next });
                              }}
                            />
                            {s.user.firstName} {s.user.lastName}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary">Schedule Online Meeting Room</button>
                </form>
              )}
              {meetings.map((m) => (
                <div key={m.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(0,242,254,0.2)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{m.topic || m.title}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                      Host: {m.hostName || 'Management'} • {m.targetScope || 'ALL_STAFF'} • {new Date(m.startTime || m.scheduledAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {m.joinUrl && (
                      <a href={m.joinUrl} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.75rem' }}>
                        Join Room
                      </a>
                    )}
                    {isManagement && (
                      <button
                        type="button"
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                        onClick={() => handleCancelMeeting(m.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 10px', color: '#D4AF37' }}><Download size={16} /> Wrap &amp; Save Weekly / Monthly / Yearly Reports</h3>
              <p style={{ fontSize: '0.8rem', color: '#CBD5E1', marginBottom: 12 }}>
                Roll up all staff-collected loans, repayments, customer registrations, field visits &amp; attendance shifts into saved snapshots in PostgreSQL.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {['WEEKLY', 'MONTHLY', 'YEARLY'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={wrappingPeriod === p}
                    onClick={() => handleWrapReportPeriod(p)}
                    className="btn btn-primary"
                    style={{ padding: '7px 13px', fontSize: '0.78rem' }}
                  >
                    {wrappingPeriod === p ? `Wrapping ${p}...` : `Wrap & Save ${p} Report`}
                  </button>
                ))}
              </div>

              {reportSnapshots.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                  {reportSnapshots.slice(0, 8).map((snap) => (
                    <div key={snap.id} style={{ padding: 10, borderRadius: 8, background: 'rgba(6,12,24,0.85)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ fontSize: '0.8rem', color: '#34D399' }}>[{snap.periodType || snap.reportType}] {snap.periodLabel || snap.reportType}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Saved {new Date(snap.createdAt).toLocaleString()}</div>
                      </div>
                      <button type="button" className="btn btn-secondary" style={{ padding: '4px 9px', fontSize: '0.74rem' }} onClick={() => handleDownloadWrappedCsv(snap.id, snap.periodLabel)}>
                        <Download size={12} /> CSV
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <h4 style={{ margin: '0 0 10px', color: '#00F2FE', fontSize: '0.9rem' }}>Live Ledger Exports (CSV, XLSX, PDF)</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { type: 'loans', label: 'Loan Portfolio & Disbursement Ledger' },
                  { type: 'payments', label: 'MoMo, Bank & Cash Repayments Statement' },
                  { type: 'members', label: 'Borrower KYC & Registration Directory' },
                  { type: 'audit', label: 'Immutable Governance & Security Audit Trail' },
                ].map((rep) => (
                  <div key={rep.type} style={{ padding: 10, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{rep.label}</span>
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

      {/* Floating Feedback Trigger & Submission Modal */}
      <FeedbackFloatingTrigger onClick={() => setShowFeedbackModal(true)} />
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => {
          setShowFeedbackModal(false);
          loadDashboardData();
        }}
      />

      {/* Staff Employment Dossier & Live Camera Shot Verification Modal */}
      {selectedStaffDossier && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedStaffDossier(null)}
        >
          <div
            style={{
              background: '#0B132B',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: 16,
              maxWidth: 580,
              width: '100%',
              padding: 24,
              boxShadow: '0 25px 60px rgba(0,0,0,0.7)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, color: '#D4AF37', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck size={20} /> Verified Employee Dossier
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Live Camera Shot &amp; Employment Authorization</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '50%' }}
                onClick={() => setSelectedStaffDossier(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Live Camera Shot Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
              {selectedStaffDossier.profilePicture || selectedStaffDossier.user?.profilePicture || selectedStaffDossier.metadata?.liveCameraShot || selectedStaffDossier.user?.metadata?.liveCameraShot ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={selectedStaffDossier.profilePicture || selectedStaffDossier.user?.profilePicture || selectedStaffDossier.metadata?.liveCameraShot || selectedStaffDossier.user?.metadata?.liveCameraShot}
                    alt="Live Reference Camera Shot"
                    style={{
                      width: 180,
                      height: 180,
                      borderRadius: 12,
                      objectFit: 'cover',
                      border: '3px solid #D4AF37',
                      boxShadow: '0 10px 25px rgba(212,175,55,0.3)',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: '#10B981',
                    fontSize: '0.68rem',
                    padding: '2px 8px',
                    borderRadius: 10,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <Camera size={10} /> Live Camera Reference
                  </div>
                </div>
              ) : (
                <div style={{
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <Camera size={32} />
                  <span style={{ fontSize: '0.74rem' }}>No Camera Shot</span>
                </div>
              )}
            </div>

            {/* Profile Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, fontSize: '0.84rem', marginBottom: 20 }}>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Full Name</span>
                <div style={{ fontWeight: 600, color: '#F1F5F9' }}>
                  {selectedStaffDossier.firstName || selectedStaffDossier.user?.firstName} {selectedStaffDossier.lastName || selectedStaffDossier.user?.lastName}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Assigned Role</span>
                <div><span className="badge badge-gold">{selectedStaffDossier.role || selectedStaffDossier.user?.role || 'STAFF'}</span></div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Department &amp; Position</span>
                <div style={{ color: '#CBD5E1' }}>
                  {selectedStaffDossier.department || 'OPERATIONS'} • {selectedStaffDossier.position || 'Staff'}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Monthly Base Salary</span>
                <div style={{ color: '#10B981', fontWeight: 600 }}>
                  {formatGHS(selectedStaffDossier.baseSalary || 2500)}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Work Email</span>
                <div style={{ color: '#F1F5F9' }}>{selectedStaffDossier.email || selectedStaffDossier.user?.email}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Phone Contact</span>
                <div style={{ color: '#F1F5F9' }}>{selectedStaffDossier.phone || selectedStaffDossier.user?.phone}</div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>GPS Digital Address</span>
                <div style={{ color: '#00F2FE' }}>
                  {selectedStaffDossier.gpsAddress || selectedStaffDossier.user?.gpsAddress || 'N/A'}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Branch Assignment</span>
                <div style={{ color: '#38BDF8' }}>
                  {selectedStaffDossier.branch?.name || 'Main Enterprise Branch'}
                </div>
              </div>
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.03)', gridColumn: 'span 2' }}>
                <span style={{ color: '#94A3B8', fontSize: '0.72rem' }}>Employed / Requested By</span>
                <div style={{ color: '#F1F5F9', fontWeight: 500 }}>
                  {selectedStaffDossier.metadata?.employedByBranchManagerName || selectedStaffDossier.user?.metadata?.employedByBranchManagerName || 'Branch Manager'}
                </div>
              </div>
            </div>

            {/* Owner Verification Action */}
            {isCompanyOwner && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedStaffDossier(null)}
                >
                  Close
                </button>
                {!(selectedStaffDossier.metadata?.ownerVerifiedAt || selectedStaffDossier.user?.metadata?.ownerVerifiedAt) && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={async () => {
                      await handleVerifyEmployment(selectedStaffDossier.id);
                      setSelectedStaffDossier(null);
                    }}
                  >
                    <CheckCircle2 size={16} /> Sign Off &amp; Verify Dossier
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <RoleVideoPresentationModal
        isOpen={roleVideoOpen}
        onClose={() => setRoleVideoOpen(false)}
        userRole={roleKey}
        isDeveloper={false}
      />
    </div>
  );
}
