import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const BULLETS = [
  '9 specialist AI modes',
  'Remembers everything, forever',
  'Builds & deploys real projects',
  'Tracks your goals daily',
  'Available on web + mobile',
];

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-7 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Logo */}
      <motion.div
        className="mb-4 relative"
        initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : {}}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.img
          src={`${import.meta.env.BASE_URL}images/logo.png`}
          alt="Sirius AI"
          className="w-20 h-20 rounded-2xl object-cover mx-auto"
          style={{ boxShadow: '0 0 60px rgba(0,196,255,0.6), 0 0 120px rgba(0,196,255,0.2)' }}
        />
        <motion.div
          className="absolute -inset-3 rounded-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,196,255,0.2) 0%, transparent 70%)' }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      <motion.h1
        className="text-5xl font-black tracking-widest text-white mb-1"
        initial={{ opacity: 0, y: 10 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ textShadow: '0 0 40px rgba(0,196,255,0.4)' }}
      >
        SIRIUS
      </motion.h1>

      <motion.p
        className="text-white/40 font-mono text-xs tracking-widest uppercase mb-5"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        sirius-ai.live
      </motion.p>

      {/* Feature bullets */}
      <div className="w-full space-y-1.5 mb-5">
        {BULLETS.map((b, i) => (
          <motion.div
            key={b}
            className="flex items-center gap-2 text-left"
            initial={{ opacity: 0, x: -20 }}
            animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            <span style={{ color: '#00E5A0', textShadow: '0 0 8px rgba(0,229,160,0.8)' }} className="text-sm">✦</span>
            <span className="text-white/90 text-sm font-medium">{b}</span>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="w-full py-4 rounded-2xl text-lg font-black tracking-wider text-[#0D1E3A] text-center"
          style={{ background: 'linear-gradient(135deg, #00C4FF, #00E5A0)', boxShadow: '0 0 40px rgba(0,196,255,0.5)' }}
        >
          START FREE TODAY →
        </div>
        <motion.p
          className="text-white/30 text-xs mt-2"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          No credit card required
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
