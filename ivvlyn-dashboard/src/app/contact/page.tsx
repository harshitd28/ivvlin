import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Contact Ivvlin | Book a Demo",
  description:
    "Book a free demo of Vaani — Ivvlin's AI sales employee for real estate. See how it handles your leads, qualifies buyers, and books site visits in real time.",
  path: "/contact",
  keywords: ["book AI automation demo", "WhatsApp lead automation consultation"],
});

export default function ContactPage() {
  return <MarketingHtmlPage page="contact" />;
}
