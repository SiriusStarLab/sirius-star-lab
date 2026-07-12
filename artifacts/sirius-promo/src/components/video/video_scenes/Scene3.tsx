import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0, x: '20vw' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '-20vw' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative z-10 w-full max-w-sm">
        <motion.div
          className="w-32 h-32 mx-auto rounded-full mb-8 relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.5, rotate: -90 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <div className="absolute inset-0 rounded-full border border-[#00E5A0]/40" />
          <div className="absolute inset-2 rounded-full border border-[#00E5A0]/60 border-t-[#00E5A0] animate-spin" style={{ animationDuration: '3s' }} />
          <div className="w-16 h-16 rounded-full bg-[#00E5A0]/20 blur-md absolute" />
          <span className="text-[#00E5A0] text-3xl font-mono">MEM</span>
        </motion.div>

        <h2 className="text-4xl font-bold leading-tight mb-6">
          <motion.span
            className="block text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
          >
            It remembers you
          </motion.span>
          <motion.span
            className="block text-[#00E5A0] text-3xl text-glow-green"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8 }}
          >
            across every conversation
          </motion.span>
        </h2>
      </div>
    </motion.div>
  );
}