import type { Metadata } from "next";
import "./globals.css";
import Header from './components/Header';
import FloatingCTA from './components/FloatingCTA';

export const metadata: Metadata = {
  title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
  description: "Elite SAT preparation with proven strategies and expert instructors. Boost your score and get into your dream college.",
  openGraph: {
    title: "SAT 목표 점수에 가장 빠르게",
    description: "Elite SAT preparation with proven strategies and expert instructors.",
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
        <Header />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              "name": "SAT Masterclass",
              "url": "https://www.satmasterclass.com",
              "description": "Elite SAT preparation with proven strategies and expert instructors.",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "US"
              },
              "sameAs": [
                "https://twitter.com/satmasterclass",
                "https://instagram.com/satmasterclass"
              ]
            })
          }}
        />
        {children}
        <FloatingCTA />
      </body>
    </html>
  );
}
