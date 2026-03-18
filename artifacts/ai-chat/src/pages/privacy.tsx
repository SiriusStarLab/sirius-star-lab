import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock } from "lucide-react";

const EFFECTIVE_DATE = "17 March 2026";
const PRODUCT_NAME = "Sirius AI";
const CONTACT_EMAIL = "privacy@siriusai.app";

export function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "hsl(224 28% 5%)", color: "hsl(220 20% 92%)" }}>
      <div className="max-w-3xl mx-auto px-6 py-14">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-mono text-primary/70 hover:text-primary transition-colors mb-10">
          <ArrowLeft size={14} />
          Back to Sirius
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Lock size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            Privacy Policy
          </h1>
        </div>
        <p className="text-xs font-mono text-muted-foreground/50 mb-10 tracking-widest uppercase">
          {PRODUCT_NAME} · Effective {EFFECTIVE_DATE}
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-foreground/75">

          <section>
            <p className="p-4 rounded-xl text-sm" style={{ background: "hsl(193 100% 52% / 0.07)", border: "1px solid hsl(193 100% 52% / 0.2)" }}>
              Your privacy is a core commitment, not an afterthought. We collect only what we need to make Sirius work well for you. We do not sell your data. We do not share it with advertisers. We never will.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              1. Who We Are
            </h2>
            <p>
              {PRODUCT_NAME} is an AI partnership platform — a genuine meeting of human and artificial intelligence. This Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using the Service, you consent to the practices described in this Policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              2. What We Collect
            </h2>
            <div className="space-y-4">
              {[
                {
                  title: "Conversation content",
                  desc: "The messages you send to Sirius and the responses you receive are stored to maintain conversation history and session continuity. You can delete individual conversations at any time."
                },
                {
                  title: "Personalisation data",
                  desc: "If you use the profile and memory features, we store your preferences (AI name, personality settings, preferred language) and key facts Sirius has learned about you — such as your interests, goals, or context you've shared. This data is used exclusively to personalise your experience."
                },
                {
                  title: "Usage data",
                  desc: "We track basic usage metrics — such as daily message counts — to enforce subscription limits and improve the Service. We do not track detailed behavioural analytics or sell usage profiles."
                },
                {
                  title: "Voice recordings",
                  desc: "If you use the voice input feature, your audio recording is sent directly to OpenAI's Whisper transcription service and is not stored by us after transcription. The transcribed text may appear in your conversation."
                },
                {
                  title: "Images",
                  desc: "Images you upload for analysis are sent to OpenAI for vision processing and are not stored on our servers after the response is generated."
                },
                {
                  title: "Subscription data",
                  desc: "If you subscribe to a paid plan, payment processing is handled by PayPal. We do not store your payment card details. We retain a subscription ID and plan type to manage your account."
                },
                {
                  title: "A unique user identifier",
                  desc: "We assign a random identifier stored in your browser's local storage to link your conversations and profile. This is not tied to your name or email unless you provide them."
                },
              ].map((item, i) => (
                <div key={i} className="pl-4" style={{ borderLeft: "2px solid hsl(193 100% 52% / 0.25)" }}>
                  <p className="font-medium text-foreground/90 mb-1">{item.title}</p>
                  <p className="text-foreground/60 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              3. How We Use Your Data
            </h2>
            <ul className="space-y-2">
              {[
                "To provide the Service — generating responses, maintaining history, and personalising your experience",
                "To enforce subscription limits and manage your account",
                "To improve the quality and accuracy of responses over time",
                "To detect and prevent abuse, fraud, or violations of our Terms of Service",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-primary/50 font-mono text-xs mt-1 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              We do <strong className="text-foreground">not</strong> use your conversations to train AI models. We do <strong className="text-foreground">not</strong> sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              4. Third-Party Services
            </h2>
            <p className="mb-3">To deliver the Service, we use the following third-party providers, each with their own privacy policies:</p>
            <div className="space-y-2">
              {[
                { name: "OpenAI", purpose: "AI response generation, image analysis, voice transcription, and text-to-speech", url: "https://openai.com/privacy" },
                { name: "PayPal", purpose: "Subscription payment processing", url: "https://www.paypal.com/us/legalhub/privacy-full" },
                { name: "Spotify (optional)", purpose: "Music data for users who connect their Spotify account", url: "https://www.spotify.com/uk/legal/privacy-policy/" },
                { name: "Replit", purpose: "Infrastructure and hosting", url: "https://replit.com/site/privacy" },
              ].map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-primary/50 font-mono text-xs mt-0.5 shrink-0">—</span>
                  <span>
                    <strong className="text-foreground/90">{s.name}</strong>
                    {" — "}{s.purpose}.{" "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary text-sm">Privacy policy ↗</a>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              5. Data Retention
            </h2>
            <p>
              Conversation history and profile data are retained for as long as your account is active or as needed to provide the Service. If you delete a conversation, it is permanently removed from our database. You may request deletion of all your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              6. Your Rights
            </h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="space-y-2">
              {[
                "Access the personal data we hold about you",
                "Request correction of inaccurate data",
                "Request deletion of your data (right to be forgotten)",
                "Object to or restrict certain processing of your data",
                "Data portability — receive your data in a structured, machine-readable format",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-primary/50 font-mono text-xs mt-1 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              7. Security
            </h2>
            <p>
              We take reasonable technical and organisational measures to protect your data against unauthorised access, loss, or misuse. All API communications are encrypted in transit. Our AI API keys are stored server-side and never exposed to the browser. However, no system is completely secure — if you discover a security issue, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              8. Children's Privacy
            </h2>
            <p>
              The Service is not directed to children under 13. We do not knowingly collect personal data from children under 13. If we become aware that we have collected such data, we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              9. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted here with an updated effective date. Continued use of the Service after changes are posted constitutes your acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              10. Contact
            </h2>
            <p>
              For any privacy-related questions or data requests, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 flex items-center gap-6" style={{ borderTop: "1px solid hsl(193 100% 52% / 0.1)" }}>
          <Link href="/terms" className="text-xs font-mono text-muted-foreground/40 hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/" className="text-xs font-mono text-muted-foreground/40 hover:text-primary transition-colors">Back to Sirius</Link>
          <span className="text-xs font-mono text-muted-foreground/20 ml-auto">© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        </div>

      </div>
    </div>
  );
}
