import { useMemo } from 'react';

const COLORS = ['#00C4FF', '#00E5A0', '#ffffff', '#00C4FF', '#00E5A0', '#aef4ff'];

function StarShape({ color, size }: { color: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        background: color,
        clipPath: 'polygon(50% 0%,54% 44%,100% 50%,54% 56%,50% 100%,46% 56%,0% 50%,46% 44%)',
        filter: `drop-shadow(0 0 ${size * 1.5}px ${color})`,
      }}
    />
  );
}

export function SparkleOverlay() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        top: 4 + Math.random() * 92,
        size: 2 + Math.random() * 4,
        delay: Math.random() * 4.5,
        duration: 1.4 + Math.random() * 2.2,
        color: COLORS[i % COLORS.length],
      })),
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationName: 'sparkle-twinkle',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
          }}
        >
          <StarShape color={p.color} size={p.size} />
        </div>
      ))}
    </div>
  );
}
