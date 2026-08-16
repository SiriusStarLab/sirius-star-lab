import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const words = ['Your dreams.', 'Your pace.', 'Your growth.'];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const phases = [phase >= 1, phase >= 2, phase >= 3];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10 text-center gap-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      {words.map((word, i) => (
        <motion.h2
          key={word}
          className={`font-light leading-tight ${
            i === 2
              ? 'text-6xl text-white text-glow'
              : 'text-4xl text-white/60'
          }`}
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
          animate={phases[i] ? { opacity: 1, x: 0 } : { opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {i === 2 ? <span className="italic text-purple-200">{word}</span> : word}
        </motion.h2>
      ))}
    </motion.div>
  );
}
