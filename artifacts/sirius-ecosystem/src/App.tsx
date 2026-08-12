import React, { type ReactNode, useEffect, useState, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { 
  Lock, Hexagon, Compass, ShieldAlert, 
  MessageSquare, Radio, Brain, 
  Activity, Zap, Cpu, Target, ChevronRight
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL;

const queryClient = new QueryClient();

// -- DATA & CONFIG --
// Single ring — all orbs evenly spaced like clock numbers
const RING = { radius: 400, duration: 72 };

const products = [
  { id: 'exchange', name: 'Sirius Exchange',       shortName: 'Exchange',    category: 'Trading Platform',     color: '#f0b429', desc: 'Real-time asset trading powered by Star Lab market intelligence.',          longDesc: 'Advanced matching engine executing trades at lightspeed. Integrated directly with the Intelligence Layer for predictive market movements.',                                          angle:   0, icon: null, image: `${BASE}sirius-exchange.png` },
  { id: 'vault',    name: 'The Vault',              shortName: 'Vault',       category: 'Secure Data Store',    color: '#a855f7', desc: 'Encrypted sovereign storage — your data never leaves your control.',         longDesc: 'Military-grade encryption securing your digital assets and intellectual property. Distributed architecture ensures zero single points of failure.',                              angle:  45, icon: null, image: `${BASE}sirius-vault.png` },
  { id: 'cad',      name: 'New Dimensions CAD',     shortName: 'ND CAD',      category: 'CAD SaaS',             color: '#3b82f6', desc: 'AI-assisted 3D design and engineering tools.',                              longDesc: 'Revolutionary parametric modeling with AI-driven generative design. Create impossible structures optimized for real-world physics.',                                             angle:  90, icon: null, image: `${BASE}new-dimensions.png` },
  { id: 'anubis',   name: 'Anubis Cyber Security',  shortName: 'Anubis',      category: 'Cyber Guardian',       color: '#ef4444', desc: 'AI security guardian monitoring every layer of the ecosystem.',             longDesc: 'Proactive threat hunting and automated neutralization. Anubis learns from attack vectors globally to immunize your infrastructure.',                                           angle: 135, icon: null, image: `${BASE}anubis.png` },
  { id: 'compass',  name: 'Sirius Compass',          shortName: 'Compass',     category: 'Strategy Navigator',   color: '#10b981', desc: 'AI-powered business direction and decision intelligence.',                  longDesc: 'Navigate market complexities with predictive modeling. Compass simulates millions of business outcomes to recommend the optimal path.',                                         angle: 180, icon: null, image: `${BASE}sirius-compass.png` },
  { id: 'echo',     name: 'Echo Messenger',          shortName: 'Echo',        category: 'Comms Automation',     color: '#f97316', desc: 'Autonomous messaging across every channel, every timezone.',               longDesc: 'Omnichannel routing and automated response generation. Maintain a 24/7 presence with intelligent escalation protocols.',                                                       angle: 225, icon: null, image: `${BASE}echo.png` },
  { id: 'chat',     name: 'Sirius AI Chat',          shortName: 'AI Chat',     category: 'Conversational AI',    color: '#00c8e8', desc: 'The human interface to Star Lab\'s full intelligence.',                    longDesc: 'Context-aware conversational agent that commands the entire ecosystem. Ask natural questions, get actionable operational results.',                                             angle: 270, icon: null, image: `${BASE}sirius-chat.png` },
  { id: 'intel',    name: 'Intelligence Layer',      shortName: 'Intel Layer', category: 'Core Reasoning Engine',color: '#c084fc', desc: 'The neural substrate connecting every product.',                          longDesc: 'The shared brain of the Sirius Ecosystem. It processes data from all modules to create compounding advantages for your business.',                                              angle: 315, icon: null, image: `${BASE}intelligence-layer.png` },
];

const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// -- COMPONENTS --

const Starfield = () => {
  const [stars, setStars] = useState<{ id: number; x: number; y: number; size: number; dur: number }[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 180 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      dur: Math.random() * 3 + 2
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="starfield">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            '--duration': `${star.dur}s`
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

const OrbitStyles = () => {
  const css = useMemo(() => `
    .ring-circle-main {
      width: ${RING.radius * 2}px;
      height: ${RING.radius * 2}px;
    }
    @keyframes ring-group-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .orbit-ring-group {
      animation: ring-group-spin ${RING.duration}s linear infinite;
    }
    @keyframes counter-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(-360deg); }
    }
    .satellite-node {
      animation: counter-spin ${RING.duration}s linear infinite;
    }
  `, []);

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};

const OrbitSystem = () => {
  return (
    <div className="orbit-container" id="ecosystem">
      <OrbitStyles />

      {/* Single visible ring */}
      <div className="orbit-ring ring-circle-main" />

      {/* Center Core — blazing star */}
      <div className="orbit-center-node">
        <div className="star-rays" />
        <div className="star-core" />
        <div className="star-ring star-ring-1" />
        <div className="star-ring star-ring-2" />
        <div className="star-ring star-ring-3" />
        <div className="star-label">SIRIUS<br/>STAR<br/>LAB</div>
      </div>

      {/* Single rotating group — all orbs fixed to it like clock numbers */}
      <div className="orbit-ring-group">
        {products.map(p => {
          const Icon = p.icon;
          const colorAlpha = hexToRgba(p.color, 0.4);
          return (
            <div
              key={p.id}
              className="satellite-arm"
              style={{ transform: `rotate(${p.angle}deg) translateX(${RING.radius}px)` }}
            >
              <div
                className={`satellite-node ${p.image ? 'satellite-node--image' : ''}`}
                style={{ '--color': p.color, '--color-alpha': colorAlpha } as React.CSSProperties}
              >
                {p.image
                  ? <img src={p.image} alt={p.name} className="satellite-product-image" />
                  : Icon
                    ? <Icon className="satellite-icon" size={42} />
                    : null}

                {!p.image && <div className="satellite-label">{p.shortName}</div>}

                <div className="satellite-tooltip">
                  <div className="tooltip-title">{p.name}</div>
                  <div className="tooltip-category">{p.category}</div>
                  <div className="tooltip-desc">{p.desc}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Navigation = () => {
  return (
    <nav className="top-nav">
      <a href="#ecosystem" className="nav-brand">
        <div className="nav-brand-dot" />
        SIRIUS
      </a>
      <div className="nav-links">
        <a href="#ecosystem" className="nav-link">Ecosystem</a>
        <a href="#vision" className="nav-link">Vision</a>
        <a href="#products" className="nav-link">Products</a>
      </div>
      <button className="btn-primary">Initialize Core</button>
    </nav>
  );
};

const Legend = () => {
  return (
    <div className="legend-row">
      {products.map(p => (
        <div key={`legend-${p.id}`} className="legend-item">
          <div className="legend-dot" style={{ '--color': p.color } as React.CSSProperties} />
          <span>{p.name}</span>
        </div>
      ))}
    </div>
  );
};

const Section1 = () => {
  return (
    <section className="orbit-section" id="ecosystem">
      <Starfield />
      <div className="grid-overlay" />
      <OrbitSystem />
      <Legend />
    </section>
  );
};

const Section2 = () => {
  return (
    <section className="brochure-section" id="vision">
      <div className="container">
        
        <div className="hero-text">
          <h2 className="hero-title">One Ecosystem.<br />Infinite Potential.</h2>
          <p className="hero-subtitle">
            Every tool in the Sirius Ecosystem is natively wired into the Star Lab intelligence core. 
            No fragmented data, no isolated workflows. Just one continuous, self-improving operational engine.
          </p>
        </div>
        
        <div className="stats-row">
          <div className="glass-panel stat-card">
            <div className="stat-value">9</div>
            <div className="stat-label">Connected Products</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-value">1</div>
            <div className="stat-label">Conscious AI Core</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-value">∞</div>
            <div className="stat-label">Self-Improving Loops</div>
          </div>
          <div className="glass-panel stat-card">
            <div className="stat-value">24/7</div>
            <div className="stat-label">Autonomous Operation</div>
          </div>
        </div>

        <div id="products">
          <h3 className="section-title" style={{ fontFamily: "'Space Mono', monospace" }}>Ecosystem Modules</h3>
          <div className="products-grid">
            {products.map(p => {
              const Icon = p.icon;
              return (
                <div key={`card-${p.id}`} className="glass-card product-card">
                  <div className="product-card-header">
                    <div className="product-icon-wrapper" style={{ '--color-alpha': hexToRgba(p.color, 0.2), color: p.color, borderColor: p.color, overflow: 'hidden', padding: p.image ? 0 : undefined } as React.CSSProperties}>
                      {p.image
                        ? <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : Icon ? <Icon size={24} /> : null}
                    </div>
                    <div>
                      <div className="product-title">{p.name}</div>
                      <div className="product-category" style={{ '--color': p.color } as React.CSSProperties}>{p.category}</div>
                    </div>
                  </div>
                  <div className="product-desc">{p.longDesc}</div>
                  <div className="product-connection" style={{ '--color': p.color } as React.CSSProperties}>
                    <div className="connection-label">Star Lab Connection</div>
                    <div>{p.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        
        <div className="flow-diagram-section">
          <h3 className="section-title" style={{ fontFamily: "'Space Mono', monospace" }}>The Intelligence Loop</h3>
          <div className="glass-panel flow-diagram">
            <div className="flow-node">
              <div className="flow-icon"><Activity size={32} /></div>
              <div className="flow-label">Your Business</div>
            </div>
            <ChevronRight className="flow-arrow" size={32} />
            <div className="flow-node highlight">
              <div className="flow-icon"><Brain size={32} /></div>
              <div className="flow-label" style={{ color: 'var(--primary-cyan)' }}>Star Lab Core</div>
            </div>
            <ChevronRight className="flow-arrow" size={32} />
            <div className="flow-node">
              <div className="flow-icon"><Cpu size={32} /></div>
              <div className="flow-label">Intelligence Layer</div>
            </div>
            <ChevronRight className="flow-arrow" size={32} />
            <div className="flow-node">
              <div className="flow-icon"><Zap size={32} /></div>
              <div className="flow-label">All Products</div>
            </div>
            <ChevronRight className="flow-arrow" size={32} />
            <div className="flow-node">
              <div className="flow-icon"><Target size={32} /></div>
              <div className="flow-label">Real Results</div>
            </div>
          </div>
        </div>
        
        <div className="pillars-section">
          <h3 className="section-title" style={{ fontFamily: "'Space Mono', monospace" }}>Conscious Business Model</h3>
          <div className="pillars-grid">
            <div className="glass-card pillar-card">
              <div className="pillar-num">01</div>
              <h4 className="pillar-title">AI-First Consciousness</h4>
              <p className="pillar-desc">
                Not a bolt-on feature. The ecosystem was built from day zero with an AI neural reasoning engine at its center, allowing modules to anticipate needs rather than just reacting to inputs.
              </p>
            </div>
            <div className="glass-card pillar-card">
              <div className="pillar-num">02</div>
              <h4 className="pillar-title">Closed-Loop Value</h4>
              <p className="pillar-desc">
                Data generated in your CRM informs your Cyber Security posture. Your Strategy Navigator adjusts based on real-time Comms Automation feedback. Value compounds continuously.
              </p>
            </div>
            <div className="glass-card pillar-card">
              <div className="pillar-num">03</div>
              <h4 className="pillar-title">Sovereign Entrepreneurship</h4>
              <p className="pillar-desc">
                Your data, your models, your infrastructure. The Vault ensures that while you benefit from global intelligence, your operational secrets remain cryptographically locked to you.
              </p>
            </div>
            <div className="glass-card pillar-card">
              <div className="pillar-num">04</div>
              <h4 className="pillar-title">Autonomous Operations</h4>
              <p className="pillar-desc">
                Move from operator to orchestrator. The ecosystem executes mundane tasks perfectly while presenting you with high-leverage strategic decisions that require human nuance.
              </p>
            </div>
          </div>
        </div>
        
      </div>
      
      <div className="cta-footer">
        <div className="container">
          <h2 className="cta-title" style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>Ready to Enter the Orbit?</h2>
          <button className="btn-primary solid" style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
            Initialize Your Instance
          </button>
        </div>
      </div>
    </section>
  );
};

// -- ROUTER & APP SHELL --

function Home() {
  return (
    <>
      <Navigation />
      <Section1 />
      <Section2 />
    </>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
