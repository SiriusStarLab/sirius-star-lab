import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

const EFFECTIVE_DATE = "17 March 2026";
const PRODUCT_NAME = "Sirius Star Lab";
const CONTACT_EMAIL = "legal@siriusai.app";

const C = {
  text:    "hsl(220 20% 92%)",
  muted:   "hsl(220 20% 68%)",
  dim:     "hsl(220 20% 50%)",
  faint:   "hsl(220 20% 35%)",
  teal:    "hsl(193 100% 52%)",
  tealDim: "hsl(193 100% 52% / 0.6)",
};

export function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", background: "hsl(224 28% 5%)", color: C.text }}>
      <div style={{ maxWidth: 768, margin: "0 auto", padding: "56px 24px" }}>

        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "monospace", color: C.tealDim, textDecoration: "none", marginBottom: 40 }}>
          <ArrowLeft size={14} />
          Back to Sirius
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Shield size={20} style={{ color: C.teal }} />
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.text, fontFamily: "Outfit, sans-serif" }}>
            Terms of Service
          </h1>
        </div>
        <p style={{ margin: "0 0 40px", fontSize: 11, fontFamily: "monospace", color: C.faint, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {PRODUCT_NAME} · Effective {EFFECTIVE_DATE}
        </p>

        <div style={{ fontSize: 15, lineHeight: 1.75, color: C.text }}>

          {[
            {
              title: "1. Acceptance",
              body: `By accessing or using ${PRODUCT_NAME} ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These Terms form a legally binding agreement between you and the operators of ${PRODUCT_NAME}.`,
            },
            {
              title: "2. Description of Service",
              body: `${PRODUCT_NAME} is an AI partnership platform that provides real-time, web-verified responses, voice interaction, image analysis, and personalised guidance across a wide range of topics — built on the principle of genuine mutual elevation between human and artificial intelligence. The Service is available under a free tier and paid subscription plans.`,
            },
            {
              title: "4. Intellectual Property",
              body: null,
              ip: true,
            },
            {
              title: "5. Subscriptions and Billing",
              body: null,
              billing: true,
            },
            {
              title: "6. Accuracy Disclaimer",
              body: null,
              disclaimer: true,
            },
            {
              title: "7. Limitation of Liability",
              body: `To the maximum extent permitted by law, ${PRODUCT_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service — including damages for loss of profits, data, goodwill, or other intangible losses — even if we have been advised of the possibility of such damages.`,
            },
            {
              title: "8. Termination",
              body: `We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for any violation of these Terms or for any other reason at our sole discretion. Upon termination, your licence to use the Service immediately ceases.`,
            },
            {
              title: "9. Changes to These Terms",
              body: `We may update these Terms at any time. Changes will be posted on this page with an updated effective date. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.`,
            },
          ].map((s, i) => (
            <section key={i} style={{ marginBottom: 40 }}>
              <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>
                {s.title}
              </h2>
              {s.body && <p style={{ margin: 0 }}>{s.body}</p>}
              {s.ip && (
                <>
                  <p style={{ marginBottom: 12 }}>
                    All elements of {PRODUCT_NAME} — including but not limited to the name, logo, design, interface, system prompts, knowledge curation, response style, voice scripts, and underlying technology — are the exclusive intellectual property of the operators of {PRODUCT_NAME} and are protected by applicable copyright, trademark, and trade secret law.
                  </p>
                  <p style={{ margin: 0 }}>
                    You are granted a limited, non-exclusive, non-transferable licence to access and use the Service for personal, non-commercial purposes. No licence is granted to copy, reproduce, modify, distribute, or create derivative works of any part of the Service.
                  </p>
                </>
              )}
              {s.billing && (
                <>
                  <p style={{ marginBottom: 12 }}>
                    {PRODUCT_NAME} offers a free tier with limited daily usage, and paid subscription plans (Plus and Pro) with expanded capabilities. Paid plans are billed on a recurring monthly basis through our payment processor.
                  </p>
                  <p style={{ marginBottom: 12 }}>
                    By subscribing to a paid plan, you authorise us to charge your payment method on a recurring basis. Subscriptions auto-renew unless cancelled. You may cancel at any time; cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods.
                  </p>
                  <p style={{ margin: 0 }}>
                    We reserve the right to change subscription pricing with reasonable advance notice. Continued use after a price change constitutes acceptance of the new pricing.
                  </p>
                </>
              )}
              {s.disclaimer && (
                <>
                  <p style={{ marginBottom: 12 }}>
                    {PRODUCT_NAME} uses real-time web search and advanced AI to provide accurate, source-verified responses. However, the Service is not a substitute for professional medical, legal, financial, psychological, or other licensed professional advice.
                  </p>
                  <p style={{ margin: 0 }}>
                    While we make every effort to ensure accuracy, AI responses may occasionally contain errors. Always verify critical information with qualified professionals. The Service is provided "as is" and we make no warranties of accuracy, completeness, or fitness for a particular purpose.
                  </p>
                </>
              )}
            </section>
          ))}

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>
              3. Prohibited Activities
            </h2>
            <p style={{ marginBottom: 12 }}>You agree not to:</p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "Reverse engineer, decompile, disassemble, or attempt to extract the source code, system prompts, or proprietary logic of the Service",
                "Scrape, crawl, or systematically extract data, responses, or content from the Service by automated means",
                "Use the Service to build a competing product or service, or to replicate its features, knowledge base, or interface",
                "Resell, sublicense, or commercially redistribute access to the Service without written authorisation",
                "Attempt to circumvent rate limits, access controls, subscription restrictions, or any security measures",
                "Use the Service to generate content that is harmful, illegal, defamatory, fraudulent, or that violates any applicable law",
                "Impersonate any person or entity, or misrepresent your identity or affiliation",
                "Attempt to gain unauthorised access to the Service's backend systems, APIs, or databases",
              ].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ color: C.tealDim, fontFamily: "monospace", fontSize: 12, marginTop: 3, flexShrink: 0 }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginBottom: 40 }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600, color: C.text, fontFamily: "Space Mono, monospace" }}>
              10. Contact
            </h2>
            <p style={{ margin: 0 }}>
              For questions about these Terms, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: C.teal }}>{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div style={{ marginTop: 64, paddingTop: 32, display: "flex", alignItems: "center", gap: 24, borderTop: "1px solid hsl(193 100% 52% / 0.1)" }}>
          <Link href="/privacy" style={{ fontSize: 11, fontFamily: "monospace", color: C.faint, textDecoration: "none" }}>Privacy Policy</Link>
          <Link href="/" style={{ fontSize: 11, fontFamily: "monospace", color: C.faint, textDecoration: "none" }}>Back to Sirius</Link>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "hsl(220 20% 25%)", marginLeft: "auto" }}>© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        </div>

      </div>
    </div>
  );
}
