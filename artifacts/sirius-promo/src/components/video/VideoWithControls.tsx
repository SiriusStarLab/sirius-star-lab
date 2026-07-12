import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Repeat, Maximize2, Music, VolumeX, Video } from 'lucide-react';
import VideoTemplate, { SCENE_DURATIONS } from './VideoTemplate';
import { useSceneControls } from '@/lib/video/controls/useSceneControls';
import { useFuturisticMusic } from '@/lib/video/useFuturisticMusic';

const PROGRESS_TICK_MS = 60;

interface ControlBarProps {
  visible: boolean;
  collapsed: boolean;
  locked: boolean;
  musicEnabled: boolean;
  sceneKeys: string[];
  activeIndex: number;
  activeDuration: number;
  tick: number;
  recording: boolean;
  onToggleLock: () => void;
  onJumpTo: (index: number) => void;
  onToggleCollapsed: () => void;
  onToggleVoice: () => void;
  onOpenFullscreen: () => void;
  onToggleRecord: () => void;
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
  recording,
  onToggleLock,
  onJumpTo,
  onToggleCollapsed,
  onToggleMusic,
  onOpenFullscreen,
  onToggleRecord,
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
        onClick={onToggleRecord}
        className={`w-12 h-12 flex items-center justify-center transition-colors rounded-lg shrink-0 ${
          recording
            ? 'text-red-400 bg-red-400/15 hover:bg-red-400/25'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={recording ? 'Stop & download' : 'Record video'}
        aria-label={recording ? 'Stop & download' : 'Record video'}
      >
        <Video className="w-6 h-6" />
        {recording && (
          <span className="absolute w-2 h-2 rounded-full bg-red-400 top-2 right-2 animate-pulse" />
        )}
      </button>

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
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

  const handleToggleRecord = useCallback(async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sirius-promo.webm';
        a.click();
        URL.revokeObjectURL(url);
        setRecording(false);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [recording]);

  const barVisible = !collapsed || hovering || tapPinned;

  const handleUnlockAudio = useCallback(() => {
    setAudioUnlocked(true);
  }, []);

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

      {/* Music unlock overlay — disappears after first tap */}
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
          recording={recording}
          onToggleLock={toggleLock}
          onJumpTo={jumpTo}
          onToggleCollapsed={handleToggleCollapsed}
          onToggleMusic={() => setMusicEnabled(m => !m)}
          onOpenFullscreen={handleOpenFullscreen}
          onToggleRecord={handleToggleRecord}
        />
      </div>
    </div>
  );
}
