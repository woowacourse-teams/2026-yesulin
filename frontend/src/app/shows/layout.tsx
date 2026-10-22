import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { socialMetadata } from "@/features/seo/audition-metadata";
import { showRoutes } from "@/features/shows/types";

const DESCRIPTION = "예술in이 여는 무료 뮤지컬·연극을 로그인 없이 예매하세요.";

export const metadata: Metadata = {
  title: {
    default: "무료 공연 예매",
    template: "%s | 예술in 무료 공연",
  },
  description: DESCRIPTION,
  ...socialMetadata({ title: "예술in 무료 공연 예매", description: DESCRIPTION, url: showRoutes.list }),
};

export default function ShowsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><div className="public-notebook"><a className="notebook-skip" href="#main">본문으로 바로가기</a>{children}</div></MswProvider>;
}
