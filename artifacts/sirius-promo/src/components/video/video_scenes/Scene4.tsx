import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const STAR_FEATURES = ['Build apps', 'Generate designs', 'Write & deploy code', 'Create anything'];
const DREAM_FEATURES = ['Track your goals', 'Map your future', 'Daily check-ins', 'Manifest plans'];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => setPhase(5), 4600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
      initial={{ opacity: 0, filter: 'blur(16px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, filter: 'blur(16px)' }}
      transition={{ duration: 0.8 }}
    >
      <motion.p
        className="text-white/50 font-mono text-sm tracking-widest uppercase mb-2"
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        ◈ Beyond Chat
      </motion.p>

      <motion.h2
        className="text-4xl font-extralight text-white mb-5 leading-tight tracking-wide"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7 }}
      >
        Not a chatbot.
        <br />
        <span style={{ color: '#00C4FF', textShadow: '0 0 30px rgba(0,196,255,0.7)' }}>
          A co-founder.
        </span>
      </motion.h2>

      <div className="w-full grid grid-cols-2 gap-3 mb-4">
        {/* Star Lab */}
        <motion.div
          className="bg-[#0a1628]/80 border border-[#00C4FF]/30 rounded-2xl p-4 text-left backdrop-blur-sm"
          initial={{ opacity: 0, x: -30, rotate: -2 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, rotate: 0 } : {}}
          transition={{ duration: 0.7, type: 'spring', stiffness: 120 }}
        >
          <div className="text-[#00C4FF] text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
            <span>★</span> Star Lab
          </div>
          <div className="space-y-1.5">
            {STAR_FEATURES.map((f, i) => (
              <motion.div
                key={f}
                className="text-white/80 text-xs flex items-center gap-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <span className="text-[#00C4FF] text-[10px]">▸</span> {f}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Dream Lab */}
        <motion.div
          className="bg-[#0a1628]/80 border border-[#00E5A0]/30 rounded-2xl p-4 text-left backdrop-blur-sm"
          initial={{ opacity: 0, x: 30, rotate: 2 }}
          animate={phase >= 2 ? { opacity: 1, x: 0, rotate: 0 } : {}}
          transition={{ duration: 0.7, type: 'spring', stiffness: 120, delay: 0.1 }}
        >
          <div className="text-[#00E5A0] text-xs font-bold tracking-widest uppercase mb-2 flex items-center gap-1">
            <span>◉</span> Dream Lab
          </div>
          <div className="space-y-1.5">
            {DREAM_FEATURES.map((f, i) => (
              <motion.div
                key={f}
                className="text-white/80 text-xs flex items-center gap-1.5"
                initial={{ opacity: 0, x: 10 }}
                animate={phase >= 3 ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.4 }}
              >
                <span className="text-[#00E5A0] text-[10px]">▸</span> {f}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Competitor contrast */}
      <motion.div
        className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 w-full"
        initial={{ opacity: 0, y: 16 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
      >
        <p className="text-white/40 text-xs">
          ChatGPT gives you <span className="line-through">answers.</span>
          {'  '}<span className="text-white font-bold text-sm">Sirius gives you results.</span>
        </p>
      </motion.div>
    </motion.div>
  );
}
