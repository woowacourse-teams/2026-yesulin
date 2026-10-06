import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "./consent";
import { trackReservationEvent } from "./events";

function stubBrowser(consent: string | null) {
  const browser = {
    dataLayer: [] as unknown[],
    localStorage: { getItem: (key: string) => (key === ANALYTICS_CONSENT_STORAGE_KEY ? consent : null) },
  };
  vi.stubGlobal("window", browser);
  return browser;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("reservation analytics events", () => {
  it("예매 매개변수를 비운 뒤 이번 이벤트 값만 채워 보낸다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    const browser = stubBrowser("granted");

    const sent = trackReservationEvent("reservation_submit_success", { ticket_count: 2 });

    expect(sent).toBe(true);
    expect(browser.dataLayer).toEqual([{
      event: "reservation_submit_success",
      session_count: undefined,
      ticket_count: 2,
      error_code: undefined,
    }]);
  });

  it("분석 설정을 고른 적 없으면 기본으로 보낸다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    const browser = stubBrowser(null);

    const sent = trackReservationEvent("reservation_start", {});

    expect(sent).toBe(true);
    expect(browser.dataLayer).toHaveLength(1);
  });

  it("분석을 껐으면 보내지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    const browser = stubBrowser("denied");

    const sent = trackReservationEvent("view_show", { session_count: 3 });

    expect(sent).toBe(false);
    expect(browser.dataLayer).toEqual([]);
  });

  it("저장소를 읽을 수 없으면 기본값대로 보낸다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    const browser = { dataLayer: [] as unknown[], localStorage: { getItem: () => { throw new Error("저장소 읽기 실패"); } } };
    vi.stubGlobal("window", browser);

    expect(trackReservationEvent("reservation_start", {})).toBe(true);
    expect(browser.dataLayer).toHaveLength(1);
  });
});
