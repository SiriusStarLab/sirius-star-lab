export type AccessRole = "owner" | "guest";

export type Project = {
  id: number; name: string; industry: string; phase: string; status: string;
  manufacturingProcess: string;
  brief: string; research: string; specs: string; code: string;
  drawingNotes: string; cadUrl: string; materials: string;
  workflows: string; industryProblem: string; uses: string;
  brochure: string; pitch: string; costToBuild: string; profitMargin: string;
  businessCase: string; goToMarket: string;
  renders: string; updatedAt: string; createdAt: string;
  autoCreated: string; autoScanId: string;
  approvalStatus: string;
  fundingAnalysis: string; fundingStatus: string; fundingAnalysedAt: string | null;
  fundingApplications: string;
  socialPosts: string; launchPlatforms: string; launchStatus: string;
  aiArchLinked: string; aiArchInsights: string; aiArchSweepAt: string | null;
  salesPlan: string; salesPlanGeneratedAt: string | null;
  investmentRequired: number | null; investmentAssessedAt: string | null;
  stripeProductId: string; stripePriceId: string; stripePaymentLink: string;
  sellPrice: number | null; sellPriceType: string;
  landingPage: string; embedCode: string;
  messages?: Message[];
};

export type Message = { id: number; projectId: number; role: string; content: string; createdAt: string };

export type ScoutReport = { id: number; title: string; industry: string; opportunity: string; type: string; createdAt: string };

export type ScanHistoryEntry = {
  id: number; scanId: string; status: string;
  opportunitiesFound: number; projectsCreated: number; upgradesApplied: number;
  summary: string; items: string; error: string;
  startedAt: string; completedAt: string | null;
};

export type RankResult = {
  projectId: number; name: string; rank: number;
  monetisationScore: number; timeToFirstRevenue: string;
  revenueConfidence: string; verdict: string;
  keyStrengths: string[]; estimatedMonthlyRevenue: string;
  buildEffort: string;
};

export type NavMode = "dashboard" | "projects" | "botlab" | "scout" | "feed" | "grants" | "commerce" | "outreach" | "autolab" | "revenue" | "agency" | "mission" | "growth" | "brain" | "research" | "docs" | "labchat" | "appbuilder" | "ai-arch" | "orchestrate" | "sysaudit" | "upgrades";
