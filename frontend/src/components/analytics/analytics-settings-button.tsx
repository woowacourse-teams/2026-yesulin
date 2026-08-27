"use client";

import { useSyncExternalStore } from "react";
import {
  analyticsSettingsOpener,
  analyticsSettingsUnavailable,
  subscribeAnalyticsSettings,
} from "@/features/analytics/settings-entry";

/**
 * 방문 분석 동의를 다시 고르는 진입점.
 * 화면 위에 떠 있으면 모바일에서 아래쪽 버튼을 가려, 각 화면 머리말에 작게 놓는다.
 * 개인정보 처리방침이 이 진입점을 철회 방법으로 안내하므로 화면에서 없애지 않는다.
 * 모바일은 공통 규칙으로 버튼 높이가 44px로 유지되므로, 누르는 범위는 그대로 두고
 * 눈에 보이는 알약만 작게 만든다.
 */
export function AnalyticsSettingsButton({ className = "" }: { readonly className?: string }) {
  const open = useSyncExternalStore(subscribeAnalyticsSettings, analyticsSettingsOpener, analyticsSettingsUnavailable);
  if (!open) return null;
  return <button
    type="button"
    onClick={open}
    className={`group inline-flex shrink-0 items-center justify-center px-1 focus-visible:outline-none ${className}`}
  >
    <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-card px-2 text-[11px] font-medium leading-none text-muted transition-colors group-hover:border-brand-line group-hover:text-brand group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-brand">분석 설정</span>
  </button>;
}
