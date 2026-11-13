import React from 'react';

export function StaffRoles(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>RBAC Role Assignments & Permission Scopes</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Configure Manager, Loan Officer, Collector, Accountant, and Auditor granular permissions.
      </p>
    </div>
  );
}

export default StaffRoles;
