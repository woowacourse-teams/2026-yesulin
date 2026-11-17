// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import { AuditionAlertBanner } from "./audition-alert-banner";

vi.mock("@/features/analytics/events", () => ({ trackAnalyticsEvent: vi.fn() }));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));

function clickBanner(container: HTMLElement, eventType: "click" | "auxclick" = "click", button = 0) {
  const link = container.querySelector<HTMLAnchorElement>(".notebook-banner-slide a");
  if (!link) throw new Error("홈 배너 링크가 없습니다.");
  link.addEventListener(eventType, (event) => event.preventDefault(), { once: true });
  act(() => link.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, button })));
}

it("배너 전환은 기록하지 않고 오픈채팅 링크 클릭만 배너별로 기록한다", () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<AuditionAlertBanner initialEventBanners={[]} />));
    expect(trackProductEvent).not.toHaveBeenCalled();
    clickBanner(container);
    expect(trackProductEvent).toHaveBeenCalledExactlyOnceWith("home_banner_clicked", { banner_id: "audition-alert" });
    expect(trackAnalyticsEvent).toHaveBeenCalledExactlyOnceWith("kakao_openchat_click", { entry_point: "home_alert_banner" });
    clickBanner(container, "auxclick", 1);
    expect(trackProductEvent).toHaveBeenCalledTimes(2);
    expect(trackProductEvent).toHaveBeenLastCalledWith("home_banner_clicked", { banner_id: "audition-alert" });
    clickBanner(container, "auxclick", 2);
    expect(trackProductEvent).toHaveBeenCalledTimes(2);

    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="공연 제작팀 모집 배너 보기"]')?.click());
    expect(trackProductEvent).toHaveBeenCalledTimes(2);
    clickBanner(container);
    clickBanner(container);
    expect(trackProductEvent).toHaveBeenCalledTimes(4);
    expect(trackProductEvent).toHaveBeenLastCalledWith("home_banner_clicked", { banner_id: "producer-partnership" });
    expect(trackAnalyticsEvent).toHaveBeenCalledTimes(1);
  } finally {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
