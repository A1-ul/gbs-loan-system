import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Clock, AlertTriangle, ArrowLeft, Search, MapPin } from 'lucide-react';
import api from '../services/api';
import { ONBOARDING_META } from '../constants/rolesMeta';

/**
 * Public Multi-Tenant Institutional Onboarding Form + Application Tracker
 * Workflow: Institution applies -> Status: PENDING -> Lead Developer Approves -> 90-Day Trial Activated
 */
export default function TenantOnboarding() {
  const [tab, setTab] = useState('apply'); // 'apply' | 'track'
  const [form, setForm] = useState({
    organizationName: '',
    institutionType: 'MICROFINANCE',
    contactEmail: '',
    contactPhone: '',
    country: 'Ghana',
    region: 'Greater Accra',
    city: 'Accra',
    address: '',
    latitude: '5.6037',
    longitude: '-0.1870',
    registrationNumber: '',
    businessLicenseNumber: '',
    tinNumber: '',
    representativeName: '',
    representativeEmail: '',
    representativePhone: '',
    representativeRole: 'COMPANY_OWNER',
    password: '',
    planTier: 'ENTERPRISE',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [error, setError] = useState('');

  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupErr, setLookupErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmittedResult(null);
    try {
      const res = await api.post('/tenants/onboard', form);
      setSubmittedResult(res.data?.data || res.data);
      if (res.data?.data?.institutionId) {
        setLookupId(res.data.data.institutionId);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to submit onboarding application.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackStatus = async (e) => {
    e.preventDefault();
    setLookupErr('');
    setLookupResult(null);
    try {
      const res = await api.get(`/tenants/onboarding-status/${encodeURIComponent(lookupId.trim())}`);
      setLookupResult(res.data?.data || null);
    } catch (err) {
      setLookupErr(err.response?.data?.message || 'Application not found for that Institution ID or Code.');
    }
  };

  return (
    <div className="split-login-layout">
      {/* Left Real-Life Institutional Photo Pane */}
      <div className="split-login-photo-pane">
        <img src={ONBOARDING_META.loginImage} alt="Institutional Loan Onboarding" className="hero-photo" />
        <div className="split-login-photo-scrim" />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
            <ArrowLeft size={15} /> Back to Sign In
          </Link>
          <span className="badge badge-gold">Enterprise SaaS Onboarding</span>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>
            Deploy Your Institution on GBS Loan System
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#E2E8F0', maxWidth: 500, marginBottom: 18 }}>
            Every onboarded Credit Union, Microfinance, or Commercial Lending Institution receives isolated
            multi-tenant PostgreSQL schemas, 30 role dashboards, Mobile Money & Bank workflows, and Voice Identity Protection.
          </p>

          <div className="glass-panel" style={{ padding: 14, background: 'rgba(6,12,24,0.8)' }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#D4AF37', marginBottom: 6 }}>
              MANDATORY APPROVAL GOVERNANCE
            </div>
            <div style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>
              1. Submit KYB Registration → 2. GBS Developer Authority Reviews &amp; Approves → 3. 90-Day Trial Activated Live
            </div>
          </div>
        </div>
      </div>

      {/* Right Onboarding Form & Status Tracker */}
      <div className="split-login-form-pane">
        <div style={{ maxWidth: 600, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button
              type="button"
              onClick={() => setTab('apply')}
              className={tab === 'apply' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Building2 size={16} /> New Institutional Application
            </button>
            <button
              type="button"
              onClick={() => setTab('track')}
              className={tab === 'track' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              <Search size={16} /> Track Approval Status
            </button>
          </div>

          {tab === 'apply' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              {error && (
                <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#FCA5A5', fontSize: '0.84rem', display: 'flex', gap: 8 }}>
                  <AlertTriangle size={16} /> <span>{error}</span>
                </div>
              )}

              {submittedResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FBBF24' }}>
                    <Clock size={24} />
                    <h3 style={{ margin: 0 }}>Application Submitted — Awaiting Developer Approval</h3>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: '#CBD5E1' }}>
                    Your institution <strong>{submittedResult.name}</strong> is currently <strong>{submittedResult.onboardingStatus}</strong>.
                    Your 90-day trial countdown begins automatically once the Lead Developer approves your institution.
                  </p>
                  <div style={{ background: 'rgba(6,12,24,0.85)', padding: 14, borderRadius: 10, border: '1px solid rgba(212,175,55,0.25)', fontSize: '0.85rem' }}>
                    <div><strong>Tenant Code:</strong> {submittedResult.code || submittedResult.tenantCode}</div>
                    <div><strong>Institution ID:</strong> {submittedResult.institutionId}</div>
                    <div><strong>Admin Email:</strong> {submittedResult.representativeEmail || form.representativeEmail}</div>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => setTab('track')}>
                    Check Live Status Now
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Institution Name *</label>
                      <input type="text" required className="gbs-input" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} placeholder="Kumasi Trust MFI Ltd" />
                    </div>
                    <div>
                      <label className="gbs-label">Institution Type</label>
                      <select className="gbs-select" value={form.institutionType} onChange={(e) => setForm({ ...form, institutionType: e.target.value })}>
                        <option value="MICROFINANCE">Microfinance (MFI)</option>
                        <option value="CREDIT_UNION">Credit Union</option>
                        <option value="SAVINGS_AND_LOANS">Savings &amp; Loans</option>
                        <option value="COMMERCIAL_LENDER">Commercial Lender</option>
                      </select>
                    </div>
                  </div>

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Business Registration No.</label>
                      <input type="text" className="gbs-input" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="CS-2026-00912" />
                    </div>
                    <div>
                      <label className="gbs-label">Central Bank License / TIN</label>
                      <input type="text" className="gbs-input" value={form.businessLicenseNumber} onChange={(e) => setForm({ ...form, businessLicenseNumber: e.target.value })} placeholder="BoG-MFI-8821" />
                    </div>
                  </div>

                  <div className="gbs-grid-3" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">City</label>
                      <input type="text" className="gbs-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div>
                      <label className="gbs-label">Region</label>
                      <input type="text" className="gbs-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                    </div>
                    <div>
                      <label className="gbs-label">Country</label>
                      <input type="text" className="gbs-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                    </div>
                  </div>

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label"><MapPin size={12} /> HQ GPS Latitude</label>
                      <input type="text" className="gbs-input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                    </div>
                    <div>
                      <label className="gbs-label"><MapPin size={12} /> HQ GPS Longitude</label>
                      <input type="text" className="gbs-input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                    </div>
                  </div>

                  <hr style={{ borderColor: 'rgba(212,175,55,0.18)', margin: '4px 0' }} />

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Primary Admin Full Name *</label>
                      <input type="text" required className="gbs-input" value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} placeholder="Ama Boateng" />
                    </div>
                    <div>
                      <label className="gbs-label">Primary Role</label>
                      <select className="gbs-select" value={form.representativeRole} onChange={(e) => setForm({ ...form, representativeRole: e.target.value })}>
                        <option value="COMPANY_OWNER">Company Owner</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                      </select>
                    </div>
                  </div>

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Representative Email *</label>
                      <input type="email" required className="gbs-input" value={form.representativeEmail} onChange={(e) => setForm({ ...form, representativeEmail: e.target.value })} placeholder="owner@institution.com" />
                    </div>
                    <div>
                      <label className="gbs-label">Phone Number *</label>
                      <input type="tel" required className="gbs-input" value={form.representativePhone} onChange={(e) => setForm({ ...form, representativePhone: e.target.value })} placeholder="+233240000111" />
                    </div>
                  </div>

                  <div>
                    <label className="gbs-label">Initial Admin Password *</label>
                    <input type="password" required minLength={8} className="gbs-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                  </div>

                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 4 }}>
                    {submitting ? 'Submitting to Developer Authority...' : 'Submit Onboarding Application'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'track' && (
            <div className="glass-panel" style={{ padding: 24 }}>
              <form onSubmit={handleTrackStatus} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input
                  type="text"
                  required
                  className="gbs-input"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="Enter Tenant Code (TNT-xxxx) or Institution ID"
                />
                <button type="submit" className="btn btn-primary">Check</button>
              </form>

              {lookupErr && <div style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{lookupErr}</div>}

              {lookupResult && (
                <div style={{ background: 'rgba(6,12,24,0.85)', padding: 16, borderRadius: 10, border: '1px solid rgba(212,175,55,0.28)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#FFFFFF' }}>{lookupResult.name}</h3>
                    <span className={`badge ${['APPROVED', 'ACTIVE_TRIAL'].includes(lookupResult.onboardingStatus) ? 'badge-success' : lookupResult.onboardingStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                      {lookupResult.onboardingStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#CBD5E1', display: 'grid', gap: 4 }}>
                    <div><strong>Code:</strong> {lookupResult.code} • <strong>ID:</strong> {lookupResult.institutionId}</div>
                    <div><strong>Operational Status:</strong> {lookupResult.status}</div>
                    <div><strong>Remaining Trial Days:</strong> {lookupResult.daysLeft ?? 90} days</div>
                    {lookupResult.rejectionReason && (
                      <div style={{ color: '#FCA5A5' }}><strong>Rejection Note:</strong> {lookupResult.rejectionReason}</div>
                    )}
                  </div>
                  {['APPROVED', 'ACTIVE_TRIAL'].includes(lookupResult.onboardingStatus) && (
                    <Link to="/login/company-owner" className="btn btn-primary" style={{ marginTop: 14 }}>
                      <CheckCircle2 size={16} /> Proceed to Institution Owner Login
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
