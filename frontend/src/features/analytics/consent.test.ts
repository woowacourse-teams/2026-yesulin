import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  canSendAnalytics,
  readAnalyticsConsent,
  resetLegacyAnalyticsRefusal,
  writeAnalyticsConsent,
} from "./consent";

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

function stubBrokenStorage({ read }: { readonly read: boolean }) {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        if (!read) throw new Error("저장소 읽기 실패");
        return values.get(key) ?? null;
      },
      setItem: () => {
        throw new Error("저장소 쓰기 실패");
      },
      removeItem: () => undefined,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
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

describe("저장소 오류", () => {
  it("저장소를 읽을 수 없으면 고른 적 없는 상태와 구분하고 분석을 보내지 않는다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    stubBrokenStorage({ read: false });

    expect(readAnalyticsConsent()).toBe("unavailable");
    expect(canSendAnalytics()).toBe(false);
  });

  it("거부를 저장하지 못해도 현재 페이지에서는 분석을 막는다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    stubBrokenStorage({ read: true });

    expect(writeAnalyticsConsent("denied")).toBe(false);
    expect(readAnalyticsConsent()).toBe("denied");
    expect(canSendAnalytics()).toBe(false);

    // 저장소가 돌아와 다시 켜면 페이지 안의 거부 상태도 풀린다.
    stubStorage({});
    expect(writeAnalyticsConsent("granted")).toBe(true);
    expect(canSendAnalytics()).toBe(true);
  });
});
