import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
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
      className="absolute inset-0 flex flex-col items-start justify-center p-10 z-10"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div 
        className="w-full h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent absolute top-[30%] left-0 opacity-50"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />

      <div className="relative mt-20">
        <motion.h2 
          className="text-4xl text-blue-200 mb-2 font-light" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          01 //
        </motion.h2>
        <motion.h3 
          className="text-6xl text-white mb-6" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
          Star Lab
        </motion.h3>

        <motion.p 
          className="text-xl text-purple-100/80 leading-relaxed font-light max-w-xs"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 1 }}
        >
          A space to research, dissect, and explore ideas deeply.
        </motion.p>
      </div>

      {/* Abstract UI Elements representing "research" */}
      <div className="absolute right-10 top-[40%] w-32 h-64 flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <motion.div 
            key={i}
            className="w-full h-16 border border-purple-500/30 rounded-lg bg-purple-900/10 backdrop-blur-sm"
            initial={{ opacity: 0, x: 20 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ duration: 0.8, delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
