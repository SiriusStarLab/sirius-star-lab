import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Sparkles } from "lucide-react";

export function CheckoutCancelPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "hsl(224 28% 5%)", color: "hsl(220 20% 92%)" }}>

      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse 50% 35% at 50% 40%, hsl(224 28% 10% / 0.8), transparent)",
      }} />

      <div className="relative z-10 text-center max-w-sm mx-auto">
        {/* Icon */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(224 24% 10%)",
              border: "1px solid hsl(224 20% 20%)",
            }}>
            <span className="text-3xl">🙂</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 text-foreground">No worries.</h1>
        <p className="text-muted-foreground/80 text-base mb-2">
          Your payment was cancelled — nothing was charged.
        </p>
        <p className="text-muted-foreground/50 text-sm mb-10 font-mono">
          The Explorer plan is still yours, always free.
        </p>

        {/* Reminder of what they'd get */}
        <div className="rounded-xl p-5 mb-8 text-left"
          style={{
            background: "hsl(224 24% 8%)",
            border: "1px solid hsl(193 100% 52% / 0.1)",
          }}>
          <p className="text-xs font-mono tracking-wider text-primary/50 uppercase mb-3 flex items-center gap-2">
            <Sparkles size={12} />
            Still available when you're ready
          </p>
          <ul className="space-y-1.5">
            {["More messages per day", "Image generation", "Full memory", "Priority speed"].map(f => (
              <li key={f} className="text-sm text-muted-foreground/60 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-primary/40 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200"
          style={{
            background: "hsl(193 100% 52%)",
            color: "hsl(224 28% 5%)",
          }}>
          <ArrowLeft size={15} />
          Back to Sirius
        </Link>
      </div>
    </div>
  );
}
