import React from 'react';

export function ThreatMonitoring(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>Threat Monitoring & DDoS Mitigation</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Live monitoring of failed authentication spikes, anomalous financial queries, and suspicious geographic logins.
      </p>
    </div>
  );
}

export default ThreatMonitoring;
