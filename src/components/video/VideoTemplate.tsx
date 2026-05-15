import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  intro: 5000,
  starLab: 6000,
  dreamLab: 6000,
  friend: 5000,
  outro: 6000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#0A0514] font-body text-white flex justify-center items-center">
      {/* 9:16 aspect ratio container for preview on desktop */}
      <div className="relative w-full max-w-[56.25vh] aspect-[9/16] h-full overflow-hidden shadow-2xl">
        
        {/* Persistent background video */}
        <div className="absolute inset-0 z-0">
          <video 
            src={`${import.meta.env.BASE_URL}videos/nebula-bg.mp4`} 
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover opacity-60 mix-blend-screen"
          />
        </div>

        {/* Persistent cosmic dust / stars */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <motion.div 
            className="absolute w-[200vw] h-[200vh] -top-[50%] -left-[50%] opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Persistent Midground Glows */}
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-40 mix-blend-screen"
          style={{ background: 'radial-gradient(circle, #8a2be2, transparent)' }}
          animate={{
            x: ['-20vw', '20vw', '-20vw'][currentScene % 3],
            y: ['-10vh', '30vh', '70vh', '10vh', '50vh'][currentScene],
            scale: [1, 1.2, 0.8, 1.1, 1][currentScene]
          }}
          transition={{ duration: 4, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full blur-[80px] opacity-30 mix-blend-screen"
          style={{ background: 'radial-gradient(circle, #4169e1, transparent)' }}
          animate={{
            x: ['30vw', '-10vw', '40vw', '0vw', '20vw'][currentScene],
            y: ['60vh', '20vh', '80vh', '40vh', '10vh'][currentScene],
          }}
          transition={{ duration: 5, ease: "easeInOut" }}
        />

        {/* Foreground Scenes */}
        <AnimatePresence mode="sync">
          {currentScene === 0 && <Scene1 key="intro" />}
          {currentScene === 1 && <Scene2 key="starLab" />}
          {currentScene === 2 && <Scene3 key="dreamLab" />}
          {currentScene === 3 && <Scene4 key="friend" />}
          {currentScene === 4 && <Scene5 key="outro" />}
        </AnimatePresence>
      </div>
    </div>
  );
}
