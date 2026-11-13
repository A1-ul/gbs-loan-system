import React, { useState } from 'react';

export function Guarantors(props) {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Guarantors Management Subsystem
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Guarantor identity verification, liability agreements, digital signatures, and default alerts.
          </p>
        </div>
        <span className="badge badge-gold">COLLATERAL & TRUST</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['list', 'verifications', 'agreements', 'alerts'].map((tab) => (
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Registered Guarantors</span>
            <h3 style={{ margin: '4px 0', color: '#38bdf8' }}>1,842</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Verified Ghana Card</span>
            <h3 style={{ margin: '4px 0', color: '#10b981' }}>98.6%</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Guarantees</span>
            <h3 style={{ margin: '4px 0', color: '#d4af37' }}>GH₵ 12.8M</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Default Risk Alerts</span>
            <h3 style={{ margin: '4px 0', color: '#ef4444' }}>07 Pending</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Guarantors;
