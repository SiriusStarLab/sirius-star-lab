import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(16px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* App screenshot as full-bleed background */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/app-screenshot-chat.png`}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.08, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Dark gradient overlay so text reads cleanly */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />

      {/* Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-20 text-center px-8">
        <motion.p
          className="text-xl text-white/60 font-light tracking-widest uppercase mb-6"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          What if your AI
        </motion.p>

        <motion.h1
          className="text-7xl text-white font-light leading-tight text-glow"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.92, filter: 'blur(12px)' }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        >
          grew<br />
          <span className="italic text-purple-200">with you?</span>
        </motion.h1>
      </div>
    </motion.div>
  );
}
