import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { labProjects, aiDiscoveries } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();
const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) { res.status(401).json({ error: "Unauthorised" }); return; }
  next();
}

const TODAY = () => new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

// ─── Public Discovery Feed ────────────────────────────────────────────────────
// No auth — public endpoint for the /discover page

router.get("/public/discover", async (_req: Request, res: Response) => {
  try {
    // Latest approved auto-generated projects (what Star Lab has found)
    const projects = await db.select({
      id: labProjects.id,
      name: labProjects.name,
      industry: labProjects.industry,
      phase: labProjects.phase,
      brief: labProjects.brief,
      createdAt: labProjects.createdAt,
    })
    .from(labProjects)
    .where(eq(labProjects.autoCreated, "auto"))
    .orderBy(desc(labProjects.createdAt))
    .limit(12);

    // Latest intelligence discoveries
    const discoveries = await db.select()
      .from(aiDiscoveries)
      .orderBy(desc(aiDiscoveries.discoveredAt))
      .limit(8);

    // Stats
    const allProjects = await db.select({ id: labProjects.id }).from(labProjects);
    const approvedProjects = await db.select({ id: labProjects.id }).from(labProjects)
      .where(eq(labProjects.approvalStatus, "approved"));

    res.json({
      projects: projects.map(p => ({
        ...p,
        brief: p.brief ? p.brief.slice(0, 300) + (p.brief.length > 300 ? "…" : "") : "",
      })),
      discoveries: discoveries.map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        summary: d.summary ? d.summary.slice(0, 200) + (d.summary.length > 200 ? "…" : "") : "",
        source: d.source,
        createdAt: d.discoveredAt,
      })),
      stats: {
        totalOpportunities: allProjects.length,
        approvedInsights: approvedProjects.length,
        sectorsActive: 8,
        lastScan: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Growth Engine ────────────────────────────────────────────────────────────
// Generates social content, launch material, pitches — for Star Lab use

router.post("/growth/generate", authMiddleware, async (req: Request, res: Response) => {
  const { format } = req.body; // linkedin | twitter | reddit | producthunt | week

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Pull real recent Lab projects for authentic demos
  let recentProjects: any[] = [];
  try {
    recentProjects = await db.select({ name: labProjects.name, industry: labProjects.industry })
      .from(labProjects)
      .where(eq(labProjects.approvalStatus, "approved"))
      .orderBy(desc(labProjects.createdAt))
      .limit(6);
  } catch { /* ignore */ }

  const projectList = recentProjects.map(p => `- ${p.name} (${p.industry})`).join("\n");

  const MISSION = `Sirius Star Lab is an intelligence partnership platform built by Garry Hutton of Strategic Innovation Dundee Ltd. The vision: AI and humans becoming something new together — not augmented, fused. The logo shows two faces; you cannot tell which is human, which is AI. That ambiguity IS the message. The slogan: "I think, so I am." The product: autonomous business intelligence, opportunity scanning, AI-generated sales and marketing, and managed AI services for businesses. Plans: Free, Plus £5/mo, Pro £12/mo, Agency £799–£2,499/mo.`;

  const FORMATS: Record<string, { label: string; prompt: string }> = {
    linkedin: {
      label: "LinkedIn Post",
      prompt: `Write a compelling LinkedIn post from Garry Hutton about Sirius Star Lab. 

Context:
${MISSION}

Recent real discoveries Sirius's AI has made:
${projectList || "Opportunities in oil & gas, medical devices, SaaS automation, aerospace components"}

Requirements:
- Start with a single powerful hook line (not "I'm excited to announce")
- Tell the real story: the twins logo, what it means, the neural link vision, why AI and humans are becoming something new
- Show ONE concrete example of what Sirius actually does (reference a real project from the list above)
- End with a clear call to action: "Try it free at [siriusai.app]"
- Use short paragraphs. LinkedIn rewards whitespace.
- 200–350 words
- Tone: founder, honest, a little philosophical, grounded
- Do not use buzzwords. Do not say "game-changer" or "excited to share" or "thrilled"
- Add 4–6 relevant hashtags at the end

Return JSON: {"subject":"[headline/hook]","body":"[full post]","hashtags":"[hashtags]"}`,
    },
    twitter: {
      label: "Twitter/X Thread",
      prompt: `Write a Twitter/X thread (8–12 tweets) from Garry Hutton about Sirius Star Lab.

Context:
${MISSION}

Recent real discoveries:
${projectList || "Multiple sectors including oil & gas, medical, aerospace"}

Requirements:
- Tweet 1: Explosive hook. Make people stop scrolling. Something true and surprising about AI + humans.
- Tweets 2–4: The origin story — why you built this, the twins logo, the neural link vision, stakes
- Tweets 5–7: What Sirius actually DOES. Concrete. Real. Show the sector scanner, the intelligence reports, the agency service.
- Tweet 8–10: The commercial reality — how Star Lab generates revenue while building the mission
- Last tweet: CTA to try it at siriusai.app
- Each tweet max 280 chars. Number each: "1/ text" format.
- Tone: direct, founder, no corporate language

Return JSON: {"subject":"[thread title]","body":"[full thread, one tweet per line starting with number/]"}`,
    },
    reddit: {
      label: "Reddit Post",
      prompt: `Write 3 different Reddit post drafts for Garry Hutton to post in different subreddits about Sirius Star Lab.

Context:
${MISSION}

Subreddits:
1. r/artificial (4.5M members) — AI enthusiasts
2. r/entrepreneur (2.5M members) — business builders
3. r/SideProject (1M members) — indie builders sharing what they made

Requirements for each:
- No promotional language — Reddit HATES ads. Sound like a real person sharing something interesting.
- r/artificial: Focus on the philosophical angle — what does it mean when AI and humans fuse? Show real output.
- r/entrepreneur: Focus on the commercial angle — how Star Lab scans for opportunities and generates revenue ideas
- r/SideProject: Founder story — what you built, why, what it can do, honest metrics
- Each post: 150–300 words. Include the link to siriusai.app naturally at the end.

Return JSON: {"subject":"[Reddit post titles, comma separated]","body":"[POST 1:\\n\\n[content]\\n\\n---\\n\\nPOST 2:\\n\\n[content]\\n\\n---\\n\\nPOST 3:\\n\\n[content]"}`,
    },
    producthunt: {
      label: "Product Hunt Kit",
      prompt: `Write a complete Product Hunt launch kit for Sirius Star Lab.

Context:
${MISSION}

Deliverables:
1. Tagline (max 60 chars)
2. Short description (max 260 chars) 
3. Full description (400–600 words) — tell the vision, what it does, who it's for, what makes it different
4. First comment (the maker comment — tell the real story of why you built this, 200 words)
5. 5 topics/tags to select on Product Hunt
6. Hunter pitch message (what to say when asking someone to hunt you — 100 words)

Return JSON: {"subject":"Sirius Star Lab — Product Hunt Launch Kit","body":"[all sections clearly separated with headers]"}`,
    },
    week: {
      label: "Full Week Content Plan",
      prompt: `Create a 7-day social media content plan for Sirius Star Lab using real, free channels.

Context:
${MISSION}

Recent discoveries to reference:
${projectList || "Opportunities in medical devices, oil & gas, SaaS, aerospace"}

For each day provide:
- Platform (LinkedIn / Twitter / Reddit)
- Post type (hook, story, demo, case study, insight, ask)
- Topic/angle to cover
- Opening line (to hook)
- Key point to make
- CTA

Day 1 should be the founder story (twins logo, neural link, new species)
Day 2: Concrete demo — show what the AI found this week
Day 3: The commercial reality — how businesses are using AI intelligence and how to start for free
Day 4: A question for the audience that generates debate
Day 5: Industry insight (from real Lab data) — something people didn't know
Day 6: Behind the scenes — what Star Lab found this week
Day 7: Product Hunt teaser / week wrap

Return JSON: {"subject":"Sirius Star Lab — 7-Day Growth Content Plan","body":"[full plan, clearly formatted with Day headers]"}`,
    },
  };

  const formats = format === "week"
    ? ["week"]
    : format
    ? [format]
    : ["linkedin", "twitter", "reddit", "producthunt"];

  for (const fmt of formats) {
    const config = FORMATS[fmt];
    if (!config) continue;

    res.write(`data: ${JSON.stringify({ type: "start", format: fmt, label: config.label })}\n\n`);

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are writing marketing and growth content for Sirius Star Lab. Today is ${TODAY()}. Write like a real founder, not a marketer. Be specific, honest, and compelling. No hollow phrases. Return only the JSON requested.`,
          },
          { role: "user", content: config.prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      res.write(`data: ${JSON.stringify({ type: "result", format: fmt, label: config.label, subject: result.subject || "", body: result.body || "", extra: result.hashtags || result.tags || "" })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: "error", format: fmt, error: err.message })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

// Quick single post (for instant generation)
router.post("/growth/quick-post", authMiddleware, async (req: Request, res: Response) => {
  const { platform, angle } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let recentProjects: any[] = [];
  try {
    recentProjects = await db.select({ name: labProjects.name, industry: labProjects.industry })
      .from(labProjects).where(eq(labProjects.approvalStatus, "approved"))
      .orderBy(desc(labProjects.createdAt)).limit(4);
  } catch { /* ignore */ }

  const prompt = `Write one high-performing ${platform || "LinkedIn"} post for Sirius Star Lab.
Angle: ${angle || "Founder story — why AI and humans are becoming something new together"}
Recent Lab discoveries: ${recentProjects.map(p => p.name).join(", ") || "Multiple sectors"}
Requirements: Real, founder voice. Under 300 words. Hook first. End with siriusai.app
Return JSON: {"subject":"[hook line]","body":"[full post]"}`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      stream: true,
      temperature: 0.92,
    });

    let fullContent = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullContent += delta;
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }

    try {
      const parsed = JSON.parse(fullContent);
      res.write(`data: ${JSON.stringify({ type: "done", subject: parsed.subject, body: parsed.body })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    }
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
  }
  res.end();
});

export default router;
