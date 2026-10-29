import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  canSendAnalytics,
  readAnalyticsConsent,
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

describe("기본 수집과 기존 선택 유지", () => {
  it("이전 버전의 거부 기록도 여러 번 읽어도 유지한다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    stubStorage({ [ANALYTICS_CONSENT_STORAGE_KEY]: "denied" });
    expect(readAnalyticsConsent()).toBe("denied");
    expect(canSendAnalytics()).toBe(false);
    expect(readAnalyticsConsent()).toBe("denied");
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("denied");
  });

  it("선택한 적 없는 방문자는 기본으로 수집한다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    stubStorage({});
    expect(readAnalyticsConsent()).toBeNull();
    expect(canSendAnalytics()).toBe(true);
  });

  it("직접 켠 선택을 유지한다", () => {
    stubStorage({ [ANALYTICS_CONSENT_STORAGE_KEY]: "granted" });
    expect(readAnalyticsConsent()).toBe("granted");
  });
});

describe("저장소 오류", () => {
  it("저장소를 읽을 수 없으면 고른 적 없는 상태로 보고 기본값대로 보낸다", () => {
    vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
    stubBrokenStorage({ read: false });

    expect(readAnalyticsConsent()).toBeNull();
    expect(canSendAnalytics()).toBe(true);
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
