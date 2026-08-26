export const ANALYTICS_CONSENT_STORAGE_KEY = "yesulin:analytics-consent:v1";

export type AnalyticsConsent = "granted" | "denied";

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    return null;
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
  return Boolean(process.env.NEXT_PUBLIC_GTM_ID) && readAnalyticsConsent() === "granted";
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
