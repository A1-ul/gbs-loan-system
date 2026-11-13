import React, { useState } from 'react';

export function DeveloperControlCenter(props) {
  const [activeTab, setActiveTab] = useState('diagnostics');

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Hidden Developer Control Center (Step 5)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Live Diagnostics, Emergency Recovery, System Lockdown, and Tenant Operations.
          </p>
        </div>
        <span className="badge badge-gold">SECURE ACCESS</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['diagnostics', 'monitoring', 'lockdown', 'recovery', 'tenants'].map((tab) => (
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Backend Uptime</span>
            <h3 style={{ margin: '4px 0', color: '#10b981' }}>99.98%</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>PostgreSQL Cluster</span>
            <h3 style={{ margin: '4px 0', color: '#38bdf8' }}>ONLINE</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Sockets</span>
            <h3 style={{ margin: '4px 0', color: '#d4af37' }}>14 Active</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Security Lockdown</span>
            <h3 style={{ margin: '4px 0', color: '#10b981' }}>STANDBY</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeveloperControlCenter;
