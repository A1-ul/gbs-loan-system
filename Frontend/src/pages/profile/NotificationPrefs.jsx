import React from 'react';

export function NotificationPrefs(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Notification Preferences</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Select notification channels for SMS alerts, email summaries, and repayment due reminders.
      </p>
    </div>
  );
}

export default NotificationPrefs;
