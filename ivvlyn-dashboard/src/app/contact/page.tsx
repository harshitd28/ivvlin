import type { Metadata } from "next";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Book a Demo | Ivvlyn",
  description:
    "Book a free 20-minute demo with Ivvlyn. No pitch, just a practical conversation about fixing your lead response workflow.",
  path: "/contact",
  keywords: ["book AI automation demo", "WhatsApp lead automation consultation"],
});

export default function ContactPage() {
  return <MarketingHtmlPage page="contact" />;
}
