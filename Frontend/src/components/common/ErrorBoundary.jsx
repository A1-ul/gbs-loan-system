import React from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';

/**
 * Prevents blank/dark-blue screen crashes on any unhandled React render exception
 * across tenant dashboards, demo walkthroughs, and Developer Control Center.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected dashboard rendering issue encountered.',
    };
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') {
      console.error('[GBS ErrorBoundary]', error, info?.componentStack || '');
    }
  }

  handleRecover = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoLogin = () => {
    this.setState({ hasError: false, errorMessage: '' });
    if (typeof window !== 'undefined') {
      window.location.assign('/login?switch=1');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '70vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            background: '#060C18',
            color: '#F8FAFC',
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: 560,
              width: '100%',
              padding: 28,
              border: '1px solid rgba(212, 175, 55, 0.5)',
              background: 'rgba(11, 23, 44, 0.92)',
              borderRadius: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#FBBF24', marginBottom: 10 }}>
              <AlertTriangle size={22} />
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#F4E07B' }}>
                Workspace Display Recovery
              </h2>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '0.88rem', color: '#CBD5E1', lineHeight: 1.5 }}>
              A component error interrupted rendering this view cleanly. Use Reload Workspace below to restore live telemetry.
            </p>
            {this.state.errorMessage && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.14)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  fontSize: '0.78rem',
                  marginBottom: 16,
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorMessage}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={this.handleRecover}>
                <RefreshCw size={15} /> Reload Workspace
              </button>
              <button type="button" className="btn btn-secondary" onClick={this.handleGoLogin}>
                <LogIn size={15} /> Return to Sign In
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
