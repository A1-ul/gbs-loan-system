import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Pause, RotateCcw, SkipBack, SkipForward, Volume2, VolumeX,
  Video, Download, X, ShieldCheck, CheckCircle2, Lock, Sparkles
} from 'lucide-react';
import {
  ROLES_META,
  DEVELOPER_PORTAL_META,
  resolveRoleMeta,
  resolveRoleCapabilities,
  normalizeRoleKey,
} from '../constants/rolesMeta';

const ROLE_SLIDE_DURATION_SEC = 8;

function getRoleDailyChecklist(roleKey, caps, isDeveloper) {
  if (isDeveloper) {
    return [
      'Sign in strictly via isolated /dev-portal/login (JWT + 2FA + Session DB).',
      'Inspect Pending Institutional Onboarding Queue: KYB reg #, TIN, license, and GPS address.',
      'Click Approve (starts 1-Month / 30-day Free Trial) or Reject with compliance reason.',
      'Monitor Live Cross-Tenant GIS Map, Security Alerts, Crash Reports, and PgDump Backups.',
    ];
  }
  const canonical = normalizeRoleKey(roleKey);
  const actions = caps?.actions || {};
  if (canonical === 'GUARANTOR_PORTAL') {
    return [
      'Open Overview & Hub to verify Guaranteed Loans count, Exposure, and Surety status.',
      'Open "My Guarantees & Surety" tab to inspect guarantor profile & sign Digital Surety Agreement.',
      'Toggle Penalty SMS Alerts ON/OFF for overdue warnings on backed borrower facilities.',
      'Open "Guaranteed Loans" (read-only schedule) or "Surety Repayments" to pay toward guaranteed loans.',
    ];
  }
  if (canonical === 'MEMBER_PORTAL') {
    return [
      'Check My Active Loans, Total Borrowed, Repaid to Date, and Remaining Balance on Overview.',
      'Submit a new personal or SME facility application inside "My Loans & Apply" with installment preview.',
      'Make instant MTN MoMo, Telecel Cash, Bank Transfer, or Cash repayments under "Repayments".',
      'Inspect installment schedules (/loans/:id) and update Password / 2FA / Voice / Face ID in Security.',
    ];
  }
  const steps = ['Clock In (Report to Work) with live GPS timestamp on Overview before starting shift.'];
  if (actions.canApproveStaff) steps.push('Review Company Owner Pending Staff Approval Queue & Branding/Logo status.');
  else if (actions.canManageTickets) steps.push('Log walk-in visitor or borrower support inquiries in Support & Front Desk.');
  else if (actions.canManageCampaigns) steps.push('Launch & track SMS/WhatsApp borrower acquisition campaigns in Marketing.');
  else if (actions.canManageInvestors) steps.push('Inspect Investor capital tranches, deployed balances, and APR yields.');
  else if (actions.canRunAudit) steps.push('Run pesewa-accurate General Ledger Reconciliation & verify pending Cash receipts.');
  else if (actions.canApplyLoan || actions.canApproveLoan) steps.push('Process Borrower KYC, Loans & Underwriting Reviews within your approval tier.');
  else if (actions.canRecordPayment || actions.canLogFieldVisit) steps.push('Locate due borrowers via GPS Map, log collection visits & post MoMo/Cash repayments.');
  else if (actions.canCreateStaff) steps.push('Maintain Staff Roster, Qualification Salary Grouping & Monthly Payroll runs.');
  if (actions.canManageCases) steps.push('Open, investigate, and resolve Compliance / Fraud / Legal / Risk cases.');
  if (actions.canBroadcastStaff) steps.push('Send Staff Broadcasts, sign off Ledger Audits, and manage Branch CCTV streams.');
  if (actions.canExportReports) steps.push('Wrap period snapshots (Weekly/Monthly/Yearly) & export CSV/XLSX/PDF ledgers.');
  steps.push('Clock Out cleanly at shift end; all actions write to the immutable Audit Trail.');
  return steps.slice(0, 5);
}

function getRestrictedControlsSummary(roleKey, caps, isDeveloper) {
  if (isDeveloper) {
    return [
      'Cannot process borrower disbursements inside tenant loan ledgers',
      'Strictly separated from DEMO-SANDBOX operational tenant roles',
    ];
  }
  const actions = caps?.actions || {};
  const restricted = ['Approve or activate new onboarding institutions (Developer Authority ONLY)'];
  if (!actions.canApproveLoan) restricted.push('Final Loan Committee Approval');
  if (!actions.canDisburseLoan) restricted.push('Disburse Loan Principal Funds');
  if (!actions.canApproveCash) restricted.push('Approve Cash Settlement Receipts');
  if (!actions.canApproveStaff) restricted.push('Approve New Staff Portal Access');
  if (!actions.canSignOffAudit) restricted.push('Final Executive Ledger Audit Sign-Off');
  if (!actions.canManageBranding) restricted.push('Modify Company Name, Logo or Subscription');
  return restricted.slice(0, 5);
}

function buildRoleStoryboard(roleKey, isDeveloper = false) {
  const canonical = isDeveloper ? 'DEVELOPER_LANDLORD' : normalizeRoleKey(roleKey);
  const meta = isDeveloper ? DEVELOPER_PORTAL_META : resolveRoleMeta(canonical);
  const caps = isDeveloper
    ? {
      allowedTabs: ['TENANTS', 'GIS_MAP', 'DIAGNOSTICS', 'LOCK_SUBS', 'BACKUPS', 'MESSAGES'],
      actions: { canApproveTenants: true, canManagePlatform: true },
      allowedActionsList: (DEVELOPER_PORTAL_META.allowedCommands || []).map((c) => c.label),
      scopeSummary: 'Exclusive Platform Landlord Authority. Only Developer verifies KYB records and approves new institutions.',
    }
    : resolveRoleCapabilities(canonical);

  const tabTitles = isDeveloper
    ? ['Tenants & Approvals', 'Live GIS Map', 'Diagnostics & Logs', 'Lock & Security Alerts', 'PgDump Backups', 'Broadcast Messages']
    : (caps.allowedTabs || ['OVERVIEW']).map((t) => t.replace(/_/g, ' '));

  const commands = isDeveloper
    ? (DEVELOPER_PORTAL_META.allowedCommands || []).map((c) => ({ title: c.label, desc: c.desc }))
    : (caps.allowedActionsList || []).map((act, idx) => ({
      title: act,
      desc: `Authorized command #${idx + 1} inside ${tabTitles[Math.min(idx + 1, tabTitles.length - 1)] || 'Overview'}`,
    }));

  const checklist = getRoleDailyChecklist(canonical, caps, isDeveloper);
  const restricted = getRestrictedControlsSummary(canonical, caps, isDeveloper);

  return {
    canonical,
    title: meta.title,
    category: isDeveloper ? 'Isolated Developer Landlord Authority' : meta.category,
    subtitle: meta.subtitle,
    scopeSummary: caps.scopeSummary || meta.subtitle,
    tabTitles,
    commands,
    allowedActions: caps.allowedActionsList || [],
    restricted,
    checklist,
    slides: [
      {
        id: 'IDENTITY',
        title: `1. ${meta.title} — Role Identity & Boundary`,
        narration: `Welcome to the GBS Loan Management System walkthrough for ${meta.title}. ${caps.scopeSummary || meta.subtitle}`,
        bullets: [
          `Portal Title: ${meta.title} (${meta.category || 'GBS Platform'})`,
          caps.scopeSummary || meta.subtitle,
          'Strict environment separation: Demo Learning Sandbox never mixes with Real-Life Production.',
          'Tenant onboarding approval is exclusively restricted to GBS Developer Control Authority.',
        ],
      },
      {
        id: 'TABS',
        title: `2. Your Exact Workspace Tabs (${tabTitles.length})`,
        narration: `As ${meta.title}, your dashboard displays only ${tabTitles.length} permitted workspace sections tailored strictly to your role.`,
        bullets: tabTitles.map((tab, i) => `Tab ${i + 1}: ${tab}`),
      },
      {
        id: 'COMMANDS',
        title: `3. Exact Quick-Action Commands & Controls`,
        narration: `Perform your daily operations using your exact Quick-Action Commands: ${(caps.allowedActionsList || []).slice(0, 3).join(', ')}.`,
        bullets: commands.map((c) => `${c.title} — ${c.desc}`),
      },
      {
        id: 'ACTIONS_BOUNDARY',
        title: `4. Permitted Actions vs Restricted Controls`,
        narration: `Every button and API endpoint matches your exact clearance level. Out-of-scope approvals or records remain hidden and blocked by RBAC.`,
        bullets: [
          ...((caps.allowedActionsList || []).slice(0, 3).map((a) => `PERMITTED: ${a}`)),
          ...restricted.slice(0, 3).map((r) => `RESTRICTED: ${r}`),
        ],
      },
      {
        id: 'ACTIVITIES',
        title: `5. Step-by-Step Daily Activity Guide`,
        narration: `Follow these verified workflow steps from start of shift to completion. Every action is logged automatically in your scoped activity stream.`,
        bullets: checklist.map((step, i) => `Step ${i + 1}: ${step}`),
      },
    ],
  };
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let curY = y;
  let lineCount = 0;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = words[i];
      curY += lineHeight;
      lineCount += 1;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (line && lineCount < maxLines) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function drawRoundedRect(ctx, x, y, width, height, radius = 8) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export default function RoleVideoPresentationModal({
  isOpen,
  onClose,
  userRole = 'COMPANY_OWNER',
  isDeveloper = false,
  allowRoleSwitch = false,
}) {
  const initialRole = isDeveloper ? 'DEVELOPER_LANDLORD' : normalizeRoleKey(userRole);
  const canBrowseTeamVideos = Boolean(allowRoleSwitch || isDeveloper || initialRole === 'COMPANY_OWNER');

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [slideIndex, setSlideIndex] = useState(0);
  const [slideElapsed, setSlideElapsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [recordingState, setRecordingState] = useState('idle'); // idle | recording | error
  const [downloadNote, setDownloadNote] = useState('');

  const canvasRef = useRef(null);
  const crestImgRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  useEffect(() => {
    setSelectedRole(isDeveloper ? 'DEVELOPER_LANDLORD' : normalizeRoleKey(userRole));
    setSlideIndex(0);
    setSlideElapsed(0);
  }, [userRole, isDeveloper, isOpen]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/images/gbs-official-logo.jpeg';
    img.onload = () => { crestImgRef.current = img; };
  }, []);

  const storyboard = useMemo(
    () => buildRoleStoryboard(selectedRole, selectedRole === 'DEVELOPER_LANDLORD'),
    [selectedRole]
  );

  const currentSlide = storyboard.slides[slideIndex] || storyboard.slides[0];
  const totalDurationSec = storyboard.slides.length * ROLE_SLIDE_DURATION_SEC;
  const elapsedTotalSec = slideIndex * ROLE_SLIDE_DURATION_SEC + slideElapsed;

  // Optional Web Speech narration synced on slide transitions
  useEffect(() => {
    if (!isOpen || !voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    if (isPlaying && currentSlide?.narration) {
      const utter = new SpeechSynthesisUtterance(currentSlide.narration);
      utter.rate = 1.02;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [isOpen, voiceEnabled, isPlaying, slideIndex, selectedRole, currentSlide?.narration]);

  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [isOpen]);

  // Playback timer driving 30fps presentation progression
  useEffect(() => {
    if (!isOpen || !isPlaying) return undefined;
    const interval = setInterval(() => {
      setSlideElapsed((prev) => {
        if (prev + 0.1 >= ROLE_SLIDE_DURATION_SEC) {
          setSlideIndex((idx) => {
            if (idx + 1 >= storyboard.slides.length) {
              setIsPlaying(false);
              return idx;
            }
            return idx + 1;
          });
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, isPlaying, storyboard.slides.length]);

  // Draw crisp animated 1280x720 HD canvas frame
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#070E1C');
    bg.addColorStop(0.55, '#0F172A');
    bg.addColorStop(1, '#1A0B14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Subtle GBS® diagonal watermark pattern
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.28);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.045)';
    ctx.font = '800 54px Georgia, serif';
    for (let wx = -700; wx <= 700; wx += 260) {
      for (let wy = -460; wy <= 460; wy += 160) {
        ctx.fillText('GBS®', wx, wy);
      }
    }
    ctx.restore();

    // Top Gold Brand Header Bar
    ctx.fillStyle = 'rgba(6, 12, 24, 0.88)';
    ctx.fillRect(0, 0, W, 94);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 94);
    ctx.lineTo(W, 94);
    ctx.stroke();

    if (crestImgRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(62, 47, 28, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(crestImgRef.current, 34, 19, 56, 56);
      ctx.restore();
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(62, 47, 29, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#F4E07B';
    ctx.font = '800 22px Georgia, serif';
    ctx.fillText('GBS LOAN MANAGEMENT SYSTEM — ROLE WALKTHROUGH VIDEO', 108, 42);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(`${storyboard.title.toUpperCase()}  •  ${storyboard.category}`, 108, 68);

    // Right Pill Badge
    ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundedRect(ctx, W - 250, 26, 214, 40, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDE68A';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillText(`SCENE ${slideIndex + 1} OF ${storyboard.slides.length}  (${Math.floor(elapsedTotalSec)}s/${totalDurationSec}s)`, W - 232, 51);

    // Main Slide Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    drawRoundedRect(ctx, 48, 122, W - 96, H - 210, 18);
    ctx.fill();
    ctx.stroke();

    // Scene Title
    ctx.fillStyle = '#00F2FE';
    ctx.font = '800 32px Georgia, serif';
    ctx.fillText(currentSlide.title, 84, 176);

    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(84, 192, 120, 4);

    // Narration Subtitle Bar
    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'italic 18px system-ui, sans-serif';
    const nextY = wrapCanvasText(ctx, `"${currentSlide.narration}"`, 84, 228, W - 180, 25, 2);

    // Animated Bullets (progressive entrance inside slideElapsed)
    let curY = Math.max(nextY + 20, 286);
    const items = (currentSlide.bullets || []).slice(0, 6);
    items.forEach((bullet, idx) => {
      const threshold = idx * 0.45;
      const alpha = Math.min(1, Math.max(0.18, (slideElapsed + 0.6 - threshold) * 1.6));
      ctx.save();
      ctx.globalAlpha = alpha;

      const isRestricted = bullet.startsWith('RESTRICTED:');
      const isPermitted = bullet.startsWith('PERMITTED:');
      ctx.fillStyle = isRestricted ? 'rgba(127, 29, 29, 0.5)' : isPermitted ? 'rgba(6, 78, 59, 0.45)' : 'rgba(6, 12, 24, 0.8)';
      ctx.strokeStyle = isRestricted ? 'rgba(239, 68, 68, 0.55)' : isPermitted ? 'rgba(16, 185, 129, 0.55)' : 'rgba(212, 175, 55, 0.32)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      drawRoundedRect(ctx, 84, curY - 22, W - 168, 48, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isRestricted ? '#FCA5A5' : isPermitted ? '#34D399' : '#F4E07B';
      ctx.font = '800 17px system-ui, sans-serif';
      ctx.fillText(isRestricted ? 'LOCKED' : isPermitted ? 'ALLOW' : `0${idx + 1}`, 102, curY + 8);

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '500 18px system-ui, sans-serif';
      wrapCanvasText(ctx, bullet.replace(/^(PERMITTED:|RESTRICTED:)\s*/i, ''), 184, curY + 8, W - 290, 22, 1);

      ctx.restore();
      curY += 58;
    });

    // Bottom Progress Timeline Bar
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(48, H - 56, W - 96, 8);
    const pct = Math.min(1, elapsedTotalSec / totalDurationSec);
    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(48, H - 56, (W - 96) * pct, 8);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('GBS Official Company Training & Walkthrough  •  Live RBAC Verified', 48, H - 24);
    ctx.fillText(selectedRole, W - 260, H - 24);
  }, [storyboard, slideIndex, slideElapsed, currentSlide, elapsedTotalSec, totalDurationSec, selectedRole]);

  useEffect(() => {
    if (isOpen) drawFrame();
  }, [isOpen, drawFrame]);

  const handleDownloadVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setRecordingState('error');
      setDownloadNote('Browser video recording (MediaRecorder) is unavailable here. Use interactive playback above.');
      return;
    }

    setRecordingState('recording');
    setDownloadNote('Rendering & encoding role walkthrough video (.webm)... Please wait a few seconds.');
    setSlideIndex(0);
    setSlideElapsed(0);
    setIsPlaying(true);

    const stream = canvas.captureStream(24);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    const chunks = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunks.push(ev.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GBS-Walkthrough-${selectedRole}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      setRecordingState('idle');
      setDownloadNote(`Downloaded GBS-Walkthrough-${selectedRole}.webm (${Math.max(1, Math.round(blob.size / 1024))} KB).`);
    };

    recorder.start(250);
    // Record compact accelerated showcase (~6s) stepping across all 5 scenes cleanly
    let stepIdx = 0;
    const timer = setInterval(() => {
      stepIdx += 1;
      if (stepIdx < storyboard.slides.length) {
        setSlideIndex(stepIdx);
        setSlideElapsed(1.5);
      } else {
        clearInterval(timer);
        setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
        }, 900);
      }
    }, 1150);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Role Walkthrough Video Presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1250,
        background: 'rgba(4, 8, 16, 0.86)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(980px, 96vw)', maxHeight: '92vh', overflowY: 'auto', padding: 20, borderColor: 'rgba(212,175,55,0.55)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Video size={20} color="#D4AF37" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#F4E07B' }}>
                {storyboard.title} — Walkthrough Video Presentation
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Interactive visual guide covering your exact tabs, commands, actions, controls &amp; daily activities.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {canBrowseTeamVideos && (
              <select
                className="gbs-select"
                style={{ width: 210, padding: '6px 10px', fontSize: '0.78rem' }}
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setSlideIndex(0);
                  setSlideElapsed(0);
                  setIsPlaying(true);
                }}
                aria-label="Select Role Training Video"
              >
                {(isDeveloper || allowRoleSwitch) && (
                  <option value="DEVELOPER_LANDLORD">Developer Control Authority</option>
                )}
                {ROLES_META.map((r) => (
                  <option key={r.key} value={r.key}>{r.title}</option>
                ))}
              </select>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: '6px 10px' }} aria-label="Close Video Player">
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {/* 16:9 HD Animated Presentation Canvas */}
        <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(212,175,55,0.45)', background: '#040810', marginBottom: 12 }}>
          <canvas ref={canvasRef} width={1280} height={720} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>

        {/* Playback Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.8rem' }}
              onClick={() => {
                if (!isPlaying && slideIndex === storyboard.slides.length - 1 && slideElapsed >= ROLE_SLIDE_DURATION_SEC - 0.2) {
                  setSlideIndex(0);
                  setSlideElapsed(0);
                }
                setIsPlaying((p) => !p);
              }}
            >
              {isPlaying ? <><Pause size={14} /> Pause Video</> : <><Play size={14} /> Play Video</>}
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '7px 10px', fontSize: '0.78rem' }} onClick={() => { setSlideIndex((i) => Math.max(0, i - 1)); setSlideElapsed(0); }}>
              <SkipBack size={14} /> Prev
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '7px 10px', fontSize: '0.78rem' }} onClick={() => { setSlideIndex((i) => Math.min(storyboard.slides.length - 1, i + 1)); setSlideElapsed(0); }}>
              Next <SkipForward size={14} />
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '7px 10px', fontSize: '0.78rem' }} onClick={() => { setSlideIndex(0); setSlideElapsed(0); setIsPlaying(true); }}>
              <RotateCcw size={14} /> Restart
            </button>
            <button
              type="button"
              className={voiceEnabled ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '7px 12px', fontSize: '0.78rem' }}
              onClick={() => setVoiceEnabled((v) => !v)}
            >
              {voiceEnabled ? <><Volume2 size={14} /> Voiceover ON</> : <><VolumeX size={14} /> Voiceover OFF</>}
            </button>
          </div>

          <button
            type="button"
            disabled={recordingState === 'recording'}
            className="btn btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.8rem', borderColor: '#38BDF8' }}
            onClick={handleDownloadVideo}
          >
            <Download size={14} /> {recordingState === 'recording' ? 'Recording Video...' : 'Download Video (.webm)'}
          </button>
        </div>

        {/* Scene Chapters Strip */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {storyboard.slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={slideIndex === idx ? 'btn btn-primary' : 'btn btn-secondary'}
              style={{ padding: '5px 10px', fontSize: '0.74rem' }}
              onClick={() => { setSlideIndex(idx); setSlideElapsed(0); }}
            >
              {s.title}
            </button>
          ))}
        </div>

        {downloadNote && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', color: '#BAE6FD', fontSize: '0.78rem', marginBottom: 12 }}>
            {downloadNote}
          </div>
        )}

        {/* Quick Reference Card Below Video Player */}
        <div className="gbs-grid-2" style={{ gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(16,185,129,0.3)' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#34D399', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={14} /> PERMITTED ACTIONS &amp; WORKSPACE COMMANDS
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: '#E2E8F0', lineHeight: 1.55 }}>
              {storyboard.allowedActions.map((act) => (
                <li key={act}>{act}</li>
              ))}
            </ul>
          </div>
          <div style={{ padding: 12, borderRadius: 10, background: 'rgba(6,12,24,0.8)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#FCA5A5', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> RESTRICTED OUT-OF-SCOPE CONTROLS
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.55 }}>
              {storyboard.restricted.map((res) => (
                <li key={res}>{res}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Reusable trigger button that opens the Role Walkthrough Video Presentation
 * modal from entry pages (Onboarding, Login, Developer Login) or dashboards.
 */
export function RoleVideoTrigger({
  userRole = 'COMPANY_OWNER',
  isDeveloper = false,
  allowRoleSwitch = false,
  label = 'Watch Role Walkthrough Video',
  className = 'btn btn-primary',
  style = {},
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        style={style}
        data-testid="role-video-trigger"
      >
        <Video size={16} />
        <span>{label}</span>
      </button>
      <RoleVideoPresentationModal
        isOpen={open}
        onClose={() => setOpen(false)}
        userRole={userRole}
        isDeveloper={isDeveloper}
        allowRoleSwitch={allowRoleSwitch}
      />
    </>
  );
}
