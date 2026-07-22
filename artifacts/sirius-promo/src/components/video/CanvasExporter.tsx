import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const CW = 1080;
const CH = 1920;

const CYAN  = '#00C4FF';
const GREEN = '#00E5A0';
const WHITE = '#EDF4FF';
const DIM   = 'rgba(237,244,255,0.45)';
const BG    = '#0D1E3A';

// Scene durations (ms) — must match VideoTemplate
const DURATIONS = [4500, 5000, 5000, 5500, 5000];
const TOTAL_MS  = DURATIONS.reduce((a, b) => a + b, 0); // 25000

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp  = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

/** Returns 0→1 opacity as t (ms) moves through [start, end] */
function fadeIn(t: number, start: number, end: number): number {
  return easeOut((t - start) / (end - start));
}
function fadeOut(t: number, start: number, end: number): number {
  return 1 - easeOut((t - start) / (end - start));
}

function setAlpha(ctx: CanvasRenderingContext2D, a: number) {
  ctx.globalAlpha = clamp(a, 0, 1);
}

function fillText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'center',
  bold = false,
  shadow?: { color: string; blur: number }
) {
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.font = `${bold ? '700' : '300'} ${size}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blur;
  }
  ctx.fillText(text, x, y);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill?: string, stroke?: string, strokeW = 3
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = strokeW; ctx.stroke(); }
}

function glowCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, color.replace(')', `, ${alpha})`).replace('rgb', 'rgba'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawStarfield(ctx: CanvasRenderingContext2D, t: number) {
  // Simple pseudo-random stars based on index
  ctx.fillStyle = 'rgba(237,244,255,0.6)';
  for (let i = 0; i < 80; i++) {
    const x = ((i * 137.508 + 50) % 1) * CW;
    const y = ((i * 91.234 + 20) % 1) * CH;
    const twinkle = 0.3 + 0.4 * Math.sin(t / 800 + i);
    ctx.globalAlpha = twinkle;
    ctx.beginPath();
    ctx.arc(
      Math.abs(Math.sin(i * 13.7)) * CW,
      Math.abs(Math.cos(i * 7.3)) * CH,
      1 + (i % 3) * 0.5,
      0, Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── Scene renderers (local time t in ms) ─────────────────────────────────────

function drawScene1(ctx: CanvasRenderingContext2D, t: number) {
  const cx = CW / 2;

  // Cyan glow top-left
  glowCircle(ctx, cx * 0.6, CH * 0.3, 600, 'rgb(0,196,255)', 0.18);

  // "Every other AI forgets you."
  const strikeProg = clamp((t - 1100) / 500, 0, 1);
  setAlpha(ctx, fadeIn(t, 200, 900));
  fillText(ctx, 'Every other AI forgets you.', cx, CH * 0.36, 54, 'rgba(237,244,255,0.35)');
  ctx.globalAlpha = 1;

  // Strikethrough
  if (strikeProg > 0) {
    ctx.globalAlpha = 0.8;
    const tw = ctx.measureText('Every other AI forgets you.').width;
    const sy = CH * 0.36;
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx - tw / 2, sy);
    ctx.lineTo(cx - tw / 2 + tw * strikeProg, sy);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // "SIRIUS"
  setAlpha(ctx, fadeIn(t, 2000, 3000));
  fillText(ctx, 'SIRIUS', cx, CH * 0.46, 180, WHITE, 'center', true, { color: '#00C4FF', blur: 60 });
  ctx.globalAlpha = 1;

  // "never does."
  setAlpha(ctx, fadeIn(t, 2400, 3200));
  fillText(ctx, 'never does.', cx, CH * 0.54, 100, CYAN, 'center', false, { color: CYAN, blur: 40 });
  ctx.globalAlpha = 1;

  // tagline
  setAlpha(ctx, fadeIn(t, 3000, 4000));
  fillText(ctx, 'The AI that grows with you', cx, CH * 0.62, 44, DIM);
  ctx.globalAlpha = 1;
}

function drawScene2(ctx: CanvasRenderingContext2D, t: number) {
  const cx = CW / 2;
  const ITEMS = [
    { label: 'Your goals',         color: CYAN  },
    { label: 'Your voice',         color: GREEN },
    { label: 'Your breakthroughs', color: '#a78bfa' },
    { label: 'Your plans',         color: CYAN  },
    { label: 'Your history',       color: GREEN },
  ];

  glowCircle(ctx, cx * 1.4, CH * 0.7, 550, 'rgb(0,229,160)', 0.14);

  // Header
  setAlpha(ctx, fadeIn(t, 300, 900));
  fillText(ctx, '◈ Mnemosyne Memory Engine', cx, CH * 0.28, 38, DIM);
  ctx.globalAlpha = 1;

  // Memory items
  const itemH = 110;
  const itemY0 = CH * 0.34;
  ITEMS.forEach((item, i) => {
    const appear = 300 + i * 600;
    const a = fadeIn(t, appear, appear + 400);
    setAlpha(ctx, a);
    const x0 = lerp(cx + 40, cx - 460, easeOut((t - appear) / 400));
    const y = itemY0 + i * (itemH + 16);
    roundedRect(ctx, x0, y, 920, itemH, 22, 'rgba(255,255,255,0.05)', item.color + '40', 3);
    ctx.globalAlpha = clamp(a, 0, 1);
    // dot
    ctx.beginPath();
    ctx.arc(x0 + 44, y + itemH / 2, 14, 0, Math.PI * 2);
    ctx.fillStyle = item.color;
    ctx.shadowColor = item.color;
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;
    fillText(ctx, item.label, x0 + 78, y + itemH / 2, 48, WHITE, 'left', true);
    fillText(ctx, 'SAVED ✓', x0 + 880, y + itemH / 2, 34, item.color, 'right');
    ctx.globalAlpha = 1;
  });

  // "Remembered. Forever."
  setAlpha(ctx, fadeIn(t, 3600, 4300));
  fillText(ctx, 'Remembered.', cx, CH * 0.8, 72, WHITE, 'center', false);
  fillText(ctx, 'Forever.', cx, CH * 0.8 + 84, 72, GREEN, 'center', false, { color: GREEN, blur: 30 });
  ctx.globalAlpha = 1;

  // sub
  setAlpha(ctx, fadeIn(t, 4000, 4800));
  fillText(ctx, "ChatGPT forgets. Claude forgets. Sirius doesn't.", cx, CH * 0.87, 36, DIM);
  ctx.globalAlpha = 1;
}

function drawScene3(ctx: CanvasRenderingContext2D, t: number) {
  const cx = CW / 2;
  const MODES = ['Guru', 'Coach', 'Scientist', 'Sage', 'Creative', 'Friend', 'Tutor', 'Research', 'Manifest'];
  const MODE_COLORS = [
    '#a78bfa', CYAN, GREEN, '#f59e0b', '#f472b6', CYAN,
    GREEN, '#a78bfa', '#c084fc',
  ];

  glowCircle(ctx, cx * 0.5, CH * 0.5, 700, 'rgb(0,196,255)', 0.12);

  setAlpha(ctx, fadeIn(t, 300, 900));
  fillText(ctx, '◈ Adaptive Intelligence', cx, CH * 0.2, 38, DIM);
  ctx.globalAlpha = 1;

  setAlpha(ctx, fadeIn(t, 700, 1400));
  fillText(ctx, '9 minds.', cx, CH * 0.28, 100, WHITE, 'center', false);
  fillText(ctx, 'One AI.', cx, CH * 0.36, 100, CYAN, 'center', false, { color: CYAN, blur: 35 });
  ctx.globalAlpha = 1;

  // 3×3 grid
  const cols = 3, rows = 3;
  const cellW = 290, cellH = 110, gap = 20;
  const gridW = cols * cellW + (cols - 1) * gap;
  const gridH = rows * cellH + (rows - 1) * gap;
  const gx0 = cx - gridW / 2;
  const gy0 = CH * 0.45;

  MODES.forEach((mode, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const appear = 900 + i * 60;
    const a = fadeIn(t, appear, appear + 400);
    setAlpha(ctx, a);
    const x = gx0 + col * (cellW + gap);
    const y = gy0 + row * (cellH + gap);
    roundedRect(ctx, x, y, cellW, cellH, 22, 'rgba(255,255,255,0.05)', MODE_COLORS[i] + '30', 2);
    fillText(ctx, mode, x + cellW / 2, y + cellH / 2, 42, WHITE, 'center', true);
    ctx.globalAlpha = 1;
  });

  setAlpha(ctx, fadeIn(t, 4500, 5000));
  fillText(ctx, 'Adapts to how you want to think.', cx, CH * 0.82, 44, DIM);
  ctx.globalAlpha = 1;
}

function drawScene4(ctx: CanvasRenderingContext2D, t: number) {
  const cx = CW / 2;

  glowCircle(ctx, cx * 1.6, CH * 0.3, 500, 'rgb(0,229,160)', 0.14);

  setAlpha(ctx, fadeIn(t, 300, 900));
  fillText(ctx, '◈ Beyond Chat', cx, CH * 0.2, 38, DIM);
  ctx.globalAlpha = 1;

  setAlpha(ctx, fadeIn(t, 700, 1400));
  fillText(ctx, 'Not a chatbot.', cx, CH * 0.28, 88, WHITE, 'center', false);
  fillText(ctx, 'A co-founder.', cx, CH * 0.36, 88, CYAN, 'center', false, { color: CYAN, blur: 35 });
  ctx.globalAlpha = 1;

  // Two columns
  const colY = CH * 0.44;
  const colH = 340;
  const colW = 460;
  const colGap = 40;
  const leftX = cx - colW - colGap / 2;
  const rightX = cx + colGap / 2;

  // Star Lab
  const aLeft = fadeIn(t, 1200, 1900);
  setAlpha(ctx, aLeft);
  roundedRect(ctx, leftX, colY, colW, colH, 28, 'rgba(10,22,40,0.8)', CYAN + '50', 3);
  fillText(ctx, '★  STAR LAB', leftX + colW / 2, colY + 54, 36, CYAN, 'center', true);
  ['Build apps', 'Generate designs', 'Write & deploy code', 'Create anything'].forEach((f, i) => {
    const fa = fadeIn(t, 2200 + i * 80, 2600 + i * 80);
    setAlpha(ctx, Math.min(aLeft, fa));
    fillText(ctx, '▸  ' + f, leftX + 30, colY + 120 + i * 56, 36, 'rgba(237,244,255,0.8)', 'left');
  });
  ctx.globalAlpha = 1;

  // Dream Lab
  const aRight = fadeIn(t, 1300, 2000);
  setAlpha(ctx, aRight);
  roundedRect(ctx, rightX, colY, colW, colH, 28, 'rgba(10,22,40,0.8)', GREEN + '50', 3);
  fillText(ctx, '◉  DREAM LAB', rightX + colW / 2, colY + 54, 36, GREEN, 'center', true);
  ['Track your goals', 'Map your future', 'Daily check-ins', 'Manifest plans'].forEach((f, i) => {
    const fa = fadeIn(t, 2300 + i * 80, 2700 + i * 80);
    setAlpha(ctx, Math.min(aRight, fa));
    fillText(ctx, '▸  ' + f, rightX + 30, colY + 120 + i * 56, 36, 'rgba(237,244,255,0.8)', 'left');
  });
  ctx.globalAlpha = 1;

  // Footer quote
  setAlpha(ctx, fadeIn(t, 4600, 5500));
  roundedRect(ctx, 80, CH * 0.83, CW - 160, 120, 20, 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.08)', 2);
  fillText(ctx, 'ChatGPT gives you answers.', cx, CH * 0.855, 38, DIM);
  fillText(ctx, 'Sirius gives you results.', cx, CH * 0.885, 44, WHITE, 'center', true);
  ctx.globalAlpha = 1;
}

function drawScene5(ctx: CanvasRenderingContext2D, t: number) {
  const cx = CW / 2;
  const BULLETS = [
    '9 specialist AI modes',
    'Remembers everything, forever',
    'Builds & deploys real projects',
    'Tracks your goals daily',
    'Available on web + mobile',
  ];

  glowCircle(ctx, cx, CH * 0.35, 700, 'rgb(0,196,255)', 0.22);

  // Logo circle
  setAlpha(ctx, fadeIn(t, 300, 1000));
  ctx.beginPath();
  ctx.arc(cx, CH * 0.25, 80, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(13,30,58,0.9)';
  ctx.fill();
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 5;
  ctx.shadowColor = CYAN;
  ctx.shadowBlur = 30;
  ctx.stroke();
  ctx.shadowBlur = 0;
  fillText(ctx, '✦', cx, CH * 0.25, 72, CYAN, 'center', true, { color: CYAN, blur: 20 });
  ctx.globalAlpha = 1;

  // SIRIUS
  setAlpha(ctx, fadeIn(t, 500, 1200));
  fillText(ctx, 'SIRIUS', cx, CH * 0.34, 160, WHITE, 'center', true, { color: CYAN, blur: 40 });
  ctx.globalAlpha = 1;

  setAlpha(ctx, fadeIn(t, 700, 1400));
  fillText(ctx, 'sirius-ai.live', cx, CH * 0.41, 46, DIM);
  ctx.globalAlpha = 1;

  // Bullets
  BULLETS.forEach((b, i) => {
    setAlpha(ctx, fadeIn(t, 900 + i * 120, 1300 + i * 120));
    const y = CH * 0.5 + i * 72;
    fillText(ctx, '✦', cx - 340, y, 36, GREEN, 'left', true, { color: GREEN, blur: 10 });
    fillText(ctx, b, cx - 290, y, 46, WHITE, 'left', true);
    ctx.globalAlpha = 1;
  });

  // CTA
  setAlpha(ctx, fadeIn(t, 3200, 4000));
  fillText(ctx, "It's free to join", cx, CH * 0.77, 52, WHITE, 'center', true);
  ctx.globalAlpha = 1;

  setAlpha(ctx, fadeIn(t, 4000, 4800));
  const grad = ctx.createLinearGradient(cx - 380, 0, cx + 380, 0);
  grad.addColorStop(0, '#00C4FF');
  grad.addColorStop(1, '#00E5A0');
  roundedRect(ctx, cx - 380, CH * 0.83, 760, 130, 36, undefined, undefined);
  ctx.fillStyle = grad;
  ctx.shadowColor = '#00C4FF';
  ctx.shadowBlur = 40;
  roundedRect(ctx, cx - 380, CH * 0.83, 760, 130, 36, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  fillText(ctx, 'sirius-ai.live', cx, CH * 0.83 + 65, 58, '#0D1E3A', 'center', true);
  ctx.globalAlpha = 1;
}

// ── Main render function ──────────────────────────────────────────────────────

function renderFrame(ctx: CanvasRenderingContext2D, t: number) {
  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CH);
  bg.addColorStop(0, '#08111f');
  bg.addColorStop(1, '#0D1E3A');
  ctx.globalAlpha = 1;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CW, CH);

  drawStarfield(ctx, t);

  const s0 = DURATIONS[0];
  const s1 = DURATIONS[0] + DURATIONS[1];
  const s2 = s1 + DURATIONS[2];
  const s3 = s2 + DURATIONS[3];

  if      (t < s0) drawScene1(ctx, t);
  else if (t < s1) drawScene2(ctx, t - s0);
  else if (t < s2) drawScene3(ctx, t - s1);
  else if (t < s3) drawScene4(ctx, t - s2);
  else             drawScene5(ctx, t - s3);
}

// ── iOS detection ─────────────────────────────────────────────────────────────
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getBestMimeType(): string {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────────

type ExportState = 'idle' | 'recording' | 'sharing' | 'done' | 'error';

export function CanvasExporter({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const ios = isIOS();

  // Keep canvas rendering the animation even before recording starts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let running = true;
    const start = performance.now();
    function loop() {
      if (!running) return;
      const elapsed = (performance.now() - start) % TOTAL_MS;
      renderFrame(ctx!, elapsed);
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  const startExport = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Stop the preview loop
    cancelAnimationFrame(rafRef.current);

    const ctx = canvas.getContext('2d');
    if (!ctx) { setState('error'); setErrorMsg('Canvas not available on this device.'); return; }

    const mimeType = getBestMimeType();
    if (!mimeType) {
      setState('error');
      setErrorMsg('Your browser does not support video recording. Try on a newer device or use Safari on iOS 15+.');
      return;
    }

    chunksRef.current = [];
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(30);
    } catch {
      setState('error');
      setErrorMsg('Could not capture the canvas. Make sure you\'re using Safari on iOS 14+ or a modern browser.');
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
    recorderRef.current = recorder;
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `sirius-tiktok-promo.${ext}`;

      setState('sharing');
      try {
        const file = new File([blob], filename, { type: mimeType });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Sirius Star Lab', text: 'sirius-ai.live' });
          setState('done');
        } else {
          // Desktop fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
          setState('done');
        }
      } catch (e: unknown) {
        // User cancelled share sheet — not really an error
        if (e instanceof Error && e.name === 'AbortError') {
          setState('done');
        } else {
          setState('error');
          setErrorMsg('Sharing failed. The file was recorded but could not be shared.');
        }
      }
    };

    // Render loop for recording
    setState('recording');
    startTimeRef.current = performance.now();
    recorder.start(250);

    function recordLoop() {
      const elapsed = performance.now() - startTimeRef.current;
      const prog = Math.min(elapsed / TOTAL_MS, 1);
      setProgress(prog);
      renderFrame(ctx!, elapsed);

      if (elapsed >= TOTAL_MS) {
        recorder.stop();
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      rafRef.current = requestAnimationFrame(recordLoop);
    }
    recordLoop();
  }, []);

  const secondsLeft = Math.max(0, Math.ceil((TOTAL_MS / 1000) * (1 - progress)));

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto py-8 px-4">

      {/* Canvas preview */}
      <div className="w-full max-w-[220px] aspect-[9/16] rounded-2xl overflow-hidden border border-white/20 mb-6 shadow-2xl shrink-0">
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          className="w-full h-full object-cover"
        />
      </div>

      {/* UI panel */}
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1a2e] p-6 text-center">

        {state === 'idle' && (
          <>
            <div className="text-3xl mb-3">{ios ? '📲' : '🎬'}</div>
            <h2 className="text-white text-lg font-bold mb-2">
              {ios ? 'Save to Photos' : 'Download Video'}
            </h2>
            <p className="text-white/55 text-sm mb-5 leading-relaxed">
              {ios
                ? 'Tap below to record all 5 scenes (~26 seconds), then your iOS share sheet will open so you can save directly to your Camera Roll.'
                : 'Records all 5 scenes to a video file and downloads it automatically.'}
            </p>
            <button
              onClick={startExport}
              className="w-full py-4 rounded-2xl font-bold text-base tracking-wide mb-3"
              style={{ background: 'linear-gradient(135deg,#00C4FF,#00E5A0)', color: '#0D1E3A' }}
            >
              {ios ? '▶  Start Recording' : '⬇  Download Video'}
            </button>
            <button onClick={onClose} className="w-full py-3 text-white/40 text-sm hover:text-white/70 transition-colors">
              Cancel
            </button>
          </>
        )}

        {state === 'recording' && (
          <>
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="w-14 h-14 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-white text-lg font-bold mb-1">Recording…</h2>
            <p className="text-white/50 text-xs mb-4">Keep this screen open</p>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg,#00C4FF,#00E5A0)' }}
              />
            </div>
            <p className="text-[#00C4FF] font-mono text-lg font-bold">{secondsLeft}s remaining</p>
          </>
        )}

        {state === 'sharing' && (
          <>
            <div className="text-4xl mb-3">⏳</div>
            <h2 className="text-white text-lg font-bold mb-2">Opening share sheet…</h2>
            <p className="text-white/50 text-sm">Choose <strong className="text-white">Save Video</strong> to add it to your Camera Roll</p>
          </>
        )}

        {state === 'done' && (
          <>
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-white text-lg font-bold mb-2">
              {ios ? 'Saved to Photos!' : 'Video downloaded!'}
            </h2>
            <p className="text-white/55 text-sm mb-5">
              {ios
                ? 'Open the Photos app and look in your Camera Roll. Ready to upload to TikTok!'
                : 'Check your Downloads folder. Convert to MP4 if needed before uploading.'}
            </p>
            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl font-bold"
              style={{ background: 'linear-gradient(135deg,#00C4FF,#00E5A0)', color: '#0D1E3A' }}
            >
              Done
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-white text-lg font-bold mb-2">Couldn't record</h2>
            <p className="text-white/55 text-sm mb-5 leading-relaxed">{errorMsg}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setState('idle'); setProgress(0); }}
                className="w-full py-4 rounded-2xl font-bold"
                style={{ background: 'linear-gradient(135deg,#00C4FF,#00E5A0)', color: '#0D1E3A' }}
              >
                Try Again
              </button>
              <button onClick={onClose} className="w-full py-3 text-white/40 text-sm hover:text-white/70 transition-colors">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
