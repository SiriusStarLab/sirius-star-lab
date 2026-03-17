import React from "react";
import { Link } from "wouter";
import { XCircle, ArrowLeft } from "lucide-react";

export function CheckoutCancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "hsl(224 28% 5%)", color: "hsl(220 20% 92%)" }}>

      <div className="relative z-10 text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: "hsl(220 14% 12%)",
              border: "1px solid hsl(220 14% 20%)",
            }}>
            <XCircle size={36} className="text-muted-foreground/50" />
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 text-foreground">No worries.</h1>
        <p className="text-muted-foreground/70 text-base mb-2">
          Your payment was cancelled — nothing was charged.
        </p>
        <p className="text-muted-foreground/40 text-sm mb-10 font-mono">
          The Explorer plan is still yours, always free.
        </p>

        <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
          style={{
            background: "hsl(224 24% 10%)",
            border: "1px solid hsl(224 20% 18%)",
            color: "hsl(220 20% 70%)",
          }}>
          <ArrowLeft size={15} />
          Back to Sirius
        </Link>
      </div>
    </div>
  );
}
