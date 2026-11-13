import React from 'react';

export function InternalAudit(props) {
  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Internal Audit & Compliance Assurance
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Periodic audit cycle schedules, vault spot-checks, sampling tests, and regulatory evidence.
          </p>
        </div>
        <span className="badge badge-gold">GOVERNANCE</span>
      </div>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          GBS Enterprise internal audit management interface and risk testing records.
        </p>
      </div>
    </div>
  );
}

export default InternalAudit;
