import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "AI Real Estate Agent India | Ivvlyn",
  description:
    "Meet Vaani, the AI real estate agent for India handling WhatsApp lead automation, Instagram DMs, and instant multilingual follow-up.",
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
