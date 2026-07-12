import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 4800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0, filter: 'blur(20px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="relative w-full">
        {/* Star Lab Card */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-sm bg-[#111D34]/90 backdrop-blur-lg border border-[#00C4FF]/30 p-6 rounded-2xl text-left shadow-2xl"
          initial={{ opacity: 0, y: 40, rotate: -5, scale: 0.9 }}
          animate={
            phase >= 3 ? { opacity: 0, y: -40, scale: 0.8 } :
            phase >= 1 ? { opacity: 1, y: -60, rotate: -2, scale: 1 } : 
            { opacity: 0, y: 40, rotate: -5, scale: 0.9 }
          }
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
        >
          <div className="text-[#00C4FF] text-sm uppercase tracking-widest font-bold mb-2">Star Lab</div>
          <div className="text-white text-2xl font-semibold">Build real things</div>
          <div className="mt-4 h-2 bg-[#00C4FF]/20 rounded w-3/4" />
          <div className="mt-2 h-2 bg-[#00C4FF]/20 rounded w-1/2" />
        </motion.div>

        {/* Dream Lab Card */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-0 w-full max-w-sm bg-[#111D34]/90 backdrop-blur-lg border border-[#00E5A0]/30 p-6 rounded-2xl text-left shadow-2xl"
          initial={{ opacity: 0, y: 80, rotate: 5, scale: 0.9 }}
          animate={
            phase >= 3 ? { opacity: 1, y: -20, rotate: 2, scale: 1 } :
            phase >= 2 ? { opacity: 1, y: 20, rotate: 4, scale: 0.95 } : 
            { opacity: 0, y: 80, rotate: 5, scale: 0.9 }
          }
          transition={{ duration: 1, type: "spring", stiffness: 100 }}
        >
          <div className="text-[#00E5A0] text-sm uppercase tracking-widest font-bold mb-2">Dream Lab</div>
          <div className="text-white text-2xl font-semibold">Manifest goals</div>
          <div className="mt-4 h-2 bg-[#00E5A0]/20 rounded w-full" />
          <div className="mt-2 h-2 bg-[#00E5A0]/20 rounded w-2/3" />
        </motion.div>
        
        {/* Fill space to push cards up visually since they are absolute */}
        <div className="h-64" />

        <motion.h2
          className="text-3xl font-light text-white mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          Not just a chatbot.
        </motion.h2>
      </div>
    </motion.div>
  );
}