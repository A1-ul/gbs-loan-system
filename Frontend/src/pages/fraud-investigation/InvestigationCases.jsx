import React from 'react';

export function InvestigationCases(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Active Fraud Cases & Evidence Dossiers</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Track open investigative inquiries, cross-referenced borrower identities, and loan collusion rings.
      </p>
    </div>
  );
}

export default InvestigationCases;
