import type { Metadata, Viewport } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AnalyticsConsentManager } from "@/components/analytics/analytics-consent-manager";
import { AuthSessionProvider } from "@/components/auth/auth-session";
import "./globals.css";
import "./interactions.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://yesulin.art"),
  title: {
    default: "예술in",
    template: "%s | 예술in",
  },
  description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "예술in",
    title: "예술in",
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
    title: "예술in",
    description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
    images: ["/images/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
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
