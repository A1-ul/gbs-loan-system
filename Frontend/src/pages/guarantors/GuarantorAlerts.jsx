import React from 'react';

export function GuarantorAlerts(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Automated Guarantor Default & Penalty Alerts</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Dispatches SMS and Email warnings to guarantors when a primary borrower becomes overdue.
      </p>
    </div>
  );
}

export default GuarantorAlerts;
