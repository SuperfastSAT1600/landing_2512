import type { Metadata } from "next";
import "./globals.css";
import Header from './components/Header';

export const metadata: Metadata = {
  title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
  description: "Elite SAT preparation with proven strategies and expert instructors. Boost your score and get into your dream college.",
  openGraph: {
    title: "SAT 목표 점수에 가장 빠르게",
    description: "Elite SAT preparation with proven strategies and expert instructors.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
      </body>
    </html>
  );
}
