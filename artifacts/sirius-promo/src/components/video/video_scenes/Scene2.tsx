import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 3800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const modes = ['Guru', 'Coach', 'Scientist', 'Philosopher', 'Creative', 'Friend'];

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.p
          className="text-2xl text-[#EDF4FF]/80 font-light mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Adapts to how you think
        </motion.p>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
          {modes.map((mode, i) => (
            <motion.div
              key={mode}
              className="bg-[#111D34]/80 backdrop-blur-md border border-[#00C4FF]/20 rounded-xl py-4 px-6 text-lg font-medium text-white shadow-[0_0_15px_rgba(0,196,255,0.1)]"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
              transition={{ 
                duration: 0.6, 
                ease: [0.16, 1, 0.3, 1],
                delay: phase >= 2 ? i * 0.1 : 0
              }}
            >
              {mode}
            </motion.div>
          ))}
        </div>

        <motion.h2
          className="text-4xl font-bold text-white text-glow-cyan"
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          animate={phase >= 3 ? { opacity: 1, filter: 'blur(0px)', y: 0 } : { opacity: 0, filter: 'blur(10px)', y: 20 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          9 Different Modes
        </motion.h2>
      </div>
    </motion.div>
  );
}