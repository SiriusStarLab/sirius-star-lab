import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

export const SCENE_DURATIONS: Record<string, number> = {
  intro: 5000,
  starLab: 6000,
  dreamLab: 6000,
  friend: 5000,
  outro: 6000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  intro: Scene1,
  starLab: Scene2,
  dreamLab: Scene3,
  friend: Scene4,
  outro: Scene5,
};

const GLOW_POSITIONS = {
  purple: {
    x: ['-20%', '20%', '-20%', '15%', '-15%'],
    y: ['-10%', '30%', '70%', '10%', '50%'],
    scale: [1, 1.2, 0.8, 1.1, 1],
  },
  blue: {
    x: ['30%', '-10%', '40%', '0%', '20%'],
    y: ['60%', '20%', '80%', '40%', '10%'],
  },
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0A0514] text-white flex justify-center items-center">
      <div className="relative w-full max-w-[56.25vh] aspect-[9/16] h-full overflow-hidden shadow-2xl">

        {/* Animated CSS nebula background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(88,28,135,0.6) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(29,78,216,0.4) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(10,5,20,1) 0%, transparent 100%)',
            }}
            animate={{ opacity: [0.8, 1, 0.85, 1, 0.9] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Star field */}
          <motion.div
            className="absolute w-[200%] h-[200%] -top-[50%] -left-[50%] opacity-25"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Persistent purple glow */}
        <motion.div
          className="absolute w-[80%] h-[80%] rounded-full blur-[100px] opacity-40 mix-blend-screen pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle, #8a2be2, transparent)' }}
          animate={{
            x: GLOW_POSITIONS.purple.x[sceneIndex] ?? '-20%',
            y: GLOW_POSITIONS.purple.y[sceneIndex] ?? '-10%',
            scale: GLOW_POSITIONS.purple.scale[sceneIndex] ?? 1,
          }}
          transition={{ duration: 4, ease: 'easeInOut' }}
        />

        {/* Persistent blue glow */}
        <motion.div
          className="absolute w-[60%] h-[60%] rounded-full blur-[80px] opacity-30 mix-blend-screen pointer-events-none z-0"
          style={{ background: 'radial-gradient(circle, #4169e1, transparent)' }}
          animate={{
            x: GLOW_POSITIONS.blue.x[sceneIndex] ?? '30%',
            y: GLOW_POSITIONS.blue.y[sceneIndex] ?? '60%',
          }}
          transition={{ duration: 5, ease: 'easeInOut' }}
        />

        {/* Foreground scenes */}
        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
