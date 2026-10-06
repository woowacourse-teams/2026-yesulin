"use client";

import { useSyncExternalStore } from "react";
import {
  analyticsSettingsOpener,
  analyticsSettingsUnavailable,
  subscribeAnalyticsSettings,
} from "@/features/analytics/settings-entry";

/**
 * 방문 분석을 끄거나 다시 켜는 진입점.
 * 화면 머리말을 비우려고 하단 정책 링크와 처리방침 본문에만 둔다.
 * 개인정보 처리방침이 이 진입점을 거부 방법으로 안내하므로 화면에서 없애지 않는다.
 */
export function AnalyticsSettingsButton({ className = "" }: { readonly className?: string }) {
  const open = useSyncExternalStore(subscribeAnalyticsSettings, analyticsSettingsOpener, analyticsSettingsUnavailable);
  if (!open) return null;
  return <button
    type="button"
    onClick={open}
    className={`inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
  >
    분석 설정
  </button>;
}
