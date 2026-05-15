import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
    >
      {/* Star icon */}
      <motion.div
        className="w-14 h-14 text-purple-300 mb-6"
        initial={{ opacity: 0, rotate: -30, scale: 0.6 }}
        animate={phase >= 1 ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: -30, scale: 0.6 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      </motion.div>

      <motion.h1
        className="text-3xl tracking-[0.2em] text-white font-light uppercase mb-3"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 1, ease: 'easeOut' }}
      >
        Sirius Star Lab
      </motion.h1>

      <motion.div
        className="mt-8 px-8 py-3 border border-purple-400/50 rounded-full"
        style={{ background: 'rgba(139,92,246,0.12)' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="text-xl text-purple-200 tracking-[0.15em] uppercase font-light">
          Coming Soon
        </span>
      </motion.div>

      <motion.p
        className="mt-6 text-base text-white/40 tracking-widest"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2 }}
      >
        siriusai.app
      </motion.p>
    </motion.div>
  );
}
