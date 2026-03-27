import { useEffect } from "react";
import { Link, useSearch } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle, ArrowRight, Download, Calendar, Mail } from "lucide-react";
import { useVerifySession } from "@/hooks/use-checkout";

export default function SuccessPage() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const sessionId = searchParams.get("session_id");

  const { data, isLoading, error } = useVerifySession(sessionId);

  // Simple loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <h2 className="text-xl font-bold text-foreground font-display uppercase tracking-wider">Verifying Payment...</h2>
        </div>
      </div>
    );
  }

  // Error state (invalid session or API error)
  if (error || !sessionId || (data && !data.success)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-background max-w-md w-full rounded-3xl p-8 shadow-xl text-center border border-border">
          <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-black mb-2 font-display uppercase">Verification Failed</h1>
          <p className="text-muted-foreground mb-8">
            We couldn't verify your checkout session. If you believe you were charged, please contact support.
          </p>
          <Link href="/">
            <div className="w-full py-4 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors inline-block cursor-pointer">
              Return to Homepage
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // Success State
  const email = data?.customerEmail || "Trainer";
  const plan = data?.plan || "subscription";

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-white">
      {/* Confetti-like background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-20 min-h-screen flex flex-col items-center justify-center">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white mb-8 shadow-2xl shadow-green-500/30"
        >
          <CheckCircle className="w-12 h-12" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tight">
            YOU'RE IN, <span className="text-primary">{email.split('@')[0]}</span>!
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Your {plan} subscription to FitStack CRM is confirmed. Get ready to save hours of admin time every week.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full bg-card border border-border shadow-xl rounded-3xl p-8"
        >
          <h3 className="text-2xl font-bold font-display uppercase border-b border-border pb-4 mb-6">Your Next Steps</h3>
          
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold">Check your email</h4>
                <p className="text-muted-foreground">We've sent your login credentials and invoice to <span className="font-semibold text-foreground">{email}</span>.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold">Log into your dashboard</h4>
                <p className="text-muted-foreground">Access your CRM on web, or download our mobile companion app.</p>
              </div>
            </div>
            
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold">Book your onboarding call</h4>
                <p className="text-muted-foreground">Let our team help you import your existing clients and set up your Stripe payouts.</p>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row gap-4">
            <button className="flex-1 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg flex items-center justify-center gap-2">
              Go to Dashboard <ArrowRight className="w-5 h-5" />
            </button>
            <button className="flex-1 py-4 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-all flex items-center justify-center gap-2">
              Schedule Onboarding
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
