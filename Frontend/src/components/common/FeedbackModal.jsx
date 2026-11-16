import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, AlertTriangle, Star } from 'lucide-react';
import { feedbackService } from '../../services/feedback.service';
import { sessionStore } from '../../services/api';

export default function FeedbackModal({ isOpen, onClose, defaultCategory = 'SYSTEM_FEEDBACK' }) {
  const currentUser = sessionStore.getTenantUser();
  const devUser = sessionStore.getDevUser();
  const activeUser = devUser || currentUser;

  const [form, setForm] = useState({
    name: activeUser ? `${activeUser.firstName || activeUser.username || ''} ${activeUser.lastName || ''}`.trim() : '',
    email: activeUser?.email || '',
    phone: activeUser?.phone || '',
    category: defaultCategory,
    rating: 5,
    subject: '',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!form.subject.trim() || !form.message.trim()) {
      setErrorMsg('Subject and feedback message are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        submitterName: form.name.trim() || (devUser ? 'Developer Authority' : 'System User'),
        submitterEmail: form.email.trim() || null,
        submitterPhone: form.phone.trim() || null,
        category: form.category,
        rating: Number(form.rating) || 5,
        subject: form.subject.trim(),
        message: form.message.trim(),
        tenantId: currentUser?.tenantId || null,
        role: devUser ? 'DEVELOPER' : currentUser?.role || 'GUEST',
      };

      await feedbackService.submitFeedback(payload);
      setSuccessMsg('Your feedback has been received! The Company Owner and Developer team will review your comments.');
      setTimeout(() => {
        setForm({
          name: '',
          email: '',
          phone: '',
          category: 'SYSTEM_FEEDBACK',
          rating: 5,
          subject: '',
          message: '',
        });
        setSuccessMsg('');
        if (onClose) onClose();
      }, 2500);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Unable to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(3, 7, 18, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 540,
          width: '100%',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(212, 175, 55, 0.4)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #D4AF37, #B45309)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060C18',
              }}
            >
              <MessageSquarePlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#F1F5F9', fontSize: '1.2rem', fontWeight: 700 }}>
                Submit User Feedback &amp; System Report
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
                Your feedback routes directly to the Company Owner and Developer Authority.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: 10,
              marginBottom: 14,
              borderRadius: 6,
              background: 'rgba(239,68,68,0.18)',
              border: '1px solid rgba(239,68,68,0.4)',
              color: '#FCA5A5',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertTriangle size={16} /> <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: 12,
              marginBottom: 14,
              borderRadius: 6,
              background: 'rgba(16,185,129,0.18)',
              border: '1px solid rgba(16,185,129,0.4)',
              color: '#34D399',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={18} /> <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="gbs-grid-2" style={{ gap: 10 }}>
            <div>
              <label className="gbs-label">Your Name</label>
              <input
                type="text"
                required
                className="gbs-input"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="gbs-label">Email or Phone</label>
              <input
                type="text"
                className="gbs-input"
                placeholder="name@company.com or +233..."
                value={form.email || form.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('@')) {
                    setForm({ ...form, email: val });
                  } else {
                    setForm({ ...form, phone: val });
                  }
                }}
              />
            </div>
          </div>

          <div className="gbs-grid-2" style={{ gap: 10 }}>
            <div>
              <label className="gbs-label">Feedback Category</label>
              <select
                className="gbs-select"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="SYSTEM_FEEDBACK">System &amp; Experience Feedback</option>
                <option value="API_ISSUE">API or Service Issue</option>
                <option value="FEATURE_REQUEST">Feature Request / Enhancement</option>
                <option value="SERVICE_COMPLAINT">Service or Branch Complaint</option>
                <option value="CAMERA_KYC_SUPPORT">Live Camera &amp; KYC Support</option>
                <option value="GENERAL">General Inquiries</option>
              </select>
            </div>
            <div>
              <label className="gbs-label">Experience Rating</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setForm({ ...form, rating: star })}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                  >
                    <Star
                      size={20}
                      fill={star <= form.rating ? '#F59E0B' : 'transparent'}
                      color={star <= form.rating ? '#F59E0B' : '#64748B'}
                    />
                  </button>
                ))}
                <span style={{ fontSize: '0.8rem', color: '#CBD5E1', marginLeft: 4 }}>
                  {form.rating}/5 Stars
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="gbs-label">Subject</label>
            <input
              type="text"
              required
              className="gbs-input"
              placeholder="Brief summary of your feedback or issue..."
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <div>
            <label className="gbs-label">Detailed Feedback / Issue Description</label>
            <textarea
              rows={4}
              required
              className="gbs-textarea"
              placeholder="Describe your feedback, request, or issue with full details..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #F4E07B, #D4AF37)',
                color: '#060C18',
                fontWeight: 700,
              }}
            >
              <Send size={15} /> {submitting ? 'Submitting Feedback...' : 'Send Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Floating Feedback Pill Trigger Button
 */
export function FeedbackFloatingTrigger({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Give Feedback or Report Issue"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 30,
        backgroundColor: '#0F172A',
        color: '#F4E07B',
        border: '1.5px solid rgba(212, 175, 55, 0.65)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        cursor: 'pointer',
        fontSize: '0.84rem',
        fontWeight: 700,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#F4E07B';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.65)';
      }}
    >
      <MessageSquarePlus size={16} />
      <span>Feedback / Report</span>
    </button>
  );
}
