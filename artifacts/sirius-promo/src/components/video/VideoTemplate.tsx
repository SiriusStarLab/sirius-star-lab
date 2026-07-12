import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useVoiceover } from '@/lib/video/useVoiceover';
import { SparkleOverlay } from './SparkleOverlay';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  hook:   4500,
  memory: 5000,
  modes:  5000,
  labs:   5500,
  outro:  5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hook:   Scene1,
  modes:  Scene2,
  memory: Scene3,
  labs:   Scene4,
  outro:  Scene5,
};

const GLOW_POSITIONS = {
  cyan: {
    x: ['-20%', '30%', '-10%', '15%', '-20%'],
    y: ['-10%', '40%', '80%', '20%', '50%'],
    scale: [1.1, 1.3, 1.0, 1.4, 1.1],
  },
  green: {
    x: ['40%', '-20%', '50%', '0%', '30%'],
    y: ['70%', '10%', '60%', '30%', '20%'],
  },
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  voiceEnabled = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  voiceEnabled?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  useVoiceover(voiceEnabled, currentSceneKey);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  // Scene-change flash
  const prevKey = useRef(currentSceneKey);
  const [flashKey, setFlashKey] = useState(0);
  useEffect(() => {
    if (prevKey.current !== currentSceneKey) {
      setFlashKey(k => k + 1);
      prevKey.current = currentSceneKey;
    }
  }, [currentSceneKey]);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0D1E3A] text-[#EDF4FF] flex justify-center items-center font-body">
      <div className="relative w-full max-w-[56.25vh] aspect-[9/16] h-full overflow-hidden shadow-2xl bg-[#0D1E3A]">

        {/* Animated nebula background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(0,196,255,0.22) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(0,229,160,0.16) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, #0D1E3A 0%, transparent 100%)',
            }}
            animate={{ opacity: [0.85, 1, 0.88, 1, 0.92] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Star field */}
          <motion.div
            className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%] opacity-25"
            style={{
              backgroundImage: 'radial-gradient(circle, #EDF4FF 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
            animate={{ rotate: 360, scale: [1, 1.06, 1] }}
            transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Persistent cyan glow — brighter and more reactive */}
        <motion.div
          className="absolute w-[85%] h-[85%] rounded-full blur-[90px] opacity-35 mix-blend-screen pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle, #00C4FF, transparent)' }}
          animate={{
            x: GLOW_POSITIONS.cyan.x[sceneIndex] ?? '-20%',
            y: GLOW_POSITIONS.cyan.y[sceneIndex] ?? '-10%',
            scale: GLOW_POSITIONS.cyan.scale[sceneIndex] ?? 1,
          }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />

        {/* Persistent green glow */}
        <motion.div
          className="absolute w-[65%] h-[65%] rounded-full blur-[70px] opacity-28 mix-blend-screen pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle, #00E5A0, transparent)' }}
          animate={{
            x: GLOW_POSITIONS.green.x[sceneIndex] ?? '30%',
            y: GLOW_POSITIONS.green.y[sceneIndex] ?? '60%',
          }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
        />

        {/* Sparkle particles — always visible across all scenes */}
        <SparkleOverlay />

        {/* Scene flash on transition */}
        {flashKey > 0 && (
          <div
            key={flashKey}
            className="scene-flash absolute inset-0 z-30 bg-[#00C4FF]"
          />
        )}

        {/* Foreground scenes */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
