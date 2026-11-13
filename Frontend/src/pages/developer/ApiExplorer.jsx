import React from 'react';

export function ApiExplorer(props) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
      <h3 className="gold-gradient-text" style={{ margin: '0 0 10px 0' }}>API Gateway Interactive Explorer</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Live endpoint testing, request signing, rate limit headers, and latency profiling.
      </p>
    </div>
  );
}

export default ApiExplorer;
