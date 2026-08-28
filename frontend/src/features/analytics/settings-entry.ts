"use client";

/**
 * 방문 분석 설정 창을 여는 함수를 화면 어디서나 부를 수 있게 모아 둔다.
 * 설정 창은 앱 최상단의 동의 관리자가 들고 있고, 버튼은 각 화면 머리말에 놓이기 때문이다.
 * 열 수 없는 상태(분석 도구 미설정, 아직 첫 선택 전)에서는 등록을 비워 버튼도 나타나지 않는다.
 */
type OpenSettings = () => void;

let opener: OpenSettings | null = null;
const listeners = new Set<() => void>();

export function setAnalyticsSettingsOpener(next: OpenSettings | null) {
  if (opener === next) return;
  opener = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAnalyticsSettings(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function analyticsSettingsOpener() {
  return opener;
}

/** 서버 렌더에서는 열 수 없는 상태로 본다. */
export function analyticsSettingsUnavailable(): OpenSettings | null {
  return null;
}
