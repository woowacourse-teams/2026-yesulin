import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsConsentManager } from "@/components/analytics/analytics-consent-manager";
import { AuthSessionProvider } from "@/components/auth/auth-session";
import { CommunityNavigationGuard } from "@/components/community/community-navigation-guard";
import { SITE_URL } from "@/config/site";
import { HOME_DESCRIPTION, HOME_TITLE, SHARE_IMAGE } from "@/features/seo/audition-metadata";
import "./globals.css";
import "./interactions.css";
import "./notebook.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: "%s | 예술in",
  },
  description: HOME_DESCRIPTION,
  // 주소는 페이지마다 다르므로 넣지 않는다. 넣으면 공유 정보를 따로 정하지 않은 페이지가 모두 홈 주소를 가리킨다.
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "예술in",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    images: [SHARE_IMAGE.url],
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
        <CommunityNavigationGuard />
        <AuthSessionProvider>{children}</AuthSessionProvider>
        <AnalyticsConsentManager gtmId={gtmId} />
        <SpeedInsights />
      </body>
    </html>
  );
}
