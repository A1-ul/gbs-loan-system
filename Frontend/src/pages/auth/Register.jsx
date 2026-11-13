import React from 'react';

export function Register(props) {
  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', maxWidth: '480px', margin: '40px auto' }}>
      <h2 className="gold-gradient-text" style={{ margin: '0 0 12px 0', textAlign: 'center' }}>
        Create Member Account
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '20px' }}>
        Ghana Card verification, mobile number, and personal KYC registration.
      </p>
    </div>
  );
}

export default Register;
