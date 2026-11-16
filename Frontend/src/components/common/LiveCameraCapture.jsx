import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Video, VideoOff } from 'lucide-react';

/**
 * Reusable Strict Live Camera Capture Component
 * Streams camera via HTML5 getUserMedia and captures reference snapshot for KYC/registration.
 */
export default function LiveCameraCapture({
  onPhotoCaptured,
  onPhotoCleared,
  required = true,
  label = 'Mandatory Live Camera Reference Photo',
  photo = null,
}) {
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(photo || null);
  const [cameraError, setCameraError] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (photo && photo !== capturedImage) {
      setCapturedImage(photo);
    }
  }, [photo]);

  // Clean up video stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError('');
    setIsInitializing(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser. Please use a modern browser with webcam permissions.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      setStream(mediaStream);
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera stream error:', err);
      let msg = 'Could not access camera. Please allow camera permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings to proceed.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device detected. Please attach or enable a webcam.';
      }
      setCameraError(msg);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Mirror the preview horizontally for a natural selfie look
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();

    if (onPhotoCaptured) {
      onPhotoCaptured(dataUrl);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (onPhotoCleared) {
      onPhotoCleared();
    }
    startCamera();
  };

  const clearPhoto = () => {
    setCapturedImage(null);
    stopCamera();
    if (onPhotoCleared) {
      onPhotoCleared();
    }
  };

  return (
    <div
      className="live-camera-capture-container"
      style={{
        border: capturedImage
          ? '2px solid rgba(16, 185, 129, 0.6)'
          : required
          ? '2px dashed rgba(212, 175, 55, 0.5)'
          : '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 10,
        padding: 14,
        background: 'rgba(15, 23, 42, 0.65)',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label className="gbs-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Camera size={15} color={capturedImage ? '#10B981' : '#D4AF37'} />
          <span>{label}</span>
          {required && (
            <span style={{ color: '#EF4444', fontSize: '0.85rem', fontWeight: 'bold' }}>* (Strictly Required)</span>
          )}
        </label>
        {capturedImage ? (
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Live Shot Captured
          </span>
        ) : (
          <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <AlertCircle size={12} /> Photo Pending
          </span>
        )}
      </div>

      {cameraError && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            borderRadius: 6,
            background: 'rgba(239,68,68,0.18)',
            border: '1px solid rgba(239,68,68,0.4)',
            color: '#FCA5A5',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* 1. Captured Photo Preview */}
      {capturedImage && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              border: '2px solid #10B981',
              maxHeight: 220,
            }}
          >
            <img
              src={capturedImage}
              alt="Live KYC Reference Capture"
              style={{ display: 'block', maxHeight: 210, width: 'auto', maxWidth: '100%', objectFit: 'cover' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.7)',
                color: '#34D399',
                fontSize: '0.72rem',
                padding: '3px 8px',
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              Live Identity Snapshot Verified
            </div>
          </div>
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={retakePhoto}
              className="btn btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            >
              <RefreshCw size={13} /> Retake Live Shot
            </button>
            <button
              type="button"
              onClick={clearPhoto}
              className="btn btn-danger"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* 2. Active Camera Live Video Stream */}
      {cameraActive && !capturedImage && (
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              borderRadius: 8,
              overflow: 'hidden',
              border: '2px solid #D4AF37',
              backgroundColor: '#000',
              maxWidth: '100%',
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                display: 'block',
                maxHeight: 230,
                width: '100%',
                transform: 'scaleX(-1)', // Selfie mirror
              }}
            />
            {/* Alignment crosshairs / guide */}
            <div
              style={{
                position: 'absolute',
                top: '15%',
                left: '25%',
                right: '25%',
                bottom: '15%',
                border: '2px dashed rgba(212, 175, 55, 0.7)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                background: 'rgba(239, 68, 68, 0.85)',
                color: '#FFF',
                padding: '2px 8px',
                borderRadius: 4,
                fontSize: '0.7rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFF' }} /> LIVE CAMERA
            </div>
          </div>

          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={takeSnapshot}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.84rem',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                borderColor: '#34D399',
                fontWeight: 700,
              }}
            >
              <Camera size={15} /> Capture Photo Now
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.8rem' }}
            >
              <VideoOff size={14} /> Close Camera
            </button>
          </div>
        </div>
      )}

      {/* 3. Idle Camera Trigger Button */}
      {!cameraActive && !capturedImage && (
        <div style={{ textAlign: 'center', padding: '12px 6px' }}>
          <p style={{ fontSize: '0.82rem', color: '#CBD5E1', marginBottom: 10 }}>
            Position yourself clearly facing the webcam. A live camera shot is strictly required to reference and verify your profile.
          </p>
          <button
            type="button"
            onClick={startCamera}
            disabled={isInitializing}
            className="btn btn-primary"
            style={{
              padding: '9px 18px',
              fontSize: '0.84rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #F4E07B, #D4AF37)',
              color: '#060C18',
              fontWeight: 700,
            }}
          >
            <Video size={16} />
            {isInitializing ? 'Accessing Camera...' : 'Open Live Camera & Take Photo'}
          </button>
        </div>
      )}

      {/* Hidden canvas for snapshot rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
