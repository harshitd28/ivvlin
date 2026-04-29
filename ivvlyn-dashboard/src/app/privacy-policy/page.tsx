import type { Metadata } from "next";
import LegalPageTemplate from "@/components/marketing/LegalPageTemplate";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Privacy Policy | Ivvlin",
  description:
    "Read Ivvlin's Privacy Policy to understand what information we collect, how we use it, and your rights over your data.",
  path: "/privacy-policy",
  keywords: ["privacy policy ivvlin", "data privacy"],
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPageTemplate
      title="Privacy Policy"
      updatedAt="April 29, 2026"
      intro="This Privacy Policy explains how Ivvlin collects, uses, and protects personal information when you use our website, products, and services."
      sections={[
        {
          title: "Information We Collect",
          body: [
            "We may collect contact details such as your name, email, phone number, and company information when you submit forms or communicate with us.",
            "We also collect usage data such as pages visited, browser details, and interaction events to improve product performance and user experience.",
          ],
        },
        {
          title: "How We Use Information",
          body: [
            "We use collected data to provide services, respond to requests, improve product quality, and communicate important updates.",
            "We may use limited analytics and operational logs for security, debugging, and platform reliability.",
          ],
        },
        {
          title: "Data Sharing",
          body: [
            "We do not sell personal data. We may share data with trusted infrastructure providers strictly for hosting, analytics, and communication delivery.",
            "Data may also be disclosed when required by applicable law or valid legal process.",
          ],
        },
        {
          title: "Data Retention and Security",
          body: [
            "We retain data only as long as required for legitimate business, legal, or contractual needs.",
            "We apply reasonable technical and organizational safeguards to protect data from unauthorized access, alteration, or misuse.",
          ],
        },
        {
          title: "Your Rights",
          body: [
            "You may request access, correction, or deletion of your personal information by contacting us at founder@ivvlin.com.",
            "For account and conversational data deletion requests, refer to the User Data Deletion page.",
          ],
        },
      ]}
    />
  );
}
