import React from 'react';

export function StaffRegistration(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Staff Onboarding & Profile Setup</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Create new staff accounts, upload government credentials, assign branch, and configure access level.
      </p>
    </div>
  );
}

export default StaffRegistration;
