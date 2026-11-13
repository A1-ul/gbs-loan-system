import React from 'react';

export function DailyCollections(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Daily Collection Logs & Cash Reconciliation</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Record cash collections, MoMo reference matches, and teller shift handovers.
      </p>
    </div>
  );
}

export default DailyCollections;
