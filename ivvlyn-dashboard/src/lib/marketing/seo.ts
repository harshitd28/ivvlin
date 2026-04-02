import type { Metadata } from "next";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3001";

/** Absolute login URL for the unified app (same origin as marketing when deployed). */
export function getPublicLoginUrl(): string {
  return `${siteUrl.replace(/\/$/, "")}/login`;
}

const defaultOgImage = "/assets/ivvlyn-logo.png";

type MetaInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

export function createMarketingMetadata({ title, description, path, keywords = [] }: MetaInput): Metadata {
  const canonical = `${siteUrl}${path}`;
  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage],
    },
  };
}
