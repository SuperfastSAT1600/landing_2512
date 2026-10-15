import type { Metadata } from "next";
import Script from 'next/script';
import "./globals.css";
import SiteShell from './components/SiteShell';
import { LiveStatusProvider } from './context/LiveStatusContext';

export const metadata: Metadata = {
  title: "SAT 목표 점수에 가장 빠르게 | SuperfastSAT",
  description: "SuperfastSAT은 Digital SAT 전문 온라인 학원입니다. 목표 점수 달성까지 최단 경로로 안내합니다.",
  // iOS Safari가 SSR HTML의 전화번호·날짜 등을 자동 링크로 감싸면서
  // React 하이드레이션 전에 DOM을 변형 → "attributes didn't match" 미스매치를 유발.
  // 자동 감지를 꺼서 원천 차단(관리자 화면에도 전화번호가 많아 오탐 방지 겸용).
  formatDetection: { telephone: false, date: false, address: false, email: false },
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

import { Racing_Sans_One, Black_Han_Sans } from 'next/font/google';

// Outfit removed — body uses Pretendard via --font-sans (globals.css), not Outfit
// BookkMyungjo loaded via @font-face in globals.css for director package section

const racing = Racing_Sans_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-racing',
  preload: false,
});

const blackHanSans = Black_Han_Sans({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-black-han',
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${racing.variable} ${blackHanSans.variable}`}>
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
        {/* PostHog */}
        <Script id="posthog-init" strategy="afterInteractive">{`
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+" (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys getNextSurveyStep onSessionId setPersonPropertiesForFlags".split(","),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}', {
            api_host: '${process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'}',
          });
        `}</Script>
          <LiveStatusProvider>
          <SiteShell>
          {/*
            조직 구조화 데이터는 여기(모든 페이지의 공통 틀)에 두지 않는다.
            여기 있으면 이차방정식 연습문제 페이지나 코치 소개 페이지에도 학원 평점이
            복사돼, 페이지 주제와 무관한 평점 마크업이 된다.
            이제 lib/organization-schema.ts 에서 만들고 홈과 /reviews 에서만 렌더링한다.
            블로그 글은 BlogPosting.publisher 로 이미 조직을 참조한다.
          */}
          {children}
          </SiteShell>
          </LiveStatusProvider>
      </body>
    </html>
  );
}
