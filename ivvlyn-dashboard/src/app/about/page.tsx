import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "About Ivvlyn AI Agency Bhopal | Ivvlyn",
  description:
    "Learn the story behind Ivvlyn, an AI agency from Bhopal building human-like AI employees for high-converting lead response workflows.",
  path: "/about",
  keywords: ["Ivvlyn AI agency Bhopal"],
});

export default function AboutPage() {
  return <MarketingHtmlPage page="about" />;
}
