import Script from "next/script";
import { loadMarketingPage, type MarketingPageKey } from "@/lib/marketing/pages";

type Props = {
  page: MarketingPageKey;
};

export default function MarketingHtmlPage({ page }: Props) {
  const content = loadMarketingPage(page);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: content.css }} />
      <div dangerouslySetInnerHTML={{ __html: content.bodyHtml }} />
      {content.script ? (
        <Script id={`marketing-${page}-script`} strategy="afterInteractive">
          {content.script}
        </Script>
      ) : null}
    </>
  );
}
