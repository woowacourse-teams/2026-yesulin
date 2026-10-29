"use client";

import { trackProductEvent } from "./product-analytics";
import type { ProductProperties } from "./posthog-contract";

export const REVIEW_IDLE_MS = 120_000;
/** 스크롤 없는 독서를 최대 2분 인정한다. 주의 집중을 직접 측정하는 값은 아니다. */
export function activeSlice(previous: number, now: number, lastActivity: number, visible: boolean) {
  return visible ? Math.max(0, Math.min(now, lastActivity + REVIEW_IDLE_MS) - previous) : 0;
}

let stopPrevious: (() => void) | undefined;

export function startReviewTimer(properties: ProductProperties) {
  stopPrevious?.();
  const viewId = crypto.randomUUID();
  void trackProductEvent("review_item_viewed", properties, `review:${viewId}`);
  let previous = Date.now();
  let lastActivity = previous;
  let active = 0;
  let visible = document.visibilityState === "visible" && document.hasFocus();
  let stopped = false;
  const sample = () => {
    const now = Date.now();
    active += activeSlice(previous, now, lastActivity, visible);
    previous = now;
  };
  const flush = () => {
    sample();
    if (active > 0) void trackProductEvent("review_active_time", { ...properties, active_ms: Math.round(active) });
    active = 0;
  };
  const interact = () => { sample(); lastActivity = Date.now(); };
  const visibility = () => {
    flush();
    visible = document.visibilityState === "visible" && document.hasFocus();
    if (visible) lastActivity = Date.now();
  };
  const activities = ["pointerdown", "keydown", "scroll", "touchstart"];
  activities.forEach(event => window.addEventListener(event, interact, { passive: true, capture: true }));
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("blur", visibility);
  window.addEventListener("focus", visibility);
  window.addEventListener("pagehide", flush);
  const timer = setInterval(flush, 15_000);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer); flush();
    activities.forEach(event => window.removeEventListener(event, interact, true));
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("blur", visibility);
    window.removeEventListener("focus", visibility);
    window.removeEventListener("pagehide", flush);
    if (stopPrevious === stop) stopPrevious = undefined;
  };
  stopPrevious = stop;
  return stop;
}
