import React from 'react';

export function CollectorTracking(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Live Field Collector GPS Tracking</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Track real-time collector GPS breadcrumbs, active geofences, and borrower visit verification.
      </p>
    </div>
  );
}

export default CollectorTracking;
