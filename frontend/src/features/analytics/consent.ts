export const ANALYTICS_CONSENT_STORAGE_KEY = "yesulin:analytics-consent:v1";
const LEGACY_REFUSAL_RESET_STORAGE_KEY = "yesulin:analytics-refusal-reset:v1";

/**
 * GTM을 불러올 때 window에 보내는 이벤트다. 분석을 다시 켜도 페이지를 다시 불러오지 않으므로,
 * 꺼져 있어 보내지 못한 화면 조회 이벤트는 이 신호를 받아 한 번 더 시도한다.
 */
export const ANALYTICS_READY_EVENT = "yesulin:analytics-ready";

export type AnalyticsConsent = "granted" | "denied";

/** 방문 분석은 기본으로 켜져 있고, 이용자가 분석 설정에서 끈 경우에만 보내지 않는다. */
export function isAnalyticsEnabled(consent: AnalyticsConsent | null) {
  return consent !== "denied";
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * 처리방침 1.1부터 방문 분석은 기본 수집이다. 1.0 동의 배너에서 거부한 기록은 브라우저마다 한 번만 지워
 * 기본값으로 되돌리고, 바뀐 사실을 안내해 바로 다시 끌 수 있게 한다. 이 처리 뒤의 거부는 그대로 존중한다.
 * 안내가 필요하면 true를 돌려준다.
 */
export function resetLegacyAnalyticsRefusal() {
  try {
    const storage = window.localStorage;
    if (storage.getItem(LEGACY_REFUSAL_RESET_STORAGE_KEY)) return false;
    storage.setItem(LEGACY_REFUSAL_RESET_STORAGE_KEY, "done");
    if (storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) !== "denied") return false;
    storage.removeItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function writeAnalyticsConsent(consent: AnalyticsConsent) {
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // 저장소를 사용할 수 없어도 현재 페이지의 선택은 유지한다.
  }
}

export function canSendAnalytics() {
  return Boolean(process.env.NEXT_PUBLIC_GTM_ID) && isAnalyticsEnabled(readAnalyticsConsent());
}

export function clearGoogleAnalyticsCookies() {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name) && (/^_ga/.test(name) || name === "_gid" || name === "_gat"));
  const hostname = window.location.hostname;
  const hostnameParts = hostname.split(".");
  const parentDomains = hostnameParts
    .slice(0, -1)
    .map((_, index) => `.${hostnameParts.slice(index).join(".")}`);
  const domains = [undefined, hostname, ...parentDomains];

  names.forEach((name) => {
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    });
  });
}
