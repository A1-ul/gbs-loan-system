import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, ShieldCheck, AlertTriangle, Volume2, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../services/api';

/**
 * Centralized GBS Voice Identity Verification Component
 * Master Blueprint Protocol:
 * SYSTEM: "What is your name?" -> User Speaks: "My name is <Name>" -> Spectral + STT Verification
 */
export default function VoiceChallengePanel({
  mode = 'verify', // 'verify' | 'enroll'
  actionAttempted = 'PORTAL_SECURITY_CHECK',
  expectedNameHint = '',
  onSuccess,
  onFailure,
}) {
  const [statusData, setStatusData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spectralBins, setSpectralBins] = useState(null);
  const [audioBase64, setAudioBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioCtxRef = useRef(null);
  const animRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const [waveform, setWaveform] = useState(new Array(16).fill(18));

  const fetchVoiceStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await api.get('/voice-auth/status');
      const data = res.data?.data;
      setStatusData(data);
    } catch (err) {
      setFeedback({ ok: false, message: err.response?.data?.message || 'Unable to load voice status.' });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchVoiceStatus();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => null);
      }
      try {
        recognitionRef.current?.stop();
      } catch (_) {}
    };
  }, []);

  const expectedPhrase =
    statusData?.challenge?.expectedPhrase ||
    statusData?.passphraseText ||
    (expectedNameHint ? `My name is ${expectedNameHint}` : 'My name is Authorized User');

  const stopRecording = () => {
    setRecording(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (_) {}
    try {
      recognitionRef.current?.stop();
    } catch (_) {}
  };

  const startLiveRecording = async () => {
    setFeedback(null);
    chunksRef.current = [];
    if (!navigator.mediaDevices?.getUserMedia) {
      setFeedback({
        ok: false,
        message: 'Browser microphone capture API is unavailable. Upload an audio sample or use a microphone-enabled browser.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const accBins = new Array(16).fill(0);
      let sampleFrames = 0;

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const current16 = Array.from({ length: 16 }, (_, idx) => {
          const v = dataArray[idx] || 4;
          accBins[idx] += v;
          return Math.max(8, Math.round((v / 255) * 48));
        });
        sampleFrames++;
        setWaveform(current16);
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const avgBins = sampleFrames > 0 ? accBins.map((sum) => Number((sum / sampleFrames).toFixed(2))) : null;
        if (avgBins) setSpectralBins(avgBins);

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultStr = String(reader.result || '');
          const b64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          setAudioBase64(b64);
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      setRecording(true);

      // Live Web Speech API Speech-to-Text when available
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.lang = 'en-US';
        rec.interimResults = true;
        rec.continuous = true;
        rec.onresult = (event) => {
          let txt = '';
          for (let i = 0; i < event.results.length; i++) {
            txt += event.results[i][0].transcript + ' ';
          }
          setTranscript(txt.trim());
        };
        rec.onerror = () => null;
        rec.start();
        recognitionRef.current = rec;
      }
    } catch (err) {
      setFeedback({
        ok: false,
        message: `Microphone access denied or unavailable (${err.message}). Connect a microphone or upload an audio clip.`,
      });
    }
  };

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const resStr = String(reader.result || '');
      const b64 = resStr.includes(',') ? resStr.split(',')[1] : resStr;
      setAudioBase64(b64);
      setFeedback({ ok: true, message: `Loaded audio recording "${file.name}" (${Math.round(file.size / 1024)} KB).` });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioBase64 && !spectralBins) {
      setFeedback({ ok: false, message: 'Record your voice response via microphone or upload an audio sample first.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const effectiveMode = statusData?.isEnrolled === false && mode === 'verify' ? 'enroll' : mode;
      const endpoint = effectiveMode === 'enroll' ? '/voice-auth/enroll' : '/voice-auth/verify';
      const payload =
        effectiveMode === 'enroll'
          ? {
              audioBase64,
              spectralMetrics: spectralBins,
              passphraseText: transcript.trim() || expectedPhrase,
            }
          : {
              audioBase64,
              spectralMetrics: spectralBins,
              transcription: transcript.trim(),
              actionAttempted,
            };

      const res = await api.post(endpoint, payload);
      const data = res.data?.data;
      setFeedback({ ok: true, message: res.data?.message || 'Voice Identity Verified!' });
      if (effectiveMode === 'enroll') {
        await fetchVoiceStatus();
      }
      if (onSuccess) onSuccess(data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Voice verification failed.';
      setFeedback({ ok: false, message: msg });
      if (onFailure) onFailure(err.response?.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(212, 175, 55, 0.35)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(212,175,55,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
            <Volume2 size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#F4E07B' }}>
              GBS Central Voice Identity Service
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#94A3B8' }}>
              {loadingStatus
                ? 'Checking enrollment state...'
                : statusData?.isEnrolled
                  ? 'Profile Enrolled • Live Acoustic + Speech Challenge Required'
                  : 'First-Time Enrollment Required • Register Your Voice Signature'}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={fetchVoiceStatus}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* System Prompt */}
      <div style={{ background: 'rgba(6, 12, 24, 0.85)', border: '1px solid rgba(0, 242, 254, 0.28)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: '0.7rem', color: '#00F2FE', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          SYSTEM CHALLENGE PROMPT
        </div>
        <div style={{ fontSize: '1.08rem', fontWeight: 700, color: '#FFFFFF', marginTop: 4 }}>
          &ldquo;{statusData?.challenge?.systemQuestion || 'What is your name?'}&rdquo;
        </div>
        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', marginTop: 4 }}>
          Expected Spoken Response: <strong style={{ color: '#F4E07B' }}>&ldquo;{expectedPhrase}&rdquo;</strong>
        </div>
      </div>

      {/* Acoustic Spectrum Visualizer */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 5, height: 54, padding: '8px 0', marginBottom: 12 }}>
        {waveform.map((h, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height: `${recording ? h : Math.max(8, (i % 4) * 7 + 8)}px`,
              background: recording ? (i % 2 === 0 ? '#D4AF37' : '#00F2FE') : 'rgba(148,163,184,0.35)',
              borderRadius: 4,
              transition: 'height 0.1s ease',
            }}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {!recording ? (
            <button type="button" onClick={startLiveRecording} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Mic size={16} /> Start Microphone Capture
            </button>
          ) : (
            <button type="button" onClick={stopRecording} className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
              <MicOff size={16} /> Stop Recording
            </button>
          )}

          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            Upload Voice Clip
            <input type="file" accept="audio/*" onChange={handleAudioFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        <div>
          <label className="gbs-label">Spoken Transcription (Captured or Confirmed Phrase)</label>
          <input
            type="text"
            className="gbs-input"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder={`Speak or confirm: ${expectedPhrase}`}
          />
        </div>

        {feedback && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: feedback.ok ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)',
              border: `1px solid ${feedback.ok ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
              color: feedback.ok ? '#34D399' : '#FCA5A5',
            }}
          >
            {feedback.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center' }}>
          <ShieldCheck size={16} />
          {submitting
            ? 'Analyzing Acoustic Signature...'
            : statusData?.isEnrolled === false && mode === 'verify'
              ? 'Enroll Voice Signature & Continue'
              : 'Verify Voice Identity'}
        </button>
      </form>
    </div>
  );
}

