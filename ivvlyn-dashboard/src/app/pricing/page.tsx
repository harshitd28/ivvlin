import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Pricing | Vaani AI Sales Agent — Ivvlin",
  description:
    "Vaani starts at ₹25,000/month for real estate developers in India. No setup fees. Unlimited follow-ups. See full pricing and plans.",
  path: "/pricing",
  keywords: ["AI automation pricing India", "WhatsApp bot pricing"],
});

export default function PricingPage() {
  return <MarketingHtmlPage page="pricing" />;
}
