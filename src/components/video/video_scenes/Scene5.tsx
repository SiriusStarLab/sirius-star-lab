import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col items-center justify-center h-1/2">
        <motion.h2 
          className="text-4xl text-white/80 font-light tracking-wide mb-4" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.8 }}
        >
          Dream it.
        </motion.h2>
        
        <motion.h2 
          className="text-4xl text-white/90 font-light tracking-wide mb-4" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.8 }}
        >
          Build it.
        </motion.h2>
        
        <motion.h2 
          className="text-5xl text-white font-medium tracking-wide text-glow" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.8 }}
        >
          Become it.
        </motion.h2>
      </div>

      <motion.div 
        className="mt-12 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <div className="w-12 h-12 mb-4 text-purple-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" />
          </svg>
        </div>
        <h1 className="text-2xl tracking-[0.3em] text-white font-light uppercase">
          Sirius Star Lab
        </h1>
      </motion.div>
    </motion.div>
  );
}
