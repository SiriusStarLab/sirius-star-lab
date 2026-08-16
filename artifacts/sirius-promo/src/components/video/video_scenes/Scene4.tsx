import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
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
      {/* App logo */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/logo.png`}
        alt="Sirius AI"
        className="w-44 h-44 rounded-3xl object-cover mb-10"
        style={{ boxShadow: '0 0 80px 20px rgba(139,92,246,0.45)' }}
        initial={{ opacity: 0, scale: 0.6, filter: 'blur(12px)' }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.6, filter: 'blur(12px)' }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.p
        className="text-xl text-white/50 tracking-[0.25em] uppercase mb-5"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
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
