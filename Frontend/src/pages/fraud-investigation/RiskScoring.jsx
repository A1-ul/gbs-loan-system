import React from 'react';

export function RiskScoring(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>AI Risk Scoring & Predictive Default Modeling</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Credit evaluation matrix, debt-to-income stress testing, and real-time fraud probability scores.
      </p>
    </div>
  );
}

export default RiskScoring;
