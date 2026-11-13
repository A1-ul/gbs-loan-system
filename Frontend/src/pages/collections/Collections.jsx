import React, { useState } from 'react';

export function Collections(props) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Collections Management Subsystem
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Live collection field tracking, overdue recovery workflows, and teller reconciliation.
          </p>
        </div>
        <span className="badge badge-gold">FIELD OPERATIONS</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['overview', 'daily', 'tracking', 'overdue'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize', padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Today's Target</span>
            <h3 style={{ margin: '4px 0', color: '#10b981' }}>GH₵ 145,000</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Collected Today</span>
            <h3 style={{ margin: '4px 0', color: '#d4af37' }}>GH₵ 118,450</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Field Officers</span>
            <h3 style={{ margin: '4px 0', color: '#38bdf8' }}>14 Agents</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Overdue Recovery Rate</span>
            <h3 style={{ margin: '4px 0', color: '#f59e0b' }}>91.4%</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Collections;
