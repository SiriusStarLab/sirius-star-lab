import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MODES = [
  { name: 'Guru',       icon: '🔮', color: '#a78bfa' },
  { name: 'Coach',      icon: '💪', color: '#00C4FF' },
  { name: 'Scientist',  icon: '🔬', color: '#00E5A0' },
  { name: 'Sage',       icon: '🧠', color: '#f59e0b' },
  { name: 'Creative',   icon: '🎨', color: '#f472b6' },
  { name: 'Friend',     icon: '🤝', color: '#00C4FF' },
  { name: 'Tutor',      icon: '📚', color: '#00E5A0' },
  { name: 'Research',   icon: '🔍', color: '#a78bfa' },
  { name: 'Thinker',    icon: '💡', color: '#f59e0b' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.7 }}
    >
      <motion.p
        className="text-white/50 font-mono text-sm tracking-widest uppercase mb-2"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        ◈ Adaptive Intelligence
      </motion.p>

      <motion.h2
        className="text-5xl font-extralight text-white mb-5 leading-tight tracking-wide"
        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
        animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
        transition={{ duration: 0.7 }}
      >
        9 minds.{' '}
        <span style={{ color: '#00C4FF', textShadow: '0 0 30px rgba(0,196,255,0.6)' }}>
          One AI.
        </span>
      </motion.h2>

      <div className="grid grid-cols-3 gap-2 w-full mb-5">
        {MODES.map((mode, i) => (
          <motion.div
            key={mode.name}
            className="flex flex-col items-center justify-center bg-white/5 border rounded-2xl py-3 px-1 backdrop-blur-sm"
            style={{ borderColor: `${mode.color}25` }}
            initial={{ opacity: 0, scale: 0.7, y: 16 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.7, y: 16 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
          >
            <span className="text-2xl mb-1">{mode.icon}</span>
            <span className="text-white text-xs font-semibold leading-tight">{mode.name}</span>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-white/50 text-base font-light"
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        Adapts to <span className="text-white font-semibold">how you want to think.</span>
      </motion.p>
    </motion.div>
  );
}
