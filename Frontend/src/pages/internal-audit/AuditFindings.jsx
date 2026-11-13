import React from 'react';

export function AuditFindings(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Audit Findings & Remediation Tracking</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Log exceptions, corrective action plans (CAP), deadline tracking, and management responses.
      </p>
    </div>
  );
}

export default AuditFindings;
