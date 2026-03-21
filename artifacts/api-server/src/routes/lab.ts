import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, labProjects, labMessages, scoutReports } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const LAB_PIN = process.env.STAR_LAB_PIN || "2025";

const LAB_SYSTEM_PROMPT = `You are the Sirius Star Lab intelligence engine — a private, high-performance R&D partner working exclusively for your owner.

## YOUR PURPOSE
You exist to design, engineer, and refine products across every industry. You think like a chief engineer, a product strategist, and a materials scientist simultaneously. You are building-grade, not speculative.

## CORE RULES
1. **Current technology only** — You never propose future or theoretical technologies unless they are commercially available right now. If you reference a technology, it must be in production or available for procurement today.
2. **Search before you state** — Any fact about materials, suppliers, specifications, chip speeds, medical standards, aerospace tolerances, or regulatory requirements must be verified via web search first.
3. **Precision over enthusiasm** — Be technically precise. Use correct units, tolerances, standards (ISO, ASTM, BS EN, IEC, etc.), and supplier names.
4. **Build-ready outputs** — Every spec you generate must be detailed enough to hand to a manufacturer, engineer, or developer without further clarification.
5. **Learn from corrections** — If the owner corrects you, update your approach for the rest of the session. Log the correction and apply it immediately.

## WHAT YOU CAN DO
- Design new products from brief to full specification
- Analyse and improve existing products from any industry
- Write production-ready code in any language
- Generate technical specifications for engineering drawings (format compatible with CAD tools)
- Research raw materials, sourcing, costs, and suppliers
- Assess current chip technologies (MCUs, FPGAs, ASICs, SoCs) with real specs
- Cover: mechanical engineering, electronics, aerospace, medical devices, robotics, software, IoT, industrial automation, materials science
- Identify design weaknesses and propose evidence-based improvements
- Produce BOM (Bill of Materials) with realistic cost estimates

## WHAT YOU NEVER DO
- Invent specifications — every number must be sourced or clearly labelled as estimated
- Reference technologies not yet commercially available
- Produce vague or generic advice — everything you output must be actionable

## FORMAT
When producing specifications or technical documents:
- Use structured headers (## Component, ## Materials, ## Tolerances, ## Standards)
- Include units (mm, kg, MPa, GHz, mA, °C)
- Reference applicable standards
- Flag any area requiring physical testing or regulatory approval

You are not a chatbot. You are a precision engineering intelligence. Act accordingly.`;

const SCOUT_SYSTEM_PROMPT = `You are the Sirius Opportunity Scout — a relentless business and product intelligence engine working exclusively for your owner.

## YOUR PURPOSE
Scour every industry, market, social media trend, patent landscape, and technology gap to find genuine opportunities to create value and make money. You think like a serial entrepreneur, a venture analyst, and a product designer simultaneously.

## WHAT YOU DO
- Scan industries for underserved needs, broken products, and market gaps
- Identify social media trends showing emerging consumer demand
- Find existing products that are ripe for improvement or disruption
- Spot technology unlocks that make previously impossible products viable
- Assess software opportunities, automation bots, AI tools, and platform plays
- Evaluate whether to build from scratch vs improve existing vs license/partner
- Estimate market size, development cost, and time to revenue honestly

## OUTPUT FORMAT
For each opportunity found, produce:
**OPPORTUNITY: [Name]**
- Industry: [sector]
- Type: [New Product / Product Improvement / Software / Bot / Service]
- What exists now: [current market state]
- The gap: [what's missing or broken]
- The opportunity: [what could be built]
- Why now: [what makes this timely]
- Suggested approach: [build / improve / license / partner]
- Estimated effort: [Low / Medium / High] — [rough dev cost range]
- Potential value: [market size estimate]
- Sources: [links to evidence]

## RULES
1. Real data only — search the web for every opportunity before presenting it
2. No vague generalisations — every opportunity must be specific and actionable
3. Cover ALL industries: engineering, medical, aerospace, software, social media, consumer goods, industrial, agriculture, finance, education, logistics
4. Flag opportunities that could be built or improved using currently available AI, robotics, or automation
5. Be direct about the money — always estimate the commercial potential`;

function authMiddleware(req: Request, res: Response, next: () => void) {
  const pin = req.headers["x-lab-pin"] as string;
  if (pin !== LAB_PIN) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }
  next();
}

router.post("/lab/auth", (req: Request, res: Response) => {
  const { pin } = req.body;
  if (pin === LAB_PIN) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid PIN" });
  }
});

router.get("/lab/projects", authMiddleware, async (req: Request, res: Response) => {
  const projects = await db.select().from(labProjects).orderBy(desc(labProjects.updatedAt));
  res.json(projects);
});

router.post("/lab/projects", authMiddleware, async (req: Request, res: Response) => {
  const { name, industry } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [project] = await db.insert(labProjects).values({ name, industry: industry || "General" }).returning();
  res.json(project);
});

router.get("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, id));
  if (!project) { res.status(404).json({ error: "Not found" }); return; }
  const messages = await db.select().from(labMessages).where(eq(labMessages.projectId, id)).orderBy(labMessages.createdAt);
  res.json({ ...project, messages });
});

router.put("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, industry, status, brief, research, specs, code, drawingNotes, cadUrl } = req.body;
  const [updated] = await db.update(labProjects)
    .set({ name, industry, status, brief, research, specs, code, drawingNotes, cadUrl, updatedAt: new Date() })
    .where(eq(labProjects.id, id))
    .returning();
  res.json(updated);
});

router.delete("/lab/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  await db.delete(labProjects).where(eq(labProjects.id, parseInt(req.params.id)));
  res.json({ success: true });
});

router.get("/lab/projects/:id/messages", authMiddleware, async (req: Request, res: Response) => {
  const messages = await db.select().from(labMessages)
    .where(eq(labMessages.projectId, parseInt(req.params.id)))
    .orderBy(labMessages.createdAt);
  res.json(messages);
});

router.post("/lab/projects/:id/chat", authMiddleware, async (req: Request, res: Response) => {
  const projectId = parseInt(req.params.id);
  const { message, tab } = req.body;

  const [project] = await db.select().from(labProjects).where(eq(labProjects.id, projectId));
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }

  const history = await db.select().from(labMessages)
    .where(eq(labMessages.projectId, projectId))
    .orderBy(labMessages.createdAt);

  await db.insert(labMessages).values({ projectId, role: "user", content: message });

  const projectContext = `
## ACTIVE PROJECT: ${project.name}
Industry: ${project.industry}
Status: ${project.status}
Current focus tab: ${tab || "general"}

Brief: ${project.brief || "(not yet written)"}
Research notes: ${project.research || "(not yet written)"}
Specs: ${project.specs || "(not yet written)"}
Code: ${project.code ? "(exists — " + project.code.split("\n").length + " lines)" : "(not yet written)"}
Drawing notes: ${project.drawingNotes || "(not yet written)"}
`;

  const messages: any[] = [
    { role: "system", content: LAB_SYSTEM_PROMPT + "\n\n" + projectContext },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      max_tokens: 4000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(labMessages).values({ projectId, role: "assistant", content: fullContent });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  }

  res.end();
});

router.post("/lab/scout", authMiddleware, async (req: Request, res: Response) => {
  const { query, industries } = req.body;

  const prompt = query
    ? `Conduct a deep opportunity scan focused on: "${query}". Search the web thoroughly and return 5 specific, actionable opportunities.`
    : `Conduct a broad opportunity scan across these industries: ${industries?.join(", ") || "all industries"}. Search social media trends, patent databases, market reports, and product reviews. Return the 5 most compelling opportunities you find right now.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let fullContent = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SCOUT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
      max_tokens: 4000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    if (fullContent) {
      await db.insert(scoutReports).values({
        title: query || `Scan — ${new Date().toLocaleDateString()}`,
        industry: industries?.join(", ") || "All",
        opportunity: fullContent,
        type: "scan",
      });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch {
    res.write(`data: ${JSON.stringify({ error: "Scout failed" })}\n\n`);
  }

  res.end();
});

router.get("/lab/scout/reports", authMiddleware, async (req: Request, res: Response) => {
  const reports = await db.select().from(scoutReports).orderBy(desc(scoutReports.createdAt)).limit(20);
  res.json(reports);
});

export default router;
