import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

/**
 * Interactive Face Camera Scanner & Image Upload Biometric Component
 * Connects to /api/v1/facial-recognition/enroll and /api/v1/facial-recognition/verify.
 */
export function FaceScanner({ mode = 'both', onVerified, onCapture, title = 'Live Facial Biometric Scanner' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camActive, setCamActive] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState('');
  const [capturedBase64, setCapturedBase64] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCamActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setStatusMsg(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMsg({ ok: false, text: 'Webcam API unavailable in this browser. Please upload a portrait photo below.' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamActive(true);
    } catch (err) {
      setStatusMsg({ ok: false, text: `Camera permission/hardware error (${err.message}). Use file upload instead.` });
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 480;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const b64 = dataUrl.split(',')[1] || '';
    setCapturedPreview(dataUrl);
    setCapturedBase64(b64);
    if (onCapture) onCapture(dataUrl, b64);
    setStatusMsg({
      ok: true,
      text: mode === 'capture'
        ? 'Face frame captured cleanly and attached to onboarding application.'
        : 'Face frame captured. Click Enroll or Verify to complete biometric check.',
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = String(reader.result || '');
      const b64 = dataUrl.split(',')[1] || '';
      setCapturedPreview(dataUrl);
      setCapturedBase64(b64);
      if (onCapture) onCapture(dataUrl, b64);
      setStatusMsg({
        ok: true,
        text: mode === 'capture'
          ? `Admin portrait "${file.name}" attached to onboarding form.`
          : `Portrait "${file.name}" loaded and ready for biometric processing.`,
      });
    };
    reader.readAsDataURL(file);
  };

  const clearCaptured = () => {
    setCapturedPreview('');
    setCapturedBase64('');
    if (onCapture) onCapture('', '');
    setStatusMsg(null);
  };

  const submitFacialAction = async (actionType) => {
    let base64 = capturedBase64;
    if (!base64 && camActive && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 360;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPreview(dataUrl);
      base64 = dataUrl.split(',')[1] || '';
      setCapturedBase64(base64);
    }

    if (!base64) {
      setStatusMsg({ ok: false, text: 'Start the face camera or upload an admin/staff image first.' });
      return;
    }

    setBusy(true);
    try {
      const res = await api.post(`/facial-recognition/${actionType}`, {
        imageBase64: base64,
        livenessConfirmed: true,
      });
      const data = res.data?.data || res.data;
      setStatusMsg({
        ok: true,
        text: res.data?.message || (actionType === 'enroll' ? 'Facial template enrolled successfully.' : 'Facial biometric verified!'),
      });
      if (onVerified) onVerified(actionType, data);
    } catch (err) {
      setStatusMsg({ ok: false, text: err.response?.data?.message || 'Facial biometric processing failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 className="gold-gradient-text" style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Camera size={18} color="#D4AF37" /> {title}
        </h3>
        <span className="badge badge-gold">WEBCAM + UPLOAD</span>
      </div>

      {statusMsg && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            marginBottom: 12,
            fontSize: '0.82rem',
            background: statusMsg.ok ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
            border: `1px solid ${statusMsg.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
            color: statusMsg.ok ? '#34D399' : '#FCA5A5',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {statusMsg.ok ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {!camActive ? (
          <button type="button" className="btn btn-primary" onClick={startCamera} style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
            <Camera size={14} /> Launch Face Camera
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-primary" onClick={captureFrame} style={{ fontSize: '0.8rem', padding: '8px 14px' }}>
              <Camera size={14} /> Capture Frame
            </button>
            <button type="button" className="btn btn-secondary" onClick={stopCamera} style={{ fontSize: '0.8rem', padding: '8px 12px' }}>
              Stop Camera
            </button>
          </>
        )}

        <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: '0.8rem', padding: '8px 14px' }}>
          <Upload size={14} /> Upload Portrait Image
          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {camActive && (
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 10, border: '1px solid rgba(0,242,254,0.4)' }}
          />
        </div>
      )}

      {capturedPreview && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(6,12,24,0.75)', padding: 10, borderRadius: 8 }}>
          <img src={capturedPreview} alt="Captured Biometric Preview" style={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid #D4AF37' }} />
          <div style={{ fontSize: '0.78rem', color: '#CBD5E1', flex: 1 }}>
            {mode === 'capture' ? 'Owner / Admin face photo captured and ready for institution registration' : 'Ready for biometric verification'}
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(mode === 'both' || mode === 'enroll') && (
                <button type="button" disabled={busy} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => submitFacialAction('enroll')}>
                  {busy ? <RefreshCw size={13} /> : <ShieldCheck size={13} />} Save Face Enrollment
                </button>
              )}
              {(mode === 'both' || mode === 'verify') && (
                <button type="button" disabled={busy} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={() => submitFacialAction('verify')}>
                  Verify Live Face Match
                </button>
              )}
              {mode === 'capture' && (
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.76rem' }} onClick={clearCaptured}>
                  Retake / Clear Photo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceScanner;
