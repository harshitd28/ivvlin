import Script from "next/script";
import { loadMarketingPage, type MarketingPageKey } from "@/lib/marketing/pages";

type Props = {
  page: MarketingPageKey;
};

export default function MarketingHtmlPage({ page }: Props) {
  const content = loadMarketingPage(page);

  return (
    <>
      {/* suppressHydrationWarning: browser may normalize legacy HTML/CSS vs SSR string */}
      <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: content.css }} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />
      {content.script ? (
        <Script id={`marketing-${page}-script`} strategy="afterInteractive">
          {content.script}
        </Script>
      ) : null}
    </>
  );
}
