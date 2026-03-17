import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle, Sparkles, ArrowLeft, Loader2 } from "lucide-react";

export function CheckoutSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "hsl(224 28% 5%)", color: "hsl(220 20% 92%)" }}>

      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 40%, hsl(193 100% 52% / 0.06), transparent)",
        }} />

      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(193 100% 52% / 0.1)",
              border: "1px solid hsl(193 100% 52% / 0.3)",
              boxShadow: "0 0 40px hsl(193 100% 52% / 0.2)",
            }}>
            <CheckCircle size={36} style={{ color: "hsl(193 100% 52%)" }} />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold mb-3"
          style={{
            background: "linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(193 100% 52%) 50%, hsl(var(--foreground) / 0.7) 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>
          You're in.
        </h1>

        <p className="text-muted-foreground/80 text-base mb-2">
          Your subscription is now active.
        </p>
        <p className="text-muted-foreground/50 text-sm mb-8 font-mono">
          Sirius now has full access to serve you.
        </p>

        {/* Features unlocked */}
        <div className="rounded-xl p-5 mb-8 text-left"
          style={{
            background: "hsl(224 24% 8%)",
            border: "1px solid hsl(193 100% 52% / 0.15)",
          }}>
          <p className="text-xs font-mono tracking-wider text-primary/60 uppercase mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            Unlocked for you
          </p>
          <ul className="space-y-2">
            {["More messages per day", "Full conversation history", "Sirius remembers you", "Image generation"].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                <CheckCircle size={13} style={{ color: "hsl(193 100% 52%)" }} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Countdown + CTA */}
        <Link href="/" className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold mb-4 transition-all duration-200"
          style={{
            background: "hsl(193 100% 52%)",
            color: "hsl(224 28% 5%)",
          }}>
          <ArrowLeft size={15} />
          Back to Sirius
        </Link>

        <p className="text-xs font-mono text-muted-foreground/30">
          Redirecting automatically in {countdown}s
        </p>
      </div>
    </div>
  );
}
