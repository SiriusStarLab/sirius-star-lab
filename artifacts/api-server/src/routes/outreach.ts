import { Router, type IRouter, type Request, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import nodemailer from "nodemailer";

const router: IRouter = Router();

router.post("/outreach/generate", async (req: Request, res: Response) => {
  const { messageType, product, senderName, senderCompany, tone, subjectTemplate, recipients } = req.body;

  if (!recipients || recipients.length === 0) {
    res.status(400).json({ error: "At least one recipient is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  for (const recipient of recipients) {
    try {
      const prompt = `Write a ${tone || "professional"} ${messageType || "cold email"} from ${senderName}${senderCompany ? ` at ${senderCompany}` : ""} to ${recipient.name}${recipient.company ? ` at ${recipient.company}` : ""}${recipient.role ? ` (${recipient.role})` : ""}.

Product/service being promoted: ${product}
${subjectTemplate ? `Subject line to use or adapt: ${subjectTemplate}` : ""}
${recipient.notes ? `Specific context about this person: ${recipient.notes}` : ""}

Instructions:
- Use the recipient's actual name, never placeholders like [Name]
- Make it feel personally written, not templated
- Keep it concise — no more than 150 words for the body
- End with a clear, low-friction call to action
- Do not use corporate buzzwords or hollow opener phrases like "I hope this email finds you well"

Return valid JSON only:
{"subject":"...","body":"..."}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.85,
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      res.write(`data: ${JSON.stringify({
        recipientId: recipient.id,
        name: recipient.name,
        email: recipient.email,
        subject: result.subject || "",
        body: result.body || "",
      })}\n\n`);
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ recipientId: recipient.id, error: err.message })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

router.post("/outreach/send", async (req: Request, res: Response) => {
  const { messages, smtpHost, smtpPort, smtpUser, smtpPass, fromName, fromEmail } = req.body;

  const host = smtpHost || process.env.SMTP_HOST;
  const port = Number(smtpPort || process.env.SMTP_PORT || 587);
  const user = smtpUser || process.env.SMTP_USER;
  const pass = smtpPass || process.env.SMTP_PASS;
  const from = fromEmail || process.env.SMTP_FROM || user;
  const name = fromName || process.env.SMTP_FROM_NAME || senderName(messages);

  if (!host || !user || !pass) {
    res.status(400).json({
      error: "SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to your environment, or enter them in the send settings panel.",
    });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    const results: { to: string; status: string; error?: string }[] = [];

    for (const msg of messages) {
      try {
        await transporter.sendMail({
          from: `"${name}" <${from}>`,
          to: msg.to,
          subject: msg.subject,
          text: msg.body,
          html: msg.body
            .split("\n\n")
            .map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
            .join(""),
        });
        results.push({ to: msg.to, status: "sent" });
      } catch (err: any) {
        results.push({ to: msg.to, status: "failed", error: err.message });
      }
    }

    res.json({
      results,
      sent: results.filter((r) => r.status === "sent").length,
      failed: results.filter((r) => r.status === "failed").length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function senderName(messages: any[]): string {
  return "Sirius Outreach";
}

export default router;
