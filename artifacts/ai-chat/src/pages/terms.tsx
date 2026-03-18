import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

const EFFECTIVE_DATE = "17 March 2026";
const PRODUCT_NAME = "Sirius AI";
const CONTACT_EMAIL = "legal@siriusai.app";

export function TermsPage() {
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
          <Shield size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "Outfit, sans-serif" }}>
            Terms of Service
          </h1>
        </div>
        <p className="text-xs font-mono text-muted-foreground/50 mb-10 tracking-widest uppercase">
          {PRODUCT_NAME} · Effective {EFFECTIVE_DATE}
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed text-foreground/75">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              1. Acceptance
            </h2>
            <p>
              By accessing or using {PRODUCT_NAME} ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These Terms form a legally binding agreement between you and the operators of {PRODUCT_NAME}.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              2. Description of Service
            </h2>
            <p>
              {PRODUCT_NAME} is an AI partnership platform that provides real-time, web-verified responses, voice interaction, image analysis, and personalised guidance across a wide range of topics — built on the principle of genuine mutual elevation between human and artificial intelligence. The Service is available under a free tier and paid subscription plans.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              3. Prohibited Activities
            </h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="space-y-2 list-none">
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
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-primary/50 font-mono text-xs mt-1 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              4. Intellectual Property
            </h2>
            <p className="mb-3">
              All elements of {PRODUCT_NAME} — including but not limited to the name, logo, design, interface, system prompts, knowledge curation, response style, voice scripts, and underlying technology — are the exclusive intellectual property of the operators of {PRODUCT_NAME} and are protected by applicable copyright, trademark, and trade secret law.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable licence to access and use the Service for personal, non-commercial purposes. No licence is granted to copy, reproduce, modify, distribute, or create derivative works of any part of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              5. Subscriptions and Billing
            </h2>
            <p className="mb-3">
              {PRODUCT_NAME} offers a free tier with limited daily usage, and paid subscription plans (Plus and Pro) with expanded capabilities. Paid plans are billed on a recurring monthly basis through our payment processor.
            </p>
            <p className="mb-3">
              By subscribing to a paid plan, you authorise us to charge your payment method on a recurring basis. Subscriptions auto-renew unless cancelled. You may cancel at any time; cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods.
            </p>
            <p>
              We reserve the right to change subscription pricing with reasonable advance notice. Continued use after a price change constitutes acceptance of the new pricing.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              6. Accuracy Disclaimer
            </h2>
            <p className="mb-3">
              {PRODUCT_NAME} uses real-time web search and advanced AI to provide accurate, source-verified responses. However, the Service is not a substitute for professional medical, legal, financial, psychological, or other licensed professional advice.
            </p>
            <p>
              While we make every effort to ensure accuracy, AI responses may occasionally contain errors. Always verify critical information with qualified professionals. The Service is provided "as is" and we make no warranties of accuracy, completeness, or fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, {PRODUCT_NAME} and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Service — including damages for loss of profits, data, goodwill, or other intangible losses — even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              8. Termination
            </h2>
            <p>
              We reserve the right to suspend or terminate your access to the Service at any time, with or without notice, for any violation of these Terms or for any other reason at our sole discretion. Upon termination, your licence to use the Service immediately ceases.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              9. Changes to These Terms
            </h2>
            <p>
              We may update these Terms at any time. Changes will be posted on this page with an updated effective date. Continued use of the Service after changes are posted constitutes your acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-3" style={{ fontFamily: "Space Mono, monospace" }}>
              10. Contact
            </h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 flex items-center gap-6" style={{ borderTop: "1px solid hsl(193 100% 52% / 0.1)" }}>
          <Link href="/privacy" className="text-xs font-mono text-muted-foreground/40 hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/" className="text-xs font-mono text-muted-foreground/40 hover:text-primary transition-colors">Back to Sirius</Link>
          <span className="text-xs font-mono text-muted-foreground/20 ml-auto">© {new Date().getFullYear()} {PRODUCT_NAME}</span>
        </div>

      </div>
    </div>
  );
}
