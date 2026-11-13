import React from 'react';

export function FraudInvestigation(props) {
  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Fraud Investigation & Risk Intelligence
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            AI-driven loan application fraud detection, identity mismatch forensics, and blacklisted device analysis.
          </p>
        </div>
        <span className="badge badge-gold">FORENSICS</span>
      </div>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          GBS Enterprise anti-fraud investigation cases and suspicious borrower relationship graphs.
        </p>
      </div>
    </div>
  );
}

export default FraudInvestigation;
