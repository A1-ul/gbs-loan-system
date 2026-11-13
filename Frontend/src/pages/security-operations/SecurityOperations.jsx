import React from 'react';

export function SecurityOperations(props) {
  return (
    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="gold-gradient-text" style={{ margin: 0, fontSize: '1.4rem' }}>
            Security Operations Center (SOC)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Threat detection, suspicious IP blocking, biometric spoofing defenses, and perimeter posture.
          </p>
        </div>
        <span className="badge badge-gold">CYBER DEFENSE</span>
      </div>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          GBS Enterprise real-time threat intelligence and security posture monitoring.
        </p>
      </div>
    </div>
  );
}

export default SecurityOperations;
