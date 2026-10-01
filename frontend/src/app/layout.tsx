import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsConsentManager } from "@/components/analytics/analytics-consent-manager";
import { AuthSessionProvider } from "@/components/auth/auth-session";
import { SITE_URL } from "@/config/site";
import "./globals.css";
import "./interactions.css";

const HOME_TITLE = "예술in | 뮤지컬·연극 오디션 지원 및 심사 관리";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | 예술in",
  },
  description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "예술in",
    title: HOME_TITLE,
    description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
    images: [{
      url: "/images/og-image.png",
      width: 1536,
      height: 1024,
      alt: "공연 예술 오디션 지원을 더 간편하게, 예술in",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
    images: ["/images/og-image.png"],
  },
};

/**
 * iOS는 viewport-fit=cover가 있어야 env(safe-area-inset-*)를 실제 값으로 계산한다. 없으면 0이라
 * 하단 고정 바가 홈 인디케이터에 붙는다. 대신 가로 모드에서는 노치 쪽까지 그려지므로 본문과 고정 바가 좌우 안전 영역을 띄운다.
 */
export const viewport: Viewport = {
  themeColor: "#ffffff",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <AnalyticsConsentManager gtmId={gtmId} />
        <SpeedInsights />
      </body>
    </html>
  );
}
