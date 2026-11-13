import React from 'react';

export function SalaryManagement(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Staff Salaries & Payroll Disbursement</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Automate monthly payroll, commission calculations, MoMo disbursement, and payslip generation.
      </p>
    </div>
  );
}

export default SalaryManagement;
