import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "About Ivvlin AI Agency Bhopal | Ivvlin",
  description:
    "Learn the story behind Ivvlin, an AI agency from Bhopal building human-like AI employees for high-converting lead response workflows.",
  path: "/about",
  keywords: ["Ivvlin AI agency Bhopal"],
});

export default function AboutPage() {
  return <MarketingHtmlPage page="about" />;
}
