import React from 'react';

export function OverdueRecovery(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Overdue Loans & Default Recovery Engine</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Manage 30-day, 60-day, and 90-day overdue accounts, demand notices, and legal escalations.
      </p>
    </div>
  );
}

export default OverdueRecovery;
