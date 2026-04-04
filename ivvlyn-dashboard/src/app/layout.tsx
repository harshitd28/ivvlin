import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { siteUrl } from "@/lib/marketing/seo";

/** Same Inter weights + loading as static root HTML (Google Fonts CSS2). Avoids duplicating Inter via next/font. */
const interGoogleFontsHref =
  "https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500&display=swap";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ivvlyn",
    template: "%s | Ivvlyn",
  },
  description: "Ivvlyn marketing site and internal dashboard.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/ivvlyn-logo.png", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/assets/ivvlyn-logo.png" }],
  },
  keywords: ["AI automation", "WhatsApp automation", "Ivvlyn"],
  openGraph: {
    title: "Ivvlyn",
    description: "Ivvlyn marketing site and internal dashboard.",
    type: "website",
    images: ["/assets/ivvlyn-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ivvlyn",
    description: "Ivvlyn marketing site and internal dashboard.",
    images: ["/assets/ivvlyn-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const isProd = process.env.NODE_ENV === "production";
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={interGoogleFontsHref} rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {gaId && isProd ? (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
            <Script id="ga4-events" strategy="afterInteractive">
              {`document.addEventListener('click', function (e) {
  var target = e.target;
  if (!(target instanceof Element)) return;
  var demo = target.closest('a[href*="demo"], button[id*="demo"], #contact-scroll-form');
  if (demo && typeof window.gtag === 'function') {
    window.gtag('event', 'book_demo_clicked');
  }
});
if (location.pathname === '/pricing' && typeof window.gtag === 'function') {
  window.gtag('event', 'pricing_viewed');
}
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.closest('#demo-form-wrap') && typeof window.gtag === 'function') {
    window.gtag('event', 'contact_form_submitted');
  }
});`}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
