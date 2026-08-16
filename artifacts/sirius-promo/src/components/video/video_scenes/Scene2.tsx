import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1800),
      setTimeout(() => setPhase(3), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.p
        className="text-3xl text-blue-200 font-light leading-relaxed mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      >
        The more you share...
      </motion.p>

      <motion.div
        className="w-24 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent my-6"
        initial={{ scaleX: 0 }}
        animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
      />

      <motion.p
        className="text-4xl text-white font-light leading-snug text-glow"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={phase >= 3 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
        transition={{ duration: 1.2 }}
      >
        the deeper it<br />
        <span className="italic text-purple-200">knows you.</span>
      </motion.p>
    </motion.div>
  );
}
