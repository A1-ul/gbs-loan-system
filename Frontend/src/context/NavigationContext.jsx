import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const location = useLocation();
  const stateMapRef = useRef({});

  const savePageState = useCallback((pathKey, partial) => {
    const key = pathKey || location.pathname;
    const prev = stateMapRef.current[key] || {};
    stateMapRef.current[key] = { ...prev, ...partial, updatedAt: Date.now() };
  }, [location.pathname]);

  const getPageState = useCallback((pathKey, defaults = {}) => {
    const key = pathKey || location.pathname;
    return { ...defaults, ...(stateMapRef.current[key] || {}) };
  }, [location.pathname]);

  // Continuously capture scroll position and reset to top when opening a new page/tab route
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    const pane = document.querySelector('.split-login-form-pane');
    if (pane) pane.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const key = location.pathname + location.search;
    const onScroll = () => {
      const prev = stateMapRef.current[key] || {};
      stateMapRef.current[key] = { ...prev, scrollY: window.scrollY };
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname, location.search]);

  return (
    <NavigationContext.Provider value={{ savePageState, getPageState }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationState(defaultState = {}) {
  const ctx = useContext(NavigationContext);
  const location = useLocation();
  const key = location.pathname + location.search;

  const restoreScroll = useCallback(() => {
    const saved = ctx?.getPageState(key, {});
    if (saved && typeof saved.scrollY === 'number' && saved.scrollY > 0) {
      requestAnimationFrame(() => window.scrollTo(0, saved.scrollY));
    }
  }, [ctx, key]);

  return {
    savedState: ctx ? ctx.getPageState(key, defaultState) : defaultState,
    saveState: (partial) => ctx?.savePageState(key, partial),
    restoreScroll,
  };
}

/**
 * Persistent top-left Back button bar across every detail/sub-page route
 */
export function BackButtonBar({ title, subtitle, breadcrumb = [], fallbackPath = '/dashboard?tab=OVERVIEW', actions = null }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && typeof window.history.state.idx === 'number' && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <div className="top-back-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleBack}
            className="btn btn-secondary"
            data-testid="top-back-button"
            style={{ padding: '8px 14px', borderColor: 'rgba(212,175,55,0.45)', color: '#F4E07B' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Link
            to={fallbackPath}
            className="btn btn-secondary"
            data-testid="top-dashboard-button"
            style={{ padding: '8px 12px', borderColor: 'rgba(56,189,248,0.35)', color: '#93C5FD', fontSize: '0.82rem' }}
          >
            <Home size={15} /> Dashboard
          </Link>
        </div>

        <div>
          {breadcrumb.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#94A3B8', marginBottom: 2 }}>
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={12} />}
                  {idx === 0 ? (
                    <Link to={fallbackPath} style={{ color: '#93C5FD', textDecoration: 'none' }}>{item}</Link>
                  ) : (
                    <span style={{ color: idx === breadcrumb.length - 1 ? '#D4AF37' : '#94A3B8' }}>{item}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F1F5F9', margin: 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: 0 }}>{subtitle}</p>}
        </div>
      </div>

      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

