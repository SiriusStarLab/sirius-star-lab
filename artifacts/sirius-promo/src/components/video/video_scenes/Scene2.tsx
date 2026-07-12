import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const MEMORY_ITEMS = [
  { label: 'Your goals', color: '#00C4FF' },
  { label: 'Your voice', color: '#00E5A0' },
  { label: 'Your breakthroughs', color: '#a78bfa' },
  { label: 'Your plans', color: '#00C4FF' },
  { label: 'Your history', color: '#00E5A0' },
];

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2100),
      setTimeout(() => setPhase(5), 2700),
      setTimeout(() => setPhase(6), 3600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.p
        className="text-white/50 text-lg font-mono tracking-widest uppercase mb-3"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        ◈ Mnemosyne Memory Engine
      </motion.p>

      <div className="w-full space-y-2 mb-6">
        {MEMORY_ITEMS.map((item, i) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-3 bg-white/5 border rounded-xl px-5 py-3 backdrop-blur-sm"
            style={{ borderColor: `${item.color}30` }}
            initial={{ opacity: 0, x: 40 }}
            animate={phase >= i + 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
            />
            <span className="text-white text-xl font-semibold text-left flex-1">{item.label}</span>
            <span className="font-mono text-xs" style={{ color: item.color }}>SAVED ✓</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={phase >= 6 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-4xl font-extralight text-white leading-tight tracking-wide">
          Remembered.{' '}
          <span style={{ color: '#00E5A0', textShadow: '0 0 30px rgba(0,229,160,0.7)' }}>
            Forever.
          </span>
        </p>
        <p className="text-white/40 text-base mt-2 font-light">ChatGPT forgets. Claude forgets. Sirius doesn't.</p>
      </motion.div>
    </motion.div>
  );
}
