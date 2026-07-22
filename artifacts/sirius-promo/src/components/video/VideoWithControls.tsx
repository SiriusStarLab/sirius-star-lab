import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Repeat, Maximize2, Music, VolumeX } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from '@/lib/video/controls/useSceneControls';
import { useFuturisticMusic } from '@/lib/video/useFuturisticMusic';
import { CanvasExporter } from './CanvasExporter';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

const PROGRESS_TICK_MS = 60;
const TOTAL_DURATION_MS = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  musicEnabled: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onToggleLock: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
  onToggleMusic: () => void;
  onOpenFullscreen: () => void;
}

function ProgressSegments({
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onJumpTo,
}: {
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  onJumpTo: (index: number) => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    setElapsed(0);
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed(performance.now() - start);
    }, PROGRESS_TICK_MS);
    return () => window.clearInterval(id);
  }, [tick]);

  const progress = activeDuration > 0 ? Math.min(1, elapsed / activeDuration) : 0;

  return (
    <div className="flex-1 flex items-center gap-1.5">
      {sceneKeys.map((key, i) => {
        const isActive = i === activeIndex;
        const fill = isActive ? progress * 100 : 0;
        return (
          <button
            key={key}
            onClick={() => onJumpTo(i)}
            className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-4 hover:bg-white/25 transition-all relative min-h-[12px]"
            aria-label={`Jump to scene ${i + 1}`}
            aria-current={isActive ? 'true' : undefined}
          >
            <div
              className="absolute inset-y-0 left-0 bg-white/90 rounded-full transition-[width] duration-100"
              style={{ width: `${fill}%` }}
            />
          </button>
        );
      })}
    </div>
  );
}

function ControlBar({
  visible,
  collapsed,
  locked,
  musicEnabled,
  sceneKeys,
  activeIndex,
  activeDuration,
  tick,
  onToggleLock,
  onJumpTo,
  onToggleCollapsed,
  onToggleMusic,
  onOpenFullscreen,
}: ControlBarProps) {
  return (
    <div
      className={`flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-3 transition-all duration-200 ease-out ${
        visible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      aria-hidden={!visible}
    >
      <button
        onClick={onToggleLock}
        className={`w-12 h-12 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          locked
            ? 'text-white bg-white/15 hover:bg-white/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={locked ? 'Loop scene: on' : 'Loop scene: off'}
        aria-label={locked ? 'Loop scene: on' : 'Loop scene: off'}
        aria-pressed={locked}
      >
        <Repeat className="w-6 h-6" />
      </button>

      <button
        onClick={onToggleMusic}
        className={`w-12 h-12 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          musicEnabled
            ? 'text-[#00C4FF] bg-[#00C4FF]/15 hover:bg-[#00C4FF]/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={musicEnabled ? 'Music: on' : 'Music: off'}
        aria-label={musicEnabled ? 'Music: on' : 'Music: off'}
        aria-pressed={musicEnabled}
      >
        {musicEnabled ? <Music className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
      </button>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <ProgressSegments
        sceneKeys={sceneKeys}
        activeIndex={activeIndex}
        activeDuration={activeDuration}
        tick={tick}
        onJumpTo={onJumpTo}
      />

      <div className="text-sm text-white/60 font-mono tabular-nums shrink-0">
        {activeIndex + 1}/{sceneKeys.length}
      </div>

      <div className="w-px self-stretch bg-white/15" aria-hidden="true" />

      <button
        onClick={onOpenFullscreen}
        className="w-12 h-12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title="Open in new tab"
        aria-label="Open in new tab"
      >
        <Maximize2 className="w-6 h-6" />
      </button>

      <button
        onClick={onToggleCollapsed}
        className="w-12 h-12 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors rounded-lg shrink-0"
        title={collapsed ? 'Show controls' : 'Hide controls'}
        aria-label={collapsed ? 'Show controls' : 'Hide controls'}
        aria-expanded={!collapsed}
      >
        {collapsed ? <ChevronUp className="w-8 h-8" /> : <ChevronDown className="w-8 h-8" />}
      </button>
    </div>
  );
}

// ── Export Modal ─────────────────────────────────────────────────────────────

type ExportStep = 'idle' | 'instructions' | 'recording' | 'done' | 'error';

function ExportModal({
  step,
  secondsLeft,
  onStart,
  onClose,
}: {
  step: ExportStep;
  secondsLeft: number;
  onStart: () => void;
  onClose: () => void;
}) {
  if (step === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm px-6">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1a2e] p-7 shadow-2xl text-center">

        {step === 'instructions' && (
          <>
            <div className="text-4xl mb-4">🎬</div>
            <h2 className="text-white text-xl font-bold mb-2">Export your TikTok video</h2>
            <p className="text-white/60 text-sm mb-5 leading-relaxed">
              Your browser will ask you to <strong className="text-white">share this tab</strong>.
              Select <strong className="text-white">"This Tab"</strong> then click Share.
              The video will play from the start and save automatically when finished.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onStart}
                className="w-full py-3.5 rounded-2xl font-bold text-base tracking-wide"
                style={{ background: 'linear-gradient(135deg, #00C4FF, #00E5A0)', color: '#0D1E3A' }}
              >
                Start Recording
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl text-white/50 text-sm hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'recording' && (
          <>
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 rounded-full border-4 border-red-500/30 border-t-red-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
            <h2 className="text-white text-xl font-bold mb-1">Recording…</h2>
            <p className="text-white/50 text-sm mb-4">
              Playing from scene 1 — saves automatically when done
            </p>
            <div className="w-full bg-white/10 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(0, 100 - (secondsLeft / (TOTAL_DURATION_MS / 1000)) * 100)}%`,
                  background: 'linear-gradient(90deg, #00C4FF, #00E5A0)',
                }}
              />
            </div>
            <p className="text-[#00C4FF] font-mono text-lg font-bold">{secondsLeft}s remaining</p>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-white text-xl font-bold mb-2">Video saved!</h2>
            <p className="text-white/60 text-sm mb-5 leading-relaxed">
              <strong className="text-white">sirius-tiktok-promo.webm</strong> has been downloaded.
              Open it in VLC or convert to MP4 with any free tool before uploading to TikTok.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl font-bold text-base"
              style={{ background: 'linear-gradient(135deg, #00C4FF, #00E5A0)', color: '#0D1E3A' }}
            >
              Done
            </button>
          </>
        )}

        {step === 'error' && (
          <>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">Couldn't start recording</h2>
            <p className="text-white/60 text-sm mb-5 leading-relaxed">
              Make sure you click <strong className="text-white">"Share"</strong> in the browser dialog and
              select <strong className="text-white">this tab</strong>. Try again below.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onStart}
                className="w-full py-3.5 rounded-2xl font-bold text-base"
                style={{ background: 'linear-gradient(135deg, #00C4FF, #00E5A0)', color: '#0D1E3A' }}
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 text-white/50 text-sm hover:text-white/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function VideoWithControls() {
  const isIframed = typeof window !== 'undefined' && window.self !== window.top;

  const {
    sceneKeys,
    activeIndex,
    locked,
    mountKey,
    tick,
    durations,
    activeDuration,
    onSceneChange,
    jumpTo,
    toggleLock,
  } = useSceneControls(SCENE_DURATIONS);

  const sensorRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [tapPinned, setTapPinned] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const [showCanvasExporter, setShowCanvasExporter] = useState(false);
  const [exportStep, setExportStep] = useState<ExportStep>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMusic = musicEnabled && audioUnlocked;
  useFuturisticMusic(activeMusic);

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(true);
  }, []);
  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') setHovering(false);
  }, []);
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse') return;
    if (collapsed) setTapPinned(true);
  }, [collapsed]);
  const handleToggleCollapsed = useCallback(() => {
    setCollapsed(c => {
      if (!c) { setHovering(false); setTapPinned(false); }
      return !c;
    });
  }, []);

  useEffect(() => {
    if (!(collapsed && tapPinned)) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const sensor = sensorRef.current;
      if (sensor && !sensor.contains(e.target as Node)) setTapPinned(false);
    };
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [collapsed, tapPinned]);

  const handleOpenFullscreen = useCallback(() => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  }, []);

  const handleUnlockAudio = useCallback(() => {
    setAudioUnlocked(true);
  }, []);

  // ── Export flow ─────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    mediaRecorderRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (autoStopRef.current) clearTimeout(autoStopRef.current);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'sirius-tiktok-promo.webm';
          a.click();
          URL.revokeObjectURL(url);
          setExportStep('done');
        } else {
          setExportStep('error');
        }
      };

      // Jump to scene 1 and start recording simultaneously
      jumpTo(0);
      recorder.start(250);
      setExportStep('recording');

      const totalSeconds = Math.ceil(TOTAL_DURATION_MS / 1000) + 1;
      setSecondsLeft(totalSeconds);
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => Math.max(0, s - 1));
      }, 1000);

      // Auto-stop after total duration + 800ms buffer
      autoStopRef.current = setTimeout(() => {
        recorder.stop();
      }, TOTAL_DURATION_MS + 800);

    } catch {
      setExportStep('error');
    }
  }, [jumpTo]);

  const handleExportClick = useCallback(() => {
    if (isIOS()) {
      setShowCanvasExporter(true);
    } else {
      setExportStep('instructions');
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    stopRecording();
    setExportStep('idle');
  }, [stopRecording]);

  const barVisible = !collapsed || hovering || tapPinned;

  if (!isIframed) return <VideoTemplate voiceEnabled={false} />;

  return (
    <div className="relative w-full h-screen">
      <VideoTemplate
        key={mountKey}
        durations={durations}
        loop
        voiceEnabled={false}
        onSceneChange={onSceneChange}
      />

      {/* Music unlock overlay */}
      {!audioUnlocked && (
        <button
          onClick={handleUnlockAudio}
          className="absolute inset-0 z-40 flex flex-col items-center justify-start pt-12 w-full h-full bg-transparent cursor-pointer"
          aria-label="Tap to play music"
        >
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-5 py-2.5">
            <span className="text-lg">🎵</span>
            <span className="text-white text-sm font-semibold tracking-wide">Tap to play music</span>
          </div>
        </button>
      )}

      {/* ── Prominent Download Button ── */}
      {exportStep === 'idle' && (
        <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <button
            onClick={handleExportClick}
            className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide shadow-lg transition-transform hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00C4FF, #00E5A0)',
              color: '#0D1E3A',
              boxShadow: '0 0 24px rgba(0,196,255,0.5)',
            }}
          >
            <span>⬇</span>
            <span>Download Video</span>
          </button>
        </div>
      )}

      {/* Canvas-based exporter — iOS only (no getDisplayMedia on iPhone) */}
      {showCanvasExporter && (
        <CanvasExporter onClose={() => setShowCanvasExporter(false)} />
      )}

      {/* Export modal — desktop screen-record flow */}
      <ExportModal
        step={exportStep}
        secondsLeft={secondsLeft}
        onStart={startRecording}
        onClose={handleCloseModal}
      />

      {/* Controls sensor zone */}
      <div
        ref={sensorRef}
        className="absolute bottom-0 left-0 right-0 z-50 flex flex-col justify-end"
        style={{ height: '25%' }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <div className="flex-1 w-full" aria-hidden="true" />
        <ControlBar
          visible={barVisible}
          collapsed={collapsed}
          locked={locked}
          musicEnabled={musicEnabled}
          sceneKeys={sceneKeys}
          activeIndex={activeIndex}
          activeDuration={activeDuration}
          tick={tick}
          onToggleLock={toggleLock}
          onJumpTo={jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
          onToggleMusic={() => setMusicEnabled(m => !m)}
          onOpenFullscreen={handleOpenFullscreen}
        />
      </div>
    </div>
  );
}
