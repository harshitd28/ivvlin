import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Vaani AI Sales Agent | Ivvlin",
  description:
    "Meet Vaani — Ivvlin's AI sales employee for real estate. Handles WhatsApp, Instagram and portal leads 24/7. Qualifies buyers and books site visits automatically.",
  path: "/agents",
  keywords: [
    "AI real estate agent India",
    "WhatsApp lead automation",
    "real estate chatbot India",
  ],
});

export default function AgentsPage() {
  return <MarketingHtmlPage page="agents" />;
}
