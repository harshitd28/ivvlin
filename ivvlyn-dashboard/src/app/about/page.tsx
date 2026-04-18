import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "About Ivvlin | AI Automation Agency India",
  description:
    "Ivvlin is an AI automation agency founded by Harshit Divekar, building India's first human-like AI sales employees for real estate developers.",
  path: "/about",
  keywords: ["Ivvlin AI agency Bhopal"],
});

export default function AboutPage() {
  return <MarketingHtmlPage page="about" />;
}
