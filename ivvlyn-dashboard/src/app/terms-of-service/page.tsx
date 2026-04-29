import type { Metadata } from "next";
import LegalPageTemplate from "@/components/marketing/LegalPageTemplate";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Terms of Service | Ivvlin",
  description: "Read Ivvlin's Terms of Service governing the use of our website and automation platform.",
  path: "/terms-of-service",
  keywords: ["terms of service ivvlin", "user agreement"],
});

export default function TermsOfServicePage() {
  return (
    <LegalPageTemplate
      title="Terms of Service"
      updatedAt="April 29, 2026"
      intro="By accessing or using Ivvlin's website and services, you agree to these Terms of Service. If you do not agree, please discontinue use."
      sections={[
        {
          title: "Use of Services",
          body: [
            "You agree to use our services only for lawful business purposes and in compliance with applicable regulations.",
            "You are responsible for the accuracy of information you provide and for safeguarding your account credentials.",
          ],
        },
        {
          title: "Acceptable Conduct",
          body: [
            "You must not use the platform to send unlawful, abusive, fraudulent, or misleading communications.",
            "You must not attempt to bypass security controls, reverse engineer restricted components, or disrupt service availability.",
          ],
        },
        {
          title: "Intellectual Property",
          body: [
            "All platform software, branding, and documentation remain the property of Ivvlin or its licensors.",
            "Except where explicitly allowed in writing, you may not copy, distribute, or commercially exploit protected materials.",
          ],
        },
        {
          title: "Service Availability and Changes",
          body: [
            "We may update, modify, or discontinue features to improve reliability and product quality.",
            "While we aim for high uptime, uninterrupted service cannot be guaranteed in all circumstances.",
          ],
        },
        {
          title: "Liability and Contact",
          body: [
            "To the maximum extent permitted by law, Ivvlin is not liable for indirect, incidental, or consequential losses arising from service use.",
            "For legal questions related to these terms, contact founder@ivvlin.com.",
          ],
        },
      ]}
    />
  );
}
