import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1100),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.8 }}
    >
      {/* Pulsing scan lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,196,255,0.3) 3px, rgba(0,196,255,0.3) 4px)', backgroundSize: '100% 4px' }}
      />

      {/* Competitor strike */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <span className="text-white/40 text-2xl font-light tracking-wider relative inline-block">
          Every other AI forgets you.
          <motion.div
            className="absolute left-0 right-0 top-1/2 h-[2px] bg-red-400/80 origin-left"
            initial={{ scaleX: 0 }}
            animate={phase >= 2 ? { scaleX: 1 } : { scaleX: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />
        </span>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        className="text-[4.2rem] font-extralight leading-none tracking-[0.08em] mb-6"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, scale: 0.88, filter: 'blur(20px)' }}
        animate={phase >= 3 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 0.88, filter: 'blur(20px)' }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="shimmer-heading">SIRIUS</span>
        <br />
        <span className="font-light" style={{ color: '#00C4FF', textShadow: '0 0 40px rgba(0,196,255,0.8), 0 0 80px rgba(0,196,255,0.4)' }}>
          never does.
        </span>
      </motion.h1>

      {/* Tagline */}
      <motion.p
        className="text-white/60 text-xl font-light tracking-widest uppercase"
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ duration: 0.7 }}
      >
        The AI that grows with you
      </motion.p>

      {/* Hero faces image — fades in behind text */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/logo-starlab.png`}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 0.18, scale: 1 }}
        transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Corner HUD elements */}
      <motion.div
        className="absolute top-8 right-8 text-[#00C4FF]/50 text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        SYS::ONLINE<br/>MEM::ACTIVE
      </motion.div>
      <motion.div
        className="absolute bottom-8 left-8 text-[#00E5A0]/50 text-xs font-mono"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        SIRIUS_OS v2<br/>READY
      </motion.div>
    </motion.div>
  );
}
