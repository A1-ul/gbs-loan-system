import React, { useState } from 'react';

export function Profile(props) {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            User Account & Profile Security
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Personal information, biometric enrollment status, active sessions, and multi-factor auth.
          </p>
        </div>
        <span className="badge badge-gold">MY ACCOUNT</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['profile', 'security', 'notifications'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          GBS Enterprise authenticated user profile configuration and device trust management.
        </p>
      </div>
    </div>
  );
}

export default Profile;
