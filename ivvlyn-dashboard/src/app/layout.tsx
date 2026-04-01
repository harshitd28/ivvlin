import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { siteUrl } from "@/lib/marketing/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ivvlyn",
    template: "%s | Ivvlyn",
  },
  description: "Ivvlyn marketing site and internal dashboard.",
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
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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
