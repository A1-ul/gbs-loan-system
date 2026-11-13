import React from 'react';

export function AccessLogs(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>SOC Access Logs & Firewall Events</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Detailed inspectable stream of TLS handshakes, reverse proxy route correlations, and rate limiting blocks.
      </p>
    </div>
  );
}

export default AccessLogs;
