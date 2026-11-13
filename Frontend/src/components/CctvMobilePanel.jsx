import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Video, Smartphone, QrCode, Plus, RefreshCw, Power, Trash2, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

/**
 * CCTV Camera Mobile Linking Panel (Company Owner / Branch Manager Dashboard)
 */
export function CctvMobilePanel({ branches = [] }) {
  const [cameras, setCameras] = useState([]);
  const [form, setForm] = useState({ name: '', locationLabel: '', branchId: '', streamUrl: '' });
  const [selectedQrCam, setSelectedQrCam] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadCameras = useCallback(async () => {
    try {
      const res = await api.get('/enterprise/cctv');
      setCameras(res.data?.data || []);
    } catch (_) { }
  }, []);

  useEffect(() => { loadCameras(); }, [loadCameras]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post('/enterprise/cctv', form);
      const created = res.data?.data;
      setMsg({ ok: true, text: `Camera "${created.name}" paired! Scan QR or open Mobile Link on Company Owner's phone.` });
      setForm({ name: '', locationLabel: '', branchId: '', streamUrl: '' });
      setSelectedQrCam(created);
      loadCameras();
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.message || 'Unable to register CCTV camera' });
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (cam) => {
    try {
      await api.put(`/enterprise/cctv/${cam.id}/toggle`, { isActive: !cam.isActive });
      loadCameras();
    } catch (_) { }
  };

  const handleRegenerate = async (cam) => {
    try {
      const res = await api.post(`/enterprise/cctv/${cam.id}/regenerate`);
      setSelectedQrCam(res.data?.data || cam);
      setMsg({ ok: true, text: `Fresh mobile pairing code generated for ${cam.name}.` });
      loadCameras();
    } catch (_) { }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/enterprise/cctv/${id}`);
      if (selectedQrCam?.id === id) setSelectedQrCam(null);
      loadCameras();
    } catch (_) { }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {msg && (
        <div className="glass-panel" style={{ padding: 12, color: msg.ok ? '#34D399' : '#FCA5A5', borderColor: msg.ok ? '#10B981' : '#EF4444' }}>
          {msg.text}
        </div>
      )}

      <div className="gbs-grid-2">
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#D4AF37', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Video size={18} /> Link Branch / Vault CCTV to Mobile Device
          </h3>
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="gbs-label">Camera Name *</label>
              <input
                type="text"
                required
                className="gbs-input"
                placeholder="Main Vault Camera 01"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="gbs-grid-2" style={{ gap: 10 }}>
              <div>
                <label className="gbs-label">Camera Location / Hall</label>
                <input
                  type="text"
                  className="gbs-input"
                  placeholder="Head Office Cashier Hall"
                  value={form.locationLabel}
                  onChange={(e) => setForm({ ...form, locationLabel: e.target.value })}
                />
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="gbs-label">Branch (Optional)</label>
                  <select className="gbs-select" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">Head Office</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="gbs-label">IP Camera / NVR Stream URL (HTTPS / RTSP / HLS) *</label>
              <input
                type="url"
                required
                className="gbs-input"
                placeholder="https://nvr.yourcompany.com/live/cam01.m3u8"
                value={form.streamUrl}
                onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
              />
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ justifyContent: 'center' }}>
              <Plus size={15} /> {busy ? 'Pairing Camera...' : 'Register Camera & Generate Mobile QR'}
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', color: '#00F2FE', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={18} /> Company Owner Mobile Pairing Pass
          </h3>
          {selectedQrCam ? (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {selectedQrCam.qrCodeDataUrl && (
                <img
                  src={selectedQrCam.qrCodeDataUrl}
                  alt="CCTV Mobile QR"
                  style={{ width: 150, height: 150, borderRadius: 10, border: '2px solid #D4AF37', background: '#FFF' }}
                />
              )}
              <div style={{ flex: 1, minWidth: 200, fontSize: '0.82rem', display: 'grid', gap: 6 }}>
                <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#FFFFFF' }}>{selectedQrCam.name}</div>
                <div style={{ color: '#94A3B8' }}>{selectedQrCam.locationLabel}</div>
                <div>
                  <strong>Mobile Pairing Code:</strong>{' '}
                  <span className="badge badge-gold">{selectedQrCam.pairingCode}</span>
                </div>
                <div style={{ wordBreak: 'break-all', fontSize: '0.72rem', color: '#38BDF8' }}>
                  {selectedQrCam.mobileWatchUrl}
                </div>
                <a
                  href={selectedQrCam.mobileWatchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary"
                  style={{ width: 'fit-content', padding: '6px 12px', fontSize: '0.76rem', marginTop: 4 }}
                >
                  <ExternalLink size={13} /> Open Mobile Watch View
                </a>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.84rem', color: '#94A3B8' }}>
              Register a branch or vault CCTV stream or click &ldquo;Mobile QR&rdquo; on any listed camera below to scan on your smartphone.
            </p>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 12px', color: '#FFFFFF' }}>Linked Branch CCTV Cameras ({cameras.length})</h3>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr><th>Camera</th><th>Location</th><th>Pairing Code</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {cameras.map((cam) => (
                <tr key={cam.id}>
                  <td>
                    <strong>{cam.name}</strong>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cam.streamUrl}</div>
                  </td>
                  <td>{cam.locationLabel}</td>
                  <td><span className="badge badge-gold">{cam.pairingCode}</span></td>
                  <td>
                    <span className={`badge ${cam.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {cam.isActive ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => setSelectedQrCam(cam)}>
                      <QrCode size={13} /> Mobile QR
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleRegenerate(cam)}>
                      <RefreshCw size={13} /> New Code
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleToggle(cam)}>
                      <Power size={13} /> {cam.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button type="button" className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '0.74rem' }} onClick={() => handleDelete(cam.id)}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {cameras.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8' }}>No CCTV feeds registered yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/**
 * Public Smartphone CCTV Watch Route (/cctv-mobile?camera=...&code=...&token=...)
 */
export function CctvMobileWatchPage() {
  const [searchParams] = useSearchParams();
  const [codeInput, setCodeInput] = useState(searchParams.get('code') || '');
  const [camera, setCamera] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyAccess = useCallback(async (paramsObj) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/enterprise/cctv/mobile-access', { params: paramsObj });
      setCamera(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or deactivated CCTV mobile access link.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const camId = searchParams.get('camera');
    const code = searchParams.get('code');
    const token = searchParams.get('token');
    if (camId || code) {
      verifyAccess({ camera: camId, code, token });
    }
  }, [searchParams, verifyAccess]);

  return (
    <div className="onboarding-gold-wine-gradient" style={{ minHeight: '100vh', padding: 20, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="onboarding-gold-wine-glass" style={{ maxWidth: 640, width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2 className="gold-gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={20} color="#D4AF37" /> Owner Mobile CCTV Feed
          </h2>
          <Link to="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            Dashboard
          </Link>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyAccess({ code: codeInput.trim() });
          }}
          style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}
        >
          <input
            type="text"
            className="gbs-input"
            style={{ flex: 1, minWidth: 180 }}
            placeholder="Enter Camera Pairing Code (e.g. GBS-CAM-A1B2C3)"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Connecting...' : 'Connect Mobile Feed'}
          </button>
        </form>

        {error && (
          <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.2)', border: '1px solid #EF4444', color: '#FCA5A5', marginBottom: 14, display: 'flex', gap: 8 }}>
            <AlertTriangle size={16} /> <span>{error}</span>
          </div>
        )}

        {camera && (
          <div style={{ background: 'rgba(6,12,24,0.85)', padding: 18, borderRadius: 12, border: '1px solid rgba(212,175,55,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, color: '#FFFFFF' }}>{camera.name}</h3>
                <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                  {camera.tenant?.name || 'Institution'} • {camera.locationLabel}
                </div>
              </div>
              <span className="badge badge-success"><CheckCircle2 size={12} /> LIVE LINKED</span>
            </div>

            {/\.(mp4|webm|m3u8)(\?|$)/i.test(camera.streamUrl) ? (
              <video
                src={camera.streamUrl}
                controls
                autoPlay
                playsInline
                style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(0,242,254,0.35)', marginBottom: 10 }}
              />
            ) : (
              <div style={{ padding: 16, borderRadius: 10, background: 'rgba(15,27,49,0.78)', border: '1px solid rgba(0,242,254,0.28)', marginBottom: 10 }}>
                <div style={{ fontSize: '0.82rem', color: '#CBD5E1', marginBottom: 8 }}>
                  Authenticated Camera Stream Endpoint:
                </div>
                <div style={{ wordBreak: 'break-all', fontSize: '0.78rem', color: '#38BDF8', marginBottom: 12 }}>
                  {camera.streamUrl}
                </div>
                <a href={camera.streamUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  <ExternalLink size={15} /> Open Stream Player / NVR App
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CctvMobilePanel;

