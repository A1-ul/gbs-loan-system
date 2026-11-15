import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, CheckCircle2, Clock, AlertTriangle, LogIn, Search,
  MapPin, Eye, EyeOff, Crosshair, ShieldCheck, PlayCircle, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { ONBOARDING_META } from '../constants/rolesMeta';
import { FaceScanner } from '../components/biometric/FaceScanner';
import GbsBrandLogo from '../components/common/GbsBrandLogo';

/**
 * Multi-Tenant Institutional Onboarding Form (Default Entry Page) + Application Tracker
 * Workflow: Institution applies with GPS Address -> Lead Developer Approves -> 1-Month (30-Day) Free Trial Activated
 * Afterward institution selects 3, 6, 9, 12 Months, or Lifetime subscription.
 */
export default function TenantOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => (searchParams.get('tab') === 'track' ? 'track' : 'apply')); // 'apply' | 'track'
  const [showPassword, setShowPassword] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    setTab(searchParams.get('tab') === 'track' ? 'track' : 'apply');
  }, [searchParams]);

  const [form, setForm] = useState({
    organizationName: '',
    institutionType: 'MICROFINANCE',
    contactEmail: '',
    contactPhone: '',
    country: 'Ghana',
    region: 'Greater Accra',
    city: 'Accra',
    address: '',
    gpsAddress: '',
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
    planTier: 'TRIAL_1M',
    adminFaceImage: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);
  const [error, setError] = useState('');

  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupErr, setLookupErr] = useState('');

  const detectHqGps = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: Number(pos.coords.latitude).toFixed(6),
          longitude: Number(pos.coords.longitude).toFixed(6),
        }));
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSubmittedResult(null);
    try {
      const res = await api.post('/tenants/onboard', form);
      const data = res.data?.data || res.data;
      setSubmittedResult(data);
      if (data?.institutionId || data?.tenantCode) {
        setLookupId(data.tenantCode || data.institutionId);
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
    <div className="split-login-layout onboarding-gold-wine-gradient">
      {/* Left Real-Life Institutional Photo Pane + Blended Gold/Wine/Grey/Brown Scrim */}
      <div
        className="split-login-photo-pane"
        style={{
          borderColor: 'rgba(212, 175, 55, 0.35)',
          background: 'linear-gradient(145deg, rgba(107,29,47,0.45), rgba(75,78,83,0.4), rgba(78,52,46,0.55))',
        }}
      >
        <img src={ONBOARDING_META.loginImage} alt="Institutional Loan Onboarding" className="hero-photo" style={{ opacity: 0.48 }} />
        <div
          className="split-login-photo-scrim"
          style={{
            background: 'linear-gradient(155deg, rgba(107,29,47,0.72) 0%, rgba(75,78,83,0.55) 48%, rgba(78,52,46,0.86) 80%, rgba(168,128,16,0.62) 100%)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GbsBrandLogo size={46} />
            <div>
              <div style={{ fontWeight: 800, color: '#F4E07B', fontSize: '1.02rem' }}>GBS® LOAN SYSTEM</div>
              <div style={{ fontSize: '0.72rem', color: '#E2E8F0' }}>Intelligence Talks To Wisdom • Enterprise Multi-Tenant Platform</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link
              to="/login?env=demo&switch=1"
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', borderColor: 'rgba(245,158,11,0.55)', color: '#FDE68A', textDecoration: 'none' }}
            >
              <PlayCircle size={15} /> Try Interactive Demo
            </Link>
            <Link
              to="/login?env=production&switch=1"
              className="btn btn-primary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', textDecoration: 'none' }}
            >
              <LogIn size={15} /> Existing Institution Sign In
            </Link>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 2, marginTop: 'auto' }}>
          <span className="badge badge-gold" style={{ marginBottom: 10, background: 'rgba(212,175,55,0.22)' }}>
            1-Month Free Trial • Up to Lifetime Plans
          </span>
          <h1 style={{ fontSize: 'clamp(1.6rem, 2.8vw, 2.25rem)', fontWeight: 800, color: '#FFFFFF', marginBottom: 10 }}>
            Launch Your Financial Institution on GBS
          </h1>
          <p style={{ fontSize: '0.92rem', color: '#F1F5F9', maxWidth: 510, marginBottom: 18 }}>
            Onboard your Credit Union, Microfinance, Savings &amp; Loans, or Lending House. Every approved organization starts
            with a <strong>1-Month (30-Day) Free Trial</strong> and unlocks 30 dedicated role portals, company branding &amp; logo customization,
            integer-pesewa ledger auditing, mobile CCTV monitoring, and live GPS location tracking.
          </p>

          <div className="onboarding-gold-wine-glass" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#F4E07B', marginBottom: 6 }}>
              MANDATORY GOVERNANCE &amp; SUBSCRIPTION FLOW
            </div>
            <div style={{ fontSize: '0.8rem', color: '#E2E8F0', display: 'grid', gap: 4 }}>
              <div>1. Submit Institution Onboarding &amp; GPS Location Form</div>
              <div>2. Lead Developer Reviews &amp; Approves Application → <strong>1-Month (30-Day) Free Trial Activated</strong></div>
              <div>3. Company Owner Signs In, Brands Company Name/Logo, Creates &amp; Approves Staff</div>
              <div>4. After 1-Month Trial: Upgrade to <strong>3 Months, 6 Months, 9 Months, 12 Months, or Lifetime</strong></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Onboarding Form & Status Tracker */}
      <div className="split-login-form-pane">
        <div style={{ maxWidth: 620, width: '100%', margin: '0 auto' }}>
          {tab === 'track' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={() => navigate(-1)} className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}>
                <ArrowLeft size={15} /> Back
              </button>
              <Link to="/onboard-tenant?tab=apply" className="btn btn-secondary" style={{ padding: '7px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
                Back to Onboarding Form
              </Link>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <Link
              to="/onboard-tenant?tab=apply"
              className={tab === 'apply' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, justifyContent: 'center', minWidth: 180, textDecoration: 'none' }}
            >
              <Building2 size={16} /> Onboard New Institution
            </Link>
            <Link
              to="/onboard-tenant?tab=track"
              className={tab === 'track' ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ flex: 1, justifyContent: 'center', minWidth: 180, textDecoration: 'none' }}
            >
              <Search size={16} /> Check Approval Status
            </Link>
          </div>

          {tab === 'apply' && (
            <div className="onboarding-gold-wine-glass" style={{ padding: 24 }}>
              {error && (
                <div style={{ padding: 12, marginBottom: 14, borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', color: '#FECACA', fontSize: '0.84rem', display: 'flex', gap: 8 }}>
                  <AlertTriangle size={16} /> <span>{error}</span>
                </div>
              )}

              {submittedResult ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F4E07B' }}>
                    <Clock size={24} />
                    <h3 style={{ margin: 0 }}>Application Submitted — Pending Developer Approval</h3>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: '#E2E8F0' }}>
                    Your organization <strong>{submittedResult.name}</strong> has been registered with status{' '}
                    <strong>{submittedResult.onboardingStatus}</strong>. As soon as the Developer approves your institution,
                    your <strong>1-Month (30-Day) Free Trial</strong> starts and your Company Owner can create &amp; approve staff accounts.
                  </p>
                  <div style={{ background: 'rgba(15,10,14,0.75)', padding: 14, borderRadius: 10, border: '1px solid rgba(212,175,55,0.35)', fontSize: '0.85rem' }}>
                    <div><strong>Tenant Code:</strong> {submittedResult.code || submittedResult.tenantCode}</div>
                    <div><strong>Institution ID:</strong> {submittedResult.institutionId}</div>
                    <div><strong>Owner Login Email:</strong> {submittedResult.representativeEmail || form.representativeEmail}</div>
                    <div><strong>Trial Period on Approval:</strong> 1 Month Free Trial (30 Days)</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <Link
                      to="/onboard-tenant?tab=track"
                      className="btn btn-primary"
                      style={{ textDecoration: 'none' }}
                    >
                      Track Live Approval Status
                    </Link>
                    <Link
                      to="/login?env=production&switch=1"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none' }}
                    >
                      Go to Sign In Page
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Institution Name *</label>
                      <input type="text" required className="gbs-input" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} placeholder="e.g. Golden Star Microfinance Ltd" />
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

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Official GPS Digital Address *</label>
                      <input
                        type="text"
                        required
                        className="gbs-input"
                        value={form.gpsAddress}
                        onChange={(e) => setForm({ ...form, gpsAddress: e.target.value })}
                        placeholder="e.g. GA-183-8164 or AK-039-5028"
                      />
                    </div>
                    <div>
                      <label className="gbs-label">Physical HQ Street Address</label>
                      <input
                        type="text"
                        className="gbs-input"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="Plot 14, Liberation Rd, Accra"
                      />
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
                      <label className="gbs-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span><MapPin size={12} /> HQ GPS Longitude</span>
                        <button type="button" onClick={detectHqGps} style={{ background: 'none', border: 'none', color: '#F4E07B', cursor: 'pointer', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Crosshair size={11} /> {geoLoading ? 'Detecting...' : 'Use Current GPS'}
                        </button>
                      </label>
                      <input type="text" className="gbs-input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                    </div>
                  </div>

                  <hr style={{ borderColor: 'rgba(212,175,55,0.25)', margin: '4px 0' }} />

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Company Owner / Managing Director Name *</label>
                      <input type="text" required className="gbs-input" value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} placeholder="Ama Boateng" />
                    </div>
                    <div>
                      <label className="gbs-label">Primary Executive Role</label>
                      <select className="gbs-select" value={form.representativeRole} onChange={(e) => setForm({ ...form, representativeRole: e.target.value })}>
                        <option value="COMPANY_OWNER">Company Owner</option>
                        <option value="EXECUTIVE_MANAGEMENT">Executive Management</option>
                      </select>
                    </div>
                  </div>

                  <div className="gbs-grid-2" style={{ gap: 10 }}>
                    <div>
                      <label className="gbs-label">Owner / Admin Email *</label>
                      <input type="email" required className="gbs-input" value={form.representativeEmail} onChange={(e) => setForm({ ...form, representativeEmail: e.target.value })} placeholder="owner@institution.com" />
                    </div>
                    <div>
                      <label className="gbs-label">Phone Number (SMS OTP) *</label>
                      <input type="tel" required className="gbs-input" value={form.representativePhone} onChange={(e) => setForm({ ...form, representativePhone: e.target.value })} placeholder="+233240000111" />
                    </div>
                  </div>

                  <div>
                    <label className="gbs-label">Company Owner Account Password *</label>
                    <div className="gbs-password-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        className="gbs-input"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Min 8 characters"
                      />
                      <button
                        type="button"
                        className="gbs-password-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="gbs-label">Company Owner / Admin Face Biometric Capture</label>
                    <FaceScanner
                      mode="capture"
                      title="Launch Face Camera Scanner (Admin / Company Owner)"
                      onCapture={(dataUrl) => setForm((prev) => ({ ...prev, adminFaceImage: dataUrl }))}
                    />
                  </div>

                  <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 4 }}>
                    <ShieldCheck size={16} />
                    {submitting ? 'Submitting to Developer Approval Queue...' : 'Register Organization & Request 1-Month Free Trial'}
                  </button>
                </form>
              )}
            </div>
          )}

          {tab === 'track' && (
            <div className="onboarding-gold-wine-glass" style={{ padding: 24 }}>
              <form onSubmit={handleTrackStatus} style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  required
                  className="gbs-input"
                  style={{ flex: 1, minWidth: 200 }}
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                  placeholder="Enter Tenant Code (TNT-xxxx) or Institution ID"
                />
                <button type="submit" className="btn btn-primary">Check Status</button>
              </form>

              {lookupErr && <div style={{ color: '#FCA5A5', fontSize: '0.85rem' }}>{lookupErr}</div>}

              {lookupResult && (
                <div style={{ background: 'rgba(15,10,14,0.8)', padding: 16, borderRadius: 10, border: '1px solid rgba(212,175,55,0.35)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ margin: 0, color: '#FFFFFF' }}>{lookupResult.name}</h3>
                    <span className={`badge ${['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID'].includes(lookupResult.onboardingStatus) ? 'badge-success' : lookupResult.onboardingStatus === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                      {lookupResult.onboardingStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#E2E8F0', display: 'grid', gap: 4 }}>
                    <div><strong>Code:</strong> {lookupResult.code} • <strong>ID:</strong> {lookupResult.institutionId}</div>
                    <div><strong>Operational Status:</strong> {lookupResult.status}</div>
                    <div>
                      <strong>Subscription Status:</strong>{' '}
                      {lookupResult.isLifetime ? 'LIFETIME LICENSE ACTIVE' : `${lookupResult.daysLeft ?? 30} days remaining (${lookupResult.subscriptionPlan || 'TRIAL_1M'})`}
                    </div>
                    {lookupResult.rejectionReason && (
                      <div style={{ color: '#FCA5A5' }}><strong>Rejection Note:</strong> {lookupResult.rejectionReason}</div>
                    )}
                  </div>
                  {['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID'].includes(lookupResult.onboardingStatus) && (
                    <Link
                      to="/login/company-owner?env=production&switch=1"
                      className="btn btn-primary"
                      style={{ marginTop: 14, textDecoration: 'none' }}
                    >
                      <CheckCircle2 size={16} /> Proceed to Company Owner Sign In
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14, textAlign: 'center', fontSize: '0.82rem', color: '#F1F5F9', display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span>
              Want to explore first?{' '}
              <Link
                to="/login?env=demo&switch=1"
                style={{ color: '#FDE68A', fontWeight: 700, textDecoration: 'underline' }}
              >
                Try Interactive Demo Walkthrough
              </Link>
            </span>
            <span>•</span>
            <span>
              Already registered and approved?{' '}
              <Link
                to="/login?env=production&switch=1"
                style={{ color: '#F4E07B', fontWeight: 700, textDecoration: 'underline' }}
              >
                Sign in to any of the 29 GBS Role Portals
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
