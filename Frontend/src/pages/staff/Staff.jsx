import React, { useState } from 'react';

export function Staff(props) {
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Staff & Personnel Management Subsystem
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Officer directory, RBAC role assignments, department compensation, and performance metrics.
          </p>
        </div>
        <span className="badge badge-gold">HUMAN CAPITAL</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['directory', 'register', 'roles', 'salaries'].map((tab) => (
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Staff</span>
            <h3 style={{ margin: '4px 0', color: '#10b981' }}>86 Employees</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Active Loan Officers</span>
            <h3 style={{ margin: '4px 0', color: '#38bdf8' }}>34 Officers</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Field Collectors</span>
            <h3 style={{ margin: '4px 0', color: '#d4af37' }}>22 Agents</h3>
          </div>
          <div className="metric-box">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Monthly Payroll</span>
            <h3 style={{ margin: '4px 0', color: '#a855f7' }}>GH₵ 345,000</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Staff;
