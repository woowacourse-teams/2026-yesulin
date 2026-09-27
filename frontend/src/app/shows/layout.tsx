import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";

const DESCRIPTION = "예술in이 여는 무료 뮤지컬·연극을 로그인 없이 예매하세요.";

export const metadata: Metadata = {
  title: {
    default: "무료 공연 예매",
    template: "%s | 예술in 무료 공연",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "예술in",
    title: "예술in 무료 공연 예매",
    description: DESCRIPTION,
  },
};

export default function ShowsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider>{children}</MswProvider>;
}
