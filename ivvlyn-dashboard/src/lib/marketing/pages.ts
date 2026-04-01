import fs from "node:fs";
import path from "node:path";

export type MarketingPageKey = "home" | "agents" | "pricing" | "about" | "contact";

type LoadedPage = {
  bodyHtml: string;
  css: string;
  script: string;
};

const SOURCE_FILES: Record<MarketingPageKey, string> = {
  home: "index.html",
  agents: "vaani.html",
  pricing: "pricing.html",
  about: "about.html",
  contact: "contact.html",
};

function extractSection(html: string, tag: "body" | "style" | "script"): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  return match?.[1]?.trim() ?? "";
}

function rewriteLinks(bodyHtml: string): string {
  return bodyHtml
    .replaceAll('href="index.html#top"', 'href="/#top"')
    .replaceAll('href="index.html"', 'href="/"')
    .replaceAll('href="vaani.html"', 'href="/agents"')
    .replaceAll('href="agents.html"', 'href="/agents"')
    .replaceAll('href="pricing.html"', 'href="/pricing"')
    .replaceAll('href="about.html"', 'href="/about"')
    .replaceAll('href="contact.html#demo-form-wrap"', 'href="/contact#demo-form-wrap"')
    .replaceAll('href="contact.html"', 'href="/contact"')
    .replaceAll('href="services.html"', 'href="/#services"')
    .replaceAll('href="http://localhost:3001/login"', 'href="/login"');
}

function readSourceFile(filename: string): string {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/marketing/source", filename), "utf8");
}

let sharedCssCache = "";
function getSharedCss(): string {
  if (!sharedCssCache) {
    sharedCssCache = readSourceFile("shared.css");
  }
  return sharedCssCache;
}

const cache = new Map<MarketingPageKey, LoadedPage>();

export function loadMarketingPage(key: MarketingPageKey): LoadedPage {
  const cached = cache.get(key);
  if (cached) return cached;

  const sourceHtml = readSourceFile(SOURCE_FILES[key]);
  const bodyHtml = rewriteLinks(extractSection(sourceHtml, "body"));
  const pageCss = extractSection(sourceHtml, "style");
  const script = extractSection(sourceHtml, "script");
  const shouldIncludeShared = sourceHtml.includes('href="shared.css"');
  const css = `${shouldIncludeShared ? `${getSharedCss()}\n` : ""}${pageCss}`;

  const loaded = { bodyHtml, css, script };
  cache.set(key, loaded);
  return loaded;
}
