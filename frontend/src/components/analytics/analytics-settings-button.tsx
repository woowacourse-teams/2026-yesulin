"use client";

import { useSyncExternalStore } from "react";
import {
  analyticsSettingsOpener,
  analyticsSettingsUnavailable,
  subscribeAnalyticsSettings,
} from "@/features/analytics/settings-entry";

/**
 * 방문 분석을 끄거나 다시 켜는 진입점.
 * 화면 머리말을 비우려고 하단 정책 링크와 기획사 사이드바 계정 영역에 둔다.
 * 개인정보 처리방침이 이 진입점을 거부 방법으로 안내하므로 화면에서 없애지 않는다.
 * 놓이는 배경마다 글자색이 달라 className을 주면 기본 모양을 통째로 바꾼다.
 */
const POLICY_LINK_STYLE = "inline-flex min-h-11 items-center font-medium text-muted-strong hover:text-brand hover:underline";

export function AnalyticsSettingsButton({ className = POLICY_LINK_STYLE }: { readonly className?: string }) {
  const open = useSyncExternalStore(subscribeAnalyticsSettings, analyticsSettingsOpener, analyticsSettingsUnavailable);
  if (!open) return null;
  return <button
    type="button"
    onClick={open}
    className={`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${className}`}
  >
    분석 설정
  </button>;
}
