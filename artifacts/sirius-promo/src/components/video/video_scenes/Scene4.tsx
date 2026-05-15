import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 text-center"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Pulsing orb */}
      <motion.div
        className="w-28 h-28 rounded-full mb-14"
        style={{
          background: 'radial-gradient(circle at 40% 35%, #c084fc, #7c3aed 50%, #1d4ed8)',
          boxShadow: '0 0 80px 20px rgba(139,92,246,0.5)',
        }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        initial={{ opacity: 0, scale: 0.5 }}
      />

      <motion.p
        className="text-xl text-white/50 tracking-[0.25em] uppercase mb-5"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      >
        Introducing
      </motion.p>

      <motion.h2
        className="text-5xl text-white font-light leading-snug text-glow"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        An AI you can<br />
        <span className="italic text-purple-200">grow with.</span>
      </motion.h2>
    </motion.div>
  );
}
