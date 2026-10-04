import type { Metadata } from "next";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";

/** 관리 링크(`/timetable/...`)와 배우 링크(`/t/...`)가 함께 쓰는 메타데이터와 레이아웃이다. */
export const timetableMetadata: Metadata = {
  title: {
    default: "오디션 일정표",
    template: "%s | 예술in 오디션 일정표",
  },
  description: "합격 배우의 오디션 시간을 정하고, 배우가 링크로 일정을 확인하고 직접 조정하는 예술in 오디션 일정표",
  // 관리 링크와 배우 링크는 주소 자체가 열쇠다. 검색에 노출하지 않고 외부로 나가는 요청에 주소를 싣지 않는다.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export function TimetableLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <MswProvider>
      <ToastProvider>{children}</ToastProvider>
    </MswProvider>
  );
}
