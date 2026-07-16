import { openai } from "@workspace/ai-client";

const REVIEWER_MODEL = "anthropic/claude-haiku-4.5";

const PROTECTED_PATHS = new Set([
  "src/app.ts",
  "src/middlewares/security.ts",
  "src/lib/lab-auth.ts",
  "build.ts",
  "src/index.ts",
  "src/routes/index.ts",
]);

export interface ReviewResult {
  approved: boolean;
  protectedFileViolation: boolean;
  concerns: string[];
  summary: string;
  model: string;
}

export function checkProtectedPath(filePath: string): boolean {
  const normalized = filePath.replace(/^\/+/, "").replace(/\\/g, "/");
  return PROTECTED_PATHS.has(normalized);
}

export async function reviewCodeChange(params: {
  filePath: string;
  originalContent: string;
  newContent: string;
  description: string;
  apiKey: string;
}): Promise<ReviewResult> {
  const { filePath, originalContent, newContent, description, apiKey } = params;

  if (checkProtectedPath(filePath)) {
    return {
      approved: false,
      protectedFileViolation: true,
      concerns: [`${filePath} is a protected file and cannot be modified autonomously.`],
      summary: "Blocked: protected file.",
      model: REVIEWER_MODEL,
    };
  }

  const diff = buildDiff(originalContent, newContent);

  const systemPrompt = `You are a strict senior code reviewer for a production Node.js/TypeScript API server called Sirius.
Your job: review proposed code changes and decide if they are safe to auto-deploy without human sign-off.
Be conservative. When in doubt, reject.

Respond ONLY with a JSON object in this exact format:
{"approved":true|false,"concerns":["concern 1"],"summary":"one sentence summary"}

REJECT if ANY of these are true:
- Change modifies authentication, authorisation, or PIN validation logic
- Change introduces SQL injection risk or unescaped user input in queries
- Change adds or modifies rate limiting or security middleware
- Change removes error handling
- Change hardcodes secrets, credentials, or API keys
- Change touches file system paths outside of /tmp or /opt/sirius-source
- Change adds exec(), eval(), or dynamic code execution without sandboxing
- Change is vague or undescribed
- Diff is larger than 300 lines (too risky for auto-deploy)
- TypeScript has obvious type errors visible in the diff

APPROVE if:
- Change is a clear, well-scoped addition (new route, new function, new helper)
- Change does exactly what the description says
- Change follows existing code patterns
- Change has no security implications`;

  const userPrompt = `FILE: ${filePath}
DESCRIPTION: ${description}

DIFF (- removed, + added):
${diff.slice(0, 6000)}

Is this safe to auto-deploy?`;

  try {
    const completion = await openai.chat.completions.create({
      model: REVIEWER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { approved?: boolean; concerns?: string[]; summary?: string };

    return {
      approved: parsed.approved === true,
      protectedFileViolation: false,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      summary: parsed.summary ?? "No summary provided.",
      model: REVIEWER_MODEL,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      approved: false,
      protectedFileViolation: false,
      concerns: [`Reviewer error: ${msg}`],
      summary: "Review failed — treating as rejected for safety.",
      model: REVIEWER_MODEL,
    };
  }
}

function buildDiff(original: string, updated: string): string {
  const origLines = original.split("\n");
  const newLines = updated.split("\n");
  const result: string[] = [];

  const max = Math.max(origLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    const o = origLines[i];
    const n = newLines[i];
    if (o === undefined) {
      result.push(`+ ${n}`);
    } else if (n === undefined) {
      result.push(`- ${o}`);
    } else if (o !== n) {
      result.push(`- ${o}`);
      result.push(`+ ${n}`);
    }
  }

  return result.length > 0 ? result.join("\n") : "(no changes detected)";
}
