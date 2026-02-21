import type { Metadata } from "next";
import "./globals.css";
import Header from './components/Header';
import FloatingCTA from './components/FloatingCTA';
import { LiveStatusProvider } from './context/LiveStatusContext';

export const metadata: Metadata = {
  title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
  description: "SAT목표 점수, 저희가 만들어 드립니다",
  openGraph: {
    title: "SAT 목표 점수에 가장 빠르게",
    description: "SAT목표 점수, 저희가 만들어 드립니다",
    images: ["/og-image.png"],
  }
};

import { Outfit, Racing_Sans_One } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const racing = Racing_Sans_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-racing',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${racing.variable}`}>
      <body className="font-sans antialiased">
        {/* Force Global HMR Update - Content Refresh */}
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
                "description": "SAT목표 점수 달성, 저희와 만들어 드립니다",
                "address": {
                  "@type": "PostalAddress",
                  "streetAddress": "302, 21 Samgae-ro",
                  "addressLocality": "Mapo-gu, Seoul",
                  "addressCountry": "KR"
                },
                "telephone": "02-6956-0061",
                "email": "cs@argonautai.co.kr",
                "sameAs": [
                  // Add social links if available, otherwise keep empty or remove
                ]
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
