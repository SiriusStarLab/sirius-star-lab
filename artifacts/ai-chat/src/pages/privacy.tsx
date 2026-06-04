import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";

const EFFECTIVE_DATE = "17 March 2026";
const PRODUCT_NAME = "Sirius Star Lab";
const CONTACT_EMAIL = "privacy@siriusai.app";

const C = {
  text:    "hsl(220 20% 92%)",
  muted:   "hsl(220 20% 68%)",
  dim:     "hsl(220 20% 50%)",
  faint:   "hsl(220 20% 35%)",
  teal:    "hsl(193 100% 52%)",
  tealDim: "hsl(193 100% 52% / 0.6)",
  tealBg:  "hsl(193 100% 52% / 0.07)",
  tealBorder: "hsl(193 100% 52% / 0.2)",
  tealBar: "hsl(193 100% 52% / 0.25)",
};

export function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 28% 5%)", color: C.text }}>
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "56px 24px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "monospace", color: C.tealDim, textDecoration: "none", marginBottom: 40 }}>
          <ArrowLeft size={14} />
          Back to Sirius
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Lock size={20} style={{ color: C.teal }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text, fontFamily: "Outfit, sans-serif" }}>
            Privacy Policy
          </h1>
        </div>
        <p style={{ margin: "0 0 40px", fontSize: 11, fontFamily: "monospace", color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {PRODUCT_NAME} · Effective {EFFECTIVE_DATE}
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.75, color: C.text }}>

          <section style={{ marginBottom: 40 }}>
            <p style={{ margin: 0, padding: 16, borderRadius: 12, fontSize: 14, background: C.tealBg, border: `1px solid ${C.tealBorder}` }}>
              Your privacy is a core commitment, not an afterthought. We collect only what we need to make Sirius work well for you. We do not sell your data. We do not share it with advertisers. We never will.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>1. Who We Are</h2>
            <p style={{ margin: 0 }}>
              {PRODUCT_NAME} is an AI partnership platform — a genuine meeting of human and artificial intelligence. This Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using the Service, you consent to the practices described in this Policy.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>2. What We Collect</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { title: "Conversation content", desc: "The messages you send to Sirius and the responses you receive are stored to maintain conversation history and session continuity. You can delete individual conversations at any time." },
                { title: "Personalisation data", desc: "If you use the profile and memory features, we store your preferences (AI name, personality settings, preferred language) and key facts Sirius has learned about you — such as your interests, goals, or context you've shared. This data is used exclusively to personalise your experience." },
                { title: "Usage data", desc: "We track basic usage metrics — such as daily message counts — to enforce subscription limits and improve the Service. We do not track detailed behavioural analytics or sell usage profiles." },
                { title: "Voice recordings", desc: "If you use the voice input feature, your audio recording is sent directly to OpenAI's Whisper transcription service and is not stored by us after transcription. The transcribed text may appear in your conversation." },
                { title: "Images", desc: "Images you upload for analysis are sent to OpenAI for vision processing and are not stored on our servers after the response is generated." },
                { title: "Subscription data", desc: "If you subscribe to a paid plan, payment processing is handled by Stripe. We do not store your payment card details. We retain a subscription ID and plan type to manage your account." },
                { title: "A unique user identifier", desc: "We assign a random identifier stored in your browser's local storage to link your conversations and profile. This is not tied to your name or email unless you provide them." },
              ].map((item, i) => (
                <div key={i} style={{ paddingLeft: 16, borderLeft: `2px solid ${C.tealBar}` }}>
                  <p style={{ margin: "0 0 4px", fontWeight: 500, color: C.text }}>{item.title}</p>
                  <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>3. How We Use Your Data</h2>
            <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "To provide the Service — generating responses, maintaining history, and personalising your experience",
                "To enforce subscription limits and manage your account",
                "To improve the quality and accuracy of responses over time",
                "To detect and prevent abuse, fraud, or violations of our Terms of Service",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: C.tealDim, fontFamily: "monospace", fontSize: 12, marginTop: 3, flexShrink: 0 }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>
              We do <strong style={{ color: C.text }}>not</strong> use your conversations to train AI models. We do <strong style={{ color: C.text }}>not</strong> sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>4. Third-Party Services</h2>
            <p style={{ marginBottom: 12 }}>To deliver the Service, we use the following third-party providers, each with their own privacy policies:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: "OpenAI", purpose: "AI response generation, image analysis, voice transcription, and text-to-speech", url: "https://openai.com/privacy" },
                { name: "Stripe", purpose: "Subscription payment processing", url: "https://stripe.com/gb/privacy" },
                { name: "Kamatera", purpose: "Infrastructure and hosting", url: "https://www.kamatera.com/privacy-policy/" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ color: C.tealDim, fontFamily: "monospace", fontSize: 12, marginTop: 3, flexShrink: 0 }}>—</span>
                  <span>
                    <strong style={{ color: C.text }}>{s.name}</strong>
                    {" — "}{s.purpose}.{" "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: C.tealDim, fontSize: 14 }}>Privacy policy ↗</a>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>5. Data Retention</h2>
            <p style={{ margin: 0 }}>
              Conversation history and profile data are retained for as long as your account is active or as needed to provide the Service. If you delete a conversation, it is permanently removed from our database. You may request deletion of all your data at any time by contacting us.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>6. Your Rights</h2>
            <p style={{ marginBottom: 12 }}>Depending on your jurisdiction, you may have the right to:</p>
            <ul style={{ listStyle: "none", margin: "0 0 16px", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Access the personal data we hold about you",
                "Request correction of inaccurate data",
                "Request deletion of your data (right to be forgotten)",
                "Object to or restrict certain processing of your data",
                "Data portability — receive your data in a structured, machine-readable format",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: C.tealDim, fontFamily: "monospace", fontSize: 12, marginTop: 3, flexShrink: 0 }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0 }}>
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.teal }}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>7. Security</h2>
            <p style={{ margin: 0 }}>
              We take reasonable technical and organisational measures to protect your data against unauthorised access, loss, or misuse. All API communications are encrypted in transit. Our AI API keys are stored server-side and never exposed to the browser. However, no system is completely secure — if you discover a security issue, please contact us immediately.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>8. Children's Privacy</h2>
            <p style={{ margin: 0 }}>
              The Service is not directed to children under 13. We do not knowingly collect personal data from children under 13. If we become aware that we have collected such data, we will delete it promptly.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>9. Changes to This Policy</h2>
            <p style={{ margin: 0 }}>
              We may update this Privacy Policy from time to time. Changes will be posted here with an updated effective date. Continued use of the Service after changes are posted constitutes your acceptance.
            </p>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>10. Contact</h2>
            <p style={{ margin: 0 }}>
              For any privacy-related questions or data requests, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.teal }}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div style={{ marginTop: 64, paddingTop: 32, display: "flex", alignItems: "center", gap: 24, borderTop: "1px solid hsl(193 100% 52% / 0.1)" }}>
          <Link href="/terms" style={{ fontSize: 11, fontFamily: "monospace", color: C.faint, textDecoration: "none" }}>Terms of Service</Link>
          <Link href="/" style={{ fontSize: 11, fontFamily: "monospace", color: C.faint, textDecoration: "none" }}>Back to Sirius</Link>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "hsl(220 20% 25%)", marginLeft: "auto" }}>© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        </div>

      </div>
    </div>
  );
}
