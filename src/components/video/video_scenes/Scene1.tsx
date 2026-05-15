import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="text-center relative">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full blur-[60px] opacity-20"
          animate={{ scale: phase >= 2 ? 1.5 : 1, opacity: phase >= 2 ? 0.4 : 0.2 }}
          transition={{ duration: 2, ease: "easeOut" }}
        />
        
        <motion.p 
          className="text-sm tracking-[0.3em] text-blue-200 uppercase mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          Sirius Star Lab
        </motion.p>
        
        <h1 className="text-6xl md:text-7xl font-light text-glow leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          <motion.span 
            className="block text-white"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 20 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Your
          </motion.span>
          <motion.span 
            className="block text-purple-200 italic mt-2"
            initial={{ opacity: 0, y: 30, rotateX: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 30, rotateX: 20 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            intelligence.
          </motion.span>
        </h1>

        <motion.div 
          className="mt-8 text-4xl text-white tracking-wider" style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          animate={phase >= 3 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          Amplified.
        </motion.div>
      </div>
    </motion.div>
  );
}
