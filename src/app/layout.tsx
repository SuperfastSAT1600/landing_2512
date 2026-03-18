import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import Header from './components/Header';
import FloatingCTA from './components/FloatingCTA';
import { LiveStatusProvider } from './context/LiveStatusContext';

export const metadata: Metadata = {
  title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
  description: "SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. 목표 점수 달성까지 최단 경로로 안내합니다.",
  alternates: {
    canonical: "https://superfastsat.com",
  },
  openGraph: {
    type: "website",
    url: "https://superfastsat.com",
    siteName: "SuperfastSAT",
    title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
    description: "SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. 목표 점수 달성까지 최단 경로로 안내합니다.",
    images: [{ url: "/og-image.png", alt: "SuperfastSAT" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
    description: "SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. 목표 점수 달성까지 최단 경로로 안내합니다.",
    images: ["/og-image.png"],
  },
};

import { Racing_Sans_One } from 'next/font/google';

// Outfit removed — body uses Pretendard via --font-sans (globals.css), not Outfit

const racing = Racing_Sans_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-racing',
  preload: false, // only used in Hero — don't preload on every page
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={racing.variable}>
      <head>
        {/* REQ-006: preconnect to Pretendard CDN — eliminates DNS + TLS handshake delay */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      </head>
      <body className="font-sans antialiased">
        {/* Force Global HMR Update - Content Refresh */}
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1211644187821856');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img height="1" width="1" style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1211644187821856&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
        <LiveStatusProvider>
          <Header />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "EducationalOrganization",
                "name": "SuperfastSAT",
                "legalName": "Argonaut AI Inc.",
                "url": "https://superfastsat.com",
                "description": "SuperfastSAT은 Digital SAT 전문 온라인 학원으로, 목표 점수 달성까지 최단 경로로 안내합니다.",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "302, 21 Samgae-ro",
                  "addressLocality": "Mapo-gu, Seoul",
                  "addressCountry": "KR"
                },
                "telephone": "02-6956-0061",
                "email": "cs@argonautai.co.kr",
                "sameAs": [
                  "https://superfastsat.com",
                  "https://tutoring.superfastsat.com"
                ],
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": "4.9",
                  "reviewCount": "47",
                  "bestRating": "5",
                  "worstRating": "1"
                }
              })
            }}
          />
          {children}
          <FloatingCTA />
        </LiveStatusProvider>
      </body>
    </html>
  );
}
