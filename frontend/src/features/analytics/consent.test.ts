import { afterEach, describe, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_STORAGE_KEY, readAnalyticsConsent, resetLegacyAnalyticsRefusal } from "./consent";

function stubStorage(initial: Record<string, string>) {
  const values = new Map(Object.entries(initial));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("이전 동의 배너의 거부 기록", () => {
  it("한 번만 지우고 안내가 필요하다고 알린다", () => {
    stubStorage({ [ANALYTICS_CONSENT_STORAGE_KEY]: "denied" });

    expect(resetLegacyAnalyticsRefusal()).toBe(true);
    expect(readAnalyticsConsent()).toBeNull();
  });

  it("되돌린 뒤 다시 거부하면 그 선택을 유지한다", () => {
    stubStorage({ [ANALYTICS_CONSENT_STORAGE_KEY]: "denied" });
    resetLegacyAnalyticsRefusal();
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "denied");

    expect(resetLegacyAnalyticsRefusal()).toBe(false);
    expect(readAnalyticsConsent()).toBe("denied");
  });

  it("거부 기록이 없으면 안내하지 않는다", () => {
    stubStorage({ [ANALYTICS_CONSENT_STORAGE_KEY]: "granted" });

    expect(resetLegacyAnalyticsRefusal()).toBe(false);
    expect(readAnalyticsConsent()).toBe("granted");
  });
});
