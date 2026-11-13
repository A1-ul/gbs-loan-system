import React from 'react';

export function SecuritySettings(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Security Settings & Session Trust</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Change password, revoke remote device tokens, and manage voice biometric voiceprint passphrases.
      </p>
    </div>
  );
}

export default SecuritySettings;
