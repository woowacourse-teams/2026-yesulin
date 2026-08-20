import type { Metadata, Viewport } from "next";
import { AuthSessionProvider } from "@/components/auth/auth-session";
import "./globals.css";
import "./interactions.css";

export const metadata: Metadata = {
  title: {
    default: "예술in",
    template: "%s | 예술in",
  },
  description: "기획사/제작사와 배우를 연결하는 공연 지원 관리 서비스",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      </body>
    </html>
  );
}
