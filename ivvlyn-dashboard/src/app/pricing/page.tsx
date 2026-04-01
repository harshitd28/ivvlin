import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "AI Automation Pricing India | Ivvlyn",
  description:
    "Explore transparent AI automation pricing for India with custom WhatsApp bot pricing, ROI visibility, and plans that scale with lead volume.",
  path: "/pricing",
  keywords: ["AI automation pricing India", "WhatsApp bot pricing"],
});

export default function PricingPage() {
  return <MarketingHtmlPage page="pricing" />;
}
