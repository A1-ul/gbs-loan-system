import React from 'react';

export function ForgotPassword(props) {
  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', maxWidth: '440px', margin: '40px auto' }}>
      <h2 className="gold-gradient-text" style={{ margin: '0 0 12px 0', textAlign: 'center' }}>
        Reset Password
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
        Enter your registered email or phone to receive a 6-digit OTP verification code.
      </p>
    </div>
  );
}

export default ForgotPassword;
