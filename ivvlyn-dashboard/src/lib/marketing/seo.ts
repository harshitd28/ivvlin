import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3001";

/** Absolute login URL for the unified app (same origin as marketing when deployed). */
export function getPublicLoginUrl(): string {
  return `${siteUrl.replace(/\/$/, "")}/login`;
}

// TODO: Replace public/assets/og-image.jpg with a proper branded 1200×630 OG image (design).
export const marketingOgImageUrl = "https://ivvlin.com/assets/og-image.jpg";

type MetaInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** When set, used for twitter:description (e.g. shorter than Open Graph). */
  twitterDescription?: string;
};

const marketingRobots: Metadata["robots"] = {
  index: true,
  follow: true,
  "max-snippet": -1,
  "max-image-preview": "large",
  "max-video-preview": -1,
};

export function createMarketingMetadata({
  title,
  description,
  path,
  keywords = [],
  twitterDescription,
}: MetaInput): Metadata {
  const canonical = `${siteUrl.replace(/\/$/, "")}${path === "/" ? "/" : path}`;
  const twDesc = twitterDescription ?? description;
  const ogImage = {
    url: marketingOgImageUrl,
    width: 1200,
    height: 630,
  };
  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: marketingRobots,
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: twDesc,
      images: [marketingOgImageUrl],
    },
  };
}
