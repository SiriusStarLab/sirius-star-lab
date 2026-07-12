import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <div className="relative z-10 w-full flex flex-col items-center">
        <motion.h2
          className="text-4xl font-bold text-white mb-10 leading-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          The AI companion<br/>
          <span className="text-[#00C4FF] text-glow-cyan">you actually deserve.</span>
        </motion.h2>

        <motion.img
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt="Sirius AI"
          className="w-24 h-24 rounded-2xl mb-8 object-cover"
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.5, filter: 'blur(10px)' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ boxShadow: '0 0 40px rgba(0, 196, 255, 0.4)' }}
        />

        <motion.div
          className="text-3xl font-display font-bold tracking-wider uppercase mb-6"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          SIRIUS
        </motion.div>

        <motion.div
          className="bg-gradient-to-r from-transparent via-white/10 to-transparent w-full h-px mb-6"
          initial={{ scaleX: 0 }}
          animate={phase >= 3 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1 }}
        />

        <motion.p
          className="text-[#EDF4FF]/70 text-sm font-medium tracking-widest uppercase"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.8 }}
        >
          Free tier available
        </motion.p>
      </div>
    </motion.div>
  );
}