import type { Metadata } from "next";
import Script from "next/script";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "AI Automation Agency India | Ivvlyn",
  description:
    "Ivvlyn builds AI employees for Indian businesses with WhatsApp-first lead automation, 24/7 follow-up, and conversion-focused workflows.",
  path: "/",
  keywords: [
    "AI automation agency India",
    "AI employees for business India",
    "WhatsApp automation India",
  ],
});

export default function Home() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Ivvlyn",
        url: "https://ivvlyn.com",
        logo: "https://ivvlyn.com/logo.png",
        description:
          "Ivvlyn builds AI employees for Indian businesses with WhatsApp-first lead automation and follow-up workflows.",
        foundingDate: "2024",
        founders: [{ "@type": "Person", name: "Harshit" }],
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "founder@ivvlin.com",
          },
        ],
      },
      {
        "@type": "WebSite",
        name: "Ivvlyn",
        url: "https://ivvlyn.com",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://ivvlyn.com/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Service",
        name: "Vaani AI Real Estate Agent",
        provider: { "@type": "Organization", name: "Ivvlyn" },
        areaServed: "IN",
        description:
          "Vaani is an AI real estate agent for instant lead response, qualification, and booking workflows.",
      },
    ],
  };

  return (
    <>
      <Script id="home-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(schema)}
      </Script>
      <MarketingHtmlPage page="home" />
    </>
  );
}
