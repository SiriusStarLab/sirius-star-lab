import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Calendar, 
  CreditCard, 
  FileText, 
  BellRing, 
  History, 
  TrendingUp,
  X,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { useCreateCheckout } from "@/hooks/use-checkout";

// ============================================================================
// Components
// ============================================================================

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: any, title: string, description: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-card rounded-2xl p-6 shadow-lg border border-border/50 hover:shadow-xl hover:border-primary/30 transition-all duration-300 group"
  >
    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
      <Icon className="w-7 h-7 text-primary" />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{description}</p>
  </motion.div>
);

const TestimonialCard = ({ quote, name, role, delay = 0 }: { quote: string, name: string, role: string, delay?: number }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="bg-secondary text-secondary-foreground rounded-2xl p-8 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-6 opacity-10">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
      </svg>
    </div>
    <p className="text-lg italic mb-6 relative z-10 font-medium">"{quote}"</p>
    <div className="flex items-center gap-4 relative z-10">
      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-xl font-bold font-display">
        {name.charAt(0)}
      </div>
      <div>
        <h4 className="font-bold font-display tracking-wider">{name}</h4>
        <p className="text-sm text-secondary-foreground/70">{role}</p>
      </div>
    </div>
  </motion.div>
);

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-border py-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-2 text-left font-bold text-lg focus:outline-none"
      >
        <span className="font-display tracking-wide">{question}</span>
        <ChevronDown className={`w-5 h-5 text-primary transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-muted-foreground">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Main Page
// ============================================================================

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("monthly");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  
  const checkoutMutation = useCreateCheckout();

  const handleOpenModal = (plan: "monthly" | "annual") => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
    setEmail("");
    setEmailError("");
  };

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    checkoutMutation.mutate(
      { email, plan: selectedPlan },
      {
        onSuccess: (data) => {
          window.location.href = data.url;
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-black italic">
              F
            </div>
            <span className="font-display font-bold text-2xl tracking-tighter">FITSTACK</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </div>
          <button 
            onClick={() => handleOpenModal("monthly")}
            className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors shadow-lg"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-4 relative overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-sm mb-6 uppercase tracking-wider">
              CRM for Personal Trainers
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] mb-6">
              STOP DROWNING IN <span className="text-gradient">ADMIN.</span><br />
              START GROWING YOUR BUSINESS.
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-lg">
              The all-in-one platform built specifically for UK personal trainers to automate scheduling, payments, and client tracking.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => handleOpenModal("monthly")}
                className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 hover:-translate-y-1 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
              >
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-white text-foreground border-2 border-border font-bold rounded-xl hover:border-primary/50 transition-all flex items-center justify-center"
              >
                See Features
              </button>
            </div>
            
            <div className="mt-10 flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-secondary/10 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p>Trusted by 2,000+ UK Trainers</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[600px] rounded-3xl overflow-hidden shadow-2xl shadow-black/10 border border-border/50"
          >
            <img 
              src={`${import.meta.env.BASE_URL}images/dashboard-mockup.png`} 
              alt="FitStack CRM Dashboard Interface" 
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50/50 relative border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black mb-4">EVERYTHING YOU NEED TO SCALE</h2>
            <p className="text-xl text-muted-foreground">We handle the boring stuff so you can focus on getting results for your clients.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              delay={0.1}
              icon={Calendar} 
              title="Smart Scheduling" 
              description="Eliminate double bookings. Let clients book their own sessions based on your real-time availability."
            />
            <FeatureCard 
              delay={0.2}
              icon={CreditCard} 
              title="Automated Payments" 
              description="Never chase an invoice again. Set up recurring subscriptions or one-off package payments securely."
            />
            <FeatureCard 
              delay={0.3}
              icon={FileText} 
              title="Progress Tracking" 
              description="Log workouts, measurements, and nutrition notes all in one place. Show clients their ROI instantly."
            />
            <FeatureCard 
              delay={0.4}
              icon={BellRing} 
              title="Automated Reminders" 
              description="Drastically reduce no-shows with automated SMS and email reminders sent 24 hours before sessions."
            />
            <FeatureCard 
              delay={0.5}
              icon={History} 
              title="Session History" 
              description="Maintain a complete digital paper trail for every client. Perfect for long-term retention and legal protection."
            />
            <FeatureCard 
              delay={0.6}
              icon={TrendingUp} 
              title="Revenue Dashboard" 
              description="Know exactly how much you're making, who owes what, and project your monthly income accurately."
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black mb-16 text-center">TRAINERS WHO SCALED WITH US</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard 
              delay={0.1}
              quote="I was spending 10 hours a week just texting clients and chasing payments. FitStack gave me my weekends back."
              name="Marcus T."
              role="Independent PT, London"
            />
            <TestimonialCard 
              delay={0.2}
              quote="The automated payment collection alone is worth 10x the subscription. No more awkward conversations about money."
              name="Sarah J."
              role="Owner, Elevate Fitness"
            />
            <TestimonialCard 
              delay={0.3}
              quote="My clients love the professional feel. They can see their progress notes instantly. It elevated my whole brand."
              name="David C."
              role="Strength Coach, Manchester"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-secondary text-secondary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">SIMPLE, TRANSPARENT PRICING</h2>
            <p className="text-xl text-secondary-foreground/70">One platform. All features. Cancel anytime.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly Card */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="bg-background text-foreground rounded-3xl p-8 border border-border flex flex-col shadow-xl"
            >
              <h3 className="text-2xl font-black mb-2">MONTHLY</h3>
              <p className="text-muted-foreground mb-6">Perfect for getting started</p>
              <div className="mb-8">
                <span className="text-5xl font-black tracking-tighter">£29</span>
                <span className="text-muted-foreground font-medium">/month</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Unlimited clients",
                  "Automated payments via Stripe",
                  "Client scheduling portal",
                  "Progress & workout tracking",
                  "Email & SMS reminders"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleOpenModal("monthly")}
                className="w-full py-4 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary hover:text-white transition-colors"
              >
                Choose Monthly
              </button>
            </motion.div>

            {/* Annual Card */}
            <motion.div 
              whileHover={{ y: -8 }}
              className="bg-primary text-primary-foreground rounded-3xl p-8 border border-primary relative flex flex-col shadow-2xl shadow-primary/20 scale-105"
            >
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full font-bold text-sm uppercase tracking-wider shadow-lg">
                Save £99
              </div>
              <h3 className="text-2xl font-black mb-2">ANNUAL</h3>
              <p className="text-primary-foreground/80 mb-6">For committed professionals</p>
              <div className="mb-8">
                <span className="text-5xl font-black tracking-tighter">£249</span>
                <span className="text-primary-foreground/80 font-medium">/year</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Monthly",
                  "Priority 24/7 Support",
                  "Free Data Migration Setup",
                  "Custom Branding Options",
                  "2 Months Free (Included)"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 font-medium">
                    <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => handleOpenModal("annual")}
                className="w-full py-4 rounded-xl bg-white text-primary font-bold hover:bg-gray-50 transition-colors shadow-lg"
              >
                Choose Annual
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black mb-12 text-center">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="space-y-2">
            <FAQItem 
              question="Can I cancel my subscription at any time?" 
              answer="Yes. There are no lock-in contracts for the monthly plan. You can cancel with one click from your dashboard at any time, and you won't be billed again." 
            />
            <FAQItem 
              question="Is client data GDPR compliant?" 
              answer="Absolutely. All client data, progress photos, and notes are encrypted at rest and in transit. We maintain strict EU/UK GDPR compliance for all data processing." 
            />
            <FAQItem 
              question="Does FitStack take a cut of my payments?" 
              answer="No. FitStack charges 0% transaction fees. Payments are processed securely via Stripe, who charge their standard processing fee (usually 1.4% + 20p for UK cards), but we don't take a penny." 
            />
            <FAQItem 
              question="Does it work on my phone?" 
              answer="Yes! FitStack CRM is fully responsive and works perfectly on any mobile browser. We also have native iOS and Android apps coming in Q3." 
            />
            <FAQItem 
              question="Can I import my existing clients?" 
              answer="Yes, you can upload a CSV file of your current client roster and their details. If you choose the Annual plan, our team will do this migration for you for free." 
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-white font-black italic text-xs">
              F
            </div>
            <span className="font-display font-bold text-xl tracking-tighter text-foreground">FITSTACK</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} FitStack CRM Ltd. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-secondary/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold font-display uppercase">Complete Setup</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCheckout} className="p-6">
                <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/20 flex justify-between items-center">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-sm text-primary">Selected Plan</p>
                    <p className="text-xl font-black capitalize">{selectedPlan}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black">{selectedPlan === "monthly" ? "£29" : "£249"}</p>
                    <p className="text-sm text-muted-foreground font-medium">{selectedPlan === "monthly" ? "/month" : "/year"}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-foreground">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                      placeholder="trainer@example.com"
                      className={`w-full px-4 py-3 rounded-xl bg-background border-2 transition-all focus:outline-none focus:ring-4 ${
                        emailError 
                          ? "border-destructive focus:border-destructive focus:ring-destructive/20" 
                          : "border-border focus:border-primary focus:ring-primary/20"
                      }`}
                      required
                    />
                    {emailError && <p className="mt-2 text-sm text-destructive font-medium">{emailError}</p>}
                    <p className="mt-2 text-xs text-muted-foreground font-medium">We'll use this to set up your account and send your receipt.</p>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={checkoutMutation.isPending}
                  className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Proceed to Payment <ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
                <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M18 8H20C20.5523 8 21 8.44772 21 9V21C21 21.5523 20.5523 22 20 22H4C3.44772 22 3 21.5523 3 21V9C3 8.44772 3.44772 8 4 8H6V7C6 3.68629 8.68629 1 12 1C15.3137 1 18 3.68629 18 7V8ZM16 8V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V8H16ZM11 14V18H13V14H11Z"/></svg>
                  Payments processed securely by Stripe
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
