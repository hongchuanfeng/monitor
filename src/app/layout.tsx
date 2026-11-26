import type { Metadata, Viewport } from "next";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileTabBar from "@/components/MobileTabBar";
import CookieBanner from "@/components/CookieBanner";
import { ConsentProvider } from "@/components/ConsentProvider";
import { siteConfig } from "@/data/site";
import { buildSearchIndex } from "@/lib/search-index";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — 监护仪与麻醉机通讯协议说明`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [
    "监护仪协议",
    "麻醉机协议",
    "Philips IntelliVue",
    "迈瑞 BeneVision",
    "Dräger",
    "GE CARESCAPE",
    "HL7",
    "RS-232",
    "医疗设备通讯协议",
    "C# 串口",
    "Java 串口",
  ],
  authors: [{ name: siteConfig.publisher }],
  creator: siteConfig.publisher,
  publisher: siteConfig.publisher,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} — 监护仪与麻醉机通讯协议说明`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — 监护仪与麻醉机通讯协议说明`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f62fe",
};

const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteConfig.url}/search/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <ConsentProvider>
          <a href="#main" className="skip-link">
            跳到主要内容
          </a>
          <Header docs={buildSearchIndex()} />
          <main id="main">{children}</main>
          <Footer />
          <MobileTabBar />
          <CookieBanner />
        </ConsentProvider>
        {adsenseClient ? (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        ) : null}
      </body>
    </html>
  );
}