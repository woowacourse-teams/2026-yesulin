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

  it("분석에 동의하지 않았으면 보내지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    const browser = stubBrowser("denied");

    const sent = trackReservationEvent("view_show", { session_count: 3 });

    expect(sent).toBe(false);
    expect(browser.dataLayer).toEqual([]);
  });
});
