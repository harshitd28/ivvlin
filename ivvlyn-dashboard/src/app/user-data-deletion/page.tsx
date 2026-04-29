import type { Metadata } from "next";
import LegalPageTemplate from "@/components/marketing/LegalPageTemplate";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "User Data Deletion | Ivvlin",
  description:
    "Request deletion of your Ivvlin account and associated personal data by following the process listed on this page.",
  path: "/user-data-deletion",
  keywords: ["delete user data ivvlin", "account deletion request"],
});

export default function UserDataDeletionPage() {
  return (
    <LegalPageTemplate
      title="User Data Deletion"
      updatedAt="April 29, 2026"
      intro="You can request deletion of your account and associated personal data from Ivvlin. We process valid deletion requests in a reasonable timeframe."
      sections={[
        {
          title: "How to Request Deletion",
          body: [
            "Send an email to founder@ivvlin.com using the subject line: Data Deletion Request.",
            "Include your registered email address, organization name (if applicable), and any identifiers that help us locate your account.",
          ],
        },
        {
          title: "Verification Process",
          body: [
            "For security, we may verify ownership of the account before processing the request.",
            "If verification is incomplete, we may ask for additional details to prevent unauthorized deletion.",
          ],
        },
        {
          title: "What Gets Deleted",
          body: [
            "Upon completion, we delete or anonymize personal data associated with your account, except information required by law, compliance, or legitimate security obligations.",
            "Backups may retain encrypted snapshots for a limited retention window before being automatically overwritten.",
          ],
        },
        {
          title: "Timeline",
          body: [
            "Most requests are completed within 7 to 30 days depending on complexity, legal constraints, and data dependencies.",
            "We will notify you by email when the request is completed or if partial retention is required by law.",
          ],
        },
      ]}
    />
  );
}
