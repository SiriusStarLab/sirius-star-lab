import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-end justify-center p-10 z-10 text-right"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Mystical circle motif */}
      <motion.div 
        className="absolute left-[10%] top-[40%] w-48 h-48 border border-blue-400/30 rounded-full"
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 3 ? { scale: 1, opacity: 1, rotate: 180 } : { scale: 0, opacity: 0, rotate: 0 }}
        transition={{ duration: 2, ease: "easeOut" }}
      >
        <div className="absolute inset-2 border border-purple-400/20 rounded-full border-dashed" />
      </motion.div>

      <div className="relative mt-20">
        <motion.h2 
          className="text-4xl text-purple-300 mb-2 font-light" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          02 //
        </motion.h2>
        <motion.h3 
          className="text-6xl text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
          Dream Lab
        </motion.h3>

        <motion.p 
          className="text-xl text-blue-100/80 leading-relaxed font-light max-w-xs ml-auto"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1 }}
        >
          Journal, manifest, and grow your personal dreams.
        </motion.p>
      </div>
    </motion.div>
  );
}
