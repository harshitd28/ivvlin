import type { Metadata } from "next";
import Script from "next/script";
import MarketingHtmlPage from "@/components/marketing/MarketingHtmlPage";
import { createMarketingMetadata } from "@/lib/marketing/seo";

export const metadata: Metadata = createMarketingMetadata({
  title: "Ivvlin | AI Sales Automation for Real Estate India",
  description:
    "India's first AI sales employee for real estate. Vaani responds to every lead in 60 seconds — 24/7, no holidays. More site visits. More deals. Built by Ivvlin.",
  path: "/",
  keywords: [
    "AI automation agency India",
    "AI employees for business India",
    "WhatsApp automation India",
    "real estate lead automation India",
    "Vaani AI sales employee",
    "AI chatbot alternative real estate",
    "WhatsApp CRM real estate India",
    "real estate lead management AI",
    "AI startup India",
    "lead conversion automation",
  ],
  twitterDescription:
    "India's first AI sales employee for real estate. Vaani responds to every lead in 60 seconds — 24/7, no holidays.",
});

const homeJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Ivvlin",
      url: "https://ivvlin.com",
      logo: "https://ivvlin.com/assets/ivvlyn-logo.png",
      description:
        "Ivvlin builds AI employees for Indian businesses with WhatsApp-first lead automation and follow-up workflows.",
      foundingDate: "2024",
      founders: [
        {
          "@type": "Person",
          name: "Harshit Divekar",
          jobTitle: "Founder & CEO",
          url: "https://ivvlin.com/about",
        },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bhopal",
        addressRegion: "Madhya Pradesh",
        addressCountry: "IN",
      },
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "sales",
          email: "founder@ivvlin.com",
          availableLanguage: ["English", "Hindi"],
        },
      ],
      sameAs: ["https://www.linkedin.com/company/ivvlin"],
    },
    {
      "@type": "WebSite",
      name: "Ivvlin",
      url: "https://ivvlin.com",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://ivvlin.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "Vaani",
      applicationCategory: "BusinessApplication",
      operatingSystem: "WhatsApp, Instagram, Facebook, SMS, Email",
      description:
        "India's first AI sales employee for real estate. Vaani handles WhatsApp lead management, qualifies buyers, and books site visits automatically 24/7.",
      url: "https://ivvlin.com/agents",
      offers: {
        "@type": "Offer",
        price: "25000",
        priceCurrency: "INR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "25000",
          priceCurrency: "INR",
          unitText: "per month",
        },
      },
      provider: {
        "@type": "Organization",
        name: "Ivvlin",
        url: "https://ivvlin.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Vaani?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vaani is India's first AI sales employee built exclusively for real estate developers. It responds to every lead in under 60 seconds, qualifies buyers, and books site visits automatically — 24/7, with no holidays or breaks.",
          },
        },
        {
          "@type": "Question",
          name: "How is Vaani different from a chatbot?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vaani is not a chatbot. It reads and understands conversations like a human sales employee, responds in the buyer's language, handles objections, and follows up over 14 days. It works across WhatsApp, Instagram, Facebook, SMS, and email simultaneously.",
          },
        },
        {
          "@type": "Question",
          name: "How much does Vaani cost?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vaani starts at ₹25,000 per month for Indian real estate developers, with plans scaling based on lead volume. International pricing starts at $199/month.",
          },
        },
        {
          "@type": "Question",
          name: "Which platforms does Vaani work on?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vaani works on WhatsApp, Instagram, Facebook, SMS, and email — capturing and responding to leads from all major platforms where real estate inquiries come from.",
          },
        },
        {
          "@type": "Question",
          name: "How quickly does Vaani respond to leads?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Vaani responds to every new lead in under 60 seconds, 24 hours a day, 7 days a week, including weekends and public holidays.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <Script id="home-jsonld" type="application/ld+json" strategy="afterInteractive">
        {JSON.stringify(homeJsonLd)}
      </Script>
      <MarketingHtmlPage page="home" />
    </>
  );
}
