import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="w-40 h-40 rounded-full bg-gradient-to-tr from-purple-600 via-blue-500 to-white shadow-[0_0_80px_rgba(138,43,226,0.6)] flex items-center justify-center mb-12"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1, rotate: [0, 10, -10, 0] }}
        transition={{ duration: 1.5, ease: "easeOut", rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
      >
        <div className="w-36 h-36 rounded-full bg-black/40 backdrop-blur-md" />
      </motion.div>

      <motion.p
        className="text-2xl text-center text-white font-light leading-relaxed max-w-sm"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1 }}
      >
        Not a chatbot.
      </motion.p>

      <motion.p
        className="text-4xl text-center text-purple-200 mt-4 italic text-glow"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 1 }}
      >
        A brilliant, warm friend who listens.
      </motion.p>
    </motion.div>
  );
}
