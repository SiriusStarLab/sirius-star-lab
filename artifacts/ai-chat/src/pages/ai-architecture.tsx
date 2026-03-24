import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Target, Shield, Globe, Rocket, Award, Zap } from "lucide-react";

export function AiArchitecturePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* HERO BANNER */}
        <div className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 p-8 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-300 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl opacity-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-400 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl opacity-15" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Sirius Star Lab</h2>
                <p className="text-white/80 text-sm">AI Architecture Research &amp; Development Intelligence</p>
              </div>
            </div>
            <p className="text-white/70 text-sm max-w-3xl">Understanding the AI systems that power modern app development — from custom LLM training to autonomous agent workflows. This is your reference guide for how AI builds software.</p>
          </div>
        </div>

        {/* MAIN 2x2 GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* SECTION 1: Custom LLM Training */}
          <Card className="border-2 border-amber-200 shadow-xl overflow-hidden">
            <CardHeader className="py-4 bg-gradient-to-r from-amber-500 to-orange-500 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-white font-black">
                <Sparkles className="h-5 w-5" />
                1. The Foundation: Custom LLM Training
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                <h4 className="font-bold text-sm mb-2 text-amber-800">Replit Code V1.5 3B</h4>
                <p className="text-xs text-slate-500">Open-source code generation model released on Hugging Face — purpose-built for multi-language development.</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-700">Training Data &amp; Process</h4>
                <div className="space-y-2">
                  {[
                    { label: "Training Tokens", value: "1 Trillion", desc: "Permissively licensed code from the Stack dataset" },
                    { label: "Source", value: "StackExchange", desc: "Publicly available developer content" },
                    { label: "Filtering", value: "Quality Gated", desc: "Code quality, parsability checking, toxic content removal" },
                    { label: "Vocabulary", value: "32K Custom", desc: "Covering top 30 programming languages" },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="min-w-[100px]">
                        <p className="text-xs font-bold text-amber-600">{item.label}</p>
                        <p className="text-sm font-black text-slate-800">{item.value}</p>
                      </div>
                      <p className="text-xs text-slate-500 pt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-700">Technical Architecture</h4>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    "Grouped Query Attention with Flash Attention Triton Kernels for low latency",
                    "ALiBi positional embeddings for better long-context understanding",
                    "LionW optimizer with learning rate cooling and QKV clipping",
                    "Trained using MosaicML infrastructure (now Databricks) on 256 GPUs",
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100">
                      <Zap className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-gradient-to-r from-orange-50 to-red-50 p-4 border border-orange-200">
                <p className="text-xs font-bold text-orange-700 mb-1">The "YOLO Run"</p>
                <p className="text-xs text-slate-500">They trained the full model in less than a week to meet their launch deadline — described as their best career accomplishment.</p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: The AI Agent System */}
          <Card className="border-2 border-blue-200 shadow-xl overflow-hidden">
            <CardHeader className="py-4 bg-gradient-to-r from-blue-500 to-indigo-500 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-white font-black">
                <Target className="h-5 w-5" />
                2. The AI Agent System
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-slate-500">Not just autocomplete — an autonomous agent system with multiple modes and specialised sub-agents.</p>
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-700">Core Agent Modes</h4>
                <div className="space-y-2">
                  {[
                    { mode: "Plan Mode", desc: "Breaks projects into Kanban task lists, explores approaches, weighs trade-offs before writing code", color: "bg-violet-50 text-violet-700 border-violet-200" },
                    { mode: "Lite", desc: "Quick, inexpensive changes for visual tweaks and bug fixes", color: "bg-green-50 text-green-700 border-green-200" },
                    { mode: "Autonomous", desc: "Full capabilities with optional app testing, code optimisation, and Turbo (2.5x faster, 6x cost)", color: "bg-blue-50 text-blue-700 border-blue-200" },
                    { mode: "Max", desc: "Long-running, hands-off building for complex projects", color: "bg-red-50 text-red-700 border-red-200" },
                  ].map(item => (
                    <div key={item.mode} className={`p-3 rounded-lg border ${item.color}`}>
                      <p className="text-xs font-black mb-0.5">{item.mode}</p>
                      <p className="text-[11px] opacity-80">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2 text-slate-700">The Agent Workflow</h4>
                <div className="space-y-1.5">
                  {[
                    { step: 1, label: "Interpretation", desc: "Parses natural language prompts to identify requirements" },
                    { step: 2, label: "Planning", desc: "Creates ordered task lists (visible to user for approval)" },
                    { step: 3, label: "Execution", desc: "Writes code, creates file structures, installs dependencies, sets up databases" },
                    { step: 4, label: "Self-Testing", desc: "Uses a virtual browser/desktop to actually test the app and discover where it's broken" },
                    { step: 5, label: "Self-Debugging", desc: "Reads its own error logs and applies fixes automatically" },
                    { step: 6, label: "Deployment", desc: "One-click hosting on .replit.app domains" },
                  ].map(item => (
                    <div key={item.step} className="flex items-start gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-black text-white">{item.step}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{item.label}</p>
                        <p className="text-[11px] text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3: Context Management */}
          <Card className="border-2 border-purple-200 shadow-xl overflow-hidden">
            <CardHeader className="py-4 bg-gradient-to-r from-purple-500 to-violet-500 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-white font-black">
                <Shield className="h-5 w-5" />
                3. Context Management &amp; Multi-Agent Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                {[
                  { title: "Conversation Persistence", desc: "Saves chat history and project state at checkpoints" },
                  { title: "Context Awareness", desc: "Tracks project details across sessions so it can build incrementally" },
                  { title: "Architect Sub-Agent", desc: "A specialised agent that handles complex architectural decisions" },
                  { title: "Extended Thinking Mode", desc: "Step-by-step reasoning for difficult problems, with real-time web search for current APIs and libraries" },
                ].map(item => (
                  <div key={item.title} className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <p className="text-xs font-bold text-purple-700">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 p-4 border border-purple-200">
                <p className="text-xs text-slate-600">The AI can queue multiple requests without disrupting ongoing tasks and handles multi-step autonomous execution — from a single prompt, it can integrate third-party APIs, set up authentication, configure deployment pipelines, and establish monitoring.</p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION 4: Development Environment Integration */}
          <Card className="border-2 border-cyan-200 shadow-xl overflow-hidden">
            <CardHeader className="py-4 bg-gradient-to-r from-cyan-500 to-teal-500 border-b">
              <CardTitle className="text-base flex items-center gap-2 text-white font-black">
                <Globe className="h-5 w-5" />
                4. Integration with the Development Environment
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                {[
                  { title: "Ghostwriter", desc: "The inline assistance layer that provides autocomplete and code generation", icon: "✍️" },
                  { title: "Multiplayer Collaboration", desc: "Real-time shared workspace where AI assists multiple users simultaneously", icon: "👥" },
                  { title: "Built-in Tools", desc: "Database connections, secrets management, package management, and deployment pipelines all accessible to the AI", icon: "🔧" },
                  { title: "Design Integration", desc: "Can import Figma files and convert them to functional React components", icon: "🎨" },
                ].map(item => (
                  <div key={item.title} className="flex items-start gap-3 p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                    <span className="text-lg">{item.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-cyan-700">{item.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 5: Vibe Coding Pipeline */}
        <Card className="border-2 border-emerald-200 shadow-xl overflow-hidden">
          <CardHeader className="py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 border-b">
            <CardTitle className="text-base flex items-center gap-2 text-white font-black">
              <Rocket className="h-5 w-5" />
              5. The "Vibe Coding" Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 mb-4">When you type <span className="font-mono font-semibold text-emerald-600">"Build a subscription SaaS for pet sitters"</span> — here's what happens:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-9 gap-2">
              {[
                { step: 1, label: "NLP Parsing", desc: "Extracts entities — subscription model, pet sitting domain, SaaS architecture" },
                { step: 2, label: "Tech Stack", desc: "Chooses appropriate frameworks (React/Node.js or similar)" },
                { step: 3, label: "Scaffolding", desc: "Creates folder structure, initialises project, installs deps" },
                { step: 4, label: "DB Schema", desc: "Designs and implements data models" },
                { step: 5, label: "Frontend", desc: "Builds UI components with styling" },
                { step: 6, label: "Backend", desc: "Implements API routes, auth, business logic" },
                { step: 7, label: "Validation", desc: "Tests functionality in virtual browser" },
                { step: 8, label: "Refinement", desc: "Fixes errors automatically or presents to user" },
                { step: 9, label: "Deploy", desc: "Pushes to production infrastructure" },
              ].map(item => (
                <div key={item.step} className="relative p-3 rounded-xl bg-gradient-to-b from-emerald-50 to-green-50 border border-emerald-200 text-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-2 shadow-lg">
                    <span className="text-xs font-black text-white">{item.step}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{item.label}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* KEY DIFFERENTIATORS */}
        <Card className="border-2 border-rose-200 shadow-xl overflow-hidden">
          <CardHeader className="py-4 bg-gradient-to-r from-rose-500 to-pink-600 border-b">
            <CardTitle className="text-base flex items-center gap-2 text-white font-black">
              <Award className="h-5 w-5" />
              Key Technical Differentiators
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: "Virtual Testing Environment", desc: "Unlike most AI coding tools, the Agent can actually use a browser to verify its work — catching bugs that static analysis would miss.", gradient: "from-rose-500 to-pink-500" },
                { title: "Checkpoint System", desc: "Users only pay for meaningful progress, not experimental iterations. Every significant change creates a recoverable snapshot.", gradient: "from-amber-500 to-orange-500" },
                { title: "Real-Time Web Search", desc: "The Agent isn't limited to training data cutoff — it can look up current documentation, latest APIs, and modern best practices.", gradient: "from-blue-500 to-indigo-500" },
                { title: "Fine-Tuned on User Code", desc: "When tuned on public user code, the 3B model outperforms much larger models like CodeLlama-7B — proving quality data beats raw size.", gradient: "from-emerald-500 to-teal-500" },
              ].map(item => (
                <div key={item.title} className="relative isolate overflow-hidden rounded-xl text-white p-5 shadow-lg">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-sm font-black mb-2">{item.title}</p>
                    <p className="text-xs text-white/80">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-slate-100 p-4 border border-slate-200">
              <p className="text-xs text-slate-600">
                <span className="font-bold text-slate-800">The Complete Loop:</span> The system functions as an AI software engineer with its own IDE, testing environment, and deployment infrastructure — not just a code generator, but a complete autonomous development loop.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
