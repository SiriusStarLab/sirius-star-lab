import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
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
      {/* Logo — large and prominent */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/logo.png`}
        alt="Sirius AI"
        className="w-36 h-36 rounded-3xl object-cover mb-8"
        style={{ boxShadow: '0 0 60px 12px rgba(139,92,246,0.5)' }}
        initial={{ opacity: 0, scale: 0.7, filter: 'blur(10px)' }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.7, filter: 'blur(10px)' }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <motion.h1
        className="text-3xl tracking-[0.2em] text-white font-light uppercase mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
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
