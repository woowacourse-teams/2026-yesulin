"use client";

import type { ApplicationStepKey } from "@/features/applications/application-form";
import { canSendAnalytics } from "./consent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type LoginEntryPoint =
  | "direct"
  | "landing_header"
  | "landing_hero"
  | "landing_bottom_cta"
  | "producer_landing_header"
  | "producer_landing_hero"
  | "public_posting_header"
  | "photo_library_prompt"
  | "application_submit_gate";

export type LoginReason = "account_access" | "application_start" | "photo_library" | "application_submit" | "manage_production";
export type ActorType = "applicant" | "producer" | "unknown";
export type LoginProvider = "kakao" | "naver" | "google" | "password" | "unknown";
export type LoginReturnTarget =
  | "application_basic"
  | "application_additional"
  | "application_media"
  | "application_questions"
  | "application_review"
  | "applicant_home"
  | "applicant_submissions"
  | "applicant_profile"
  | "producer_home"
  | "other";

/** 예매 실패 사유다. 서버 오류 메시지 원문 대신 이 값만 보낸다. */
export type ReservationAnalyticsErrorCode =
  | "not_enough_seats"
  | "booking_closed"
  | "show_not_open"
  | "duplicate"
  | "session_changed"
  | "invalid_input"
  | "server_error"
  | "network_error"
  | "unknown";

export type LoginAttribution = {
  readonly entry_point: LoginEntryPoint;
  readonly login_reason: LoginReason;
  readonly actor_type: ActorType;
  readonly return_target: LoginReturnTarget;
};

type AnalyticsEventParameters = {
  view_posting: { posting_status: string; role_count: number };
  login_prompt_view: { login_reason: LoginReason; has_draft?: boolean };
  login_prompt_action: { login_reason: LoginReason; action: "login" | "continue_guest" | "close"; has_draft?: boolean };
  login_entry_click: LoginAttribution;
  login_page_view: LoginAttribution;
  login_attempt: LoginAttribution & { provider: LoginProvider };
  login_success: LoginAttribution & { provider: LoginProvider };
  login_return_success: LoginAttribution & { provider: LoginProvider };
  application_start: { start_mode: "authenticated" | "guest" | "resume"; selected_role_count: number; has_draft: boolean };
  application_step_complete: { step_name: ApplicationStepKey; step_number: number; step_count: number };
  application_review_view: { is_authenticated: boolean; issue_count: number };
  application_submit_success: { selected_role_count: number; save_to_profile: boolean; profile_saved: boolean };
  application_submit_error: { error_code: "simulated_error" | "auth_expired" | "client_error" | "server_error" | "network_error" | "unknown" };
  view_show: { session_count: number };
  reservation_start: Record<string, never>;
  reservation_submit_success: { ticket_count: number };
  reservation_submit_error: { error_code: ReservationAnalyticsErrorCode };
};

type ReservationEventName = "view_show" | "reservation_start" | "reservation_submit_success" | "reservation_submit_error";

/**
 * GTM 데이터 영역 변수는 이전 push의 값을 기억해 다음 이벤트 태그에도 붙인다.
 * 예매 이벤트는 보낼 때마다 예매 매개변수를 먼저 비워 회차 수·매수·오류 코드가 다른 이벤트에 섞이지 않게 한다.
 */
const RESERVATION_PARAMETER_KEYS = ["session_count", "ticket_count", "error_code"] as const;

const LOGIN_ATTRIBUTION_KEY = "yesulin:analytics:login-attribution";
const LOGIN_RETURN_PENDING_KEY = "yesulin:analytics:login-return-pending";

type StoredLoginAttribution = LoginAttribution & { readonly provider?: LoginProvider };

export function trackAnalyticsEvent<Name extends keyof AnalyticsEventParameters>(
  event: Name,
  parameters: AnalyticsEventParameters[Name],
) {
  if (!canSendAnalytics()) return;
  const definedParameters = Object.fromEntries(
    Object.entries(parameters).filter(([, value]) => value !== undefined),
  );
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...definedParameters });
}

export function trackReservationEvent<Name extends ReservationEventName>(
  event: Name,
  parameters: AnalyticsEventParameters[Name],
) {
  if (!canSendAnalytics()) return;
  const cleared = Object.fromEntries(RESERVATION_PARAMETER_KEYS.map((key) => [key, undefined]));
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...cleared, ...parameters });
}

export function trackLoginEntry(attribution: LoginAttribution) {
  if (!canSendAnalytics()) return;
  writeSessionValue(LOGIN_ATTRIBUTION_KEY, attribution);
  trackAnalyticsEvent("login_entry_click", attribution);
}

export function loginAttributionFor(returnTo?: string, actorType: ActorType = "unknown"): LoginAttribution {
  const returnTarget = loginReturnTarget(returnTo);
  const loginReason: LoginReason = returnTarget === "application_media"
    ? "photo_library"
    : returnTarget.startsWith("application_")
      ? returnTarget === "application_review" ? "application_submit" : "application_start"
      : actorType === "producer" ? "manage_production" : "account_access";
  return {
    entry_point: "direct",
    login_reason: loginReason,
    actor_type: actorType,
    return_target: returnTarget,
  };
}

export function currentLoginAttribution(fallback: LoginAttribution) {
  return readSessionValue<StoredLoginAttribution>(LOGIN_ATTRIBUTION_KEY) ?? fallback;
}

export function trackLoginPageView(fallback: LoginAttribution) {
  trackAnalyticsEvent("login_page_view", currentLoginAttribution(fallback));
}

export function trackLoginAttempt(provider: LoginProvider, fallback: LoginAttribution) {
  const stored = currentLoginAttribution(fallback);
  const attribution = { ...fallback, entry_point: stored.entry_point };
  writeSessionValue(LOGIN_ATTRIBUTION_KEY, { ...attribution, provider });
  trackAnalyticsEvent("login_attempt", { ...attribution, provider });
}

export function trackLoginSuccess(returnTo?: string, fallback?: LoginAttribution) {
  const stored = readSessionValue<StoredLoginAttribution>(LOGIN_ATTRIBUTION_KEY);
  const attribution = stored ?? fallback ?? loginAttributionFor(returnTo);
  const provider = stored?.provider ?? "unknown";
  const completed = { ...attribution, return_target: loginReturnTarget(returnTo), provider };
  trackAnalyticsEvent("login_success", completed);
  if (canSendAnalytics()) writeSessionValue(LOGIN_RETURN_PENDING_KEY, completed);
}

export function trackLoginReturnIfPending(pathname: string) {
  if (pathname === "/login" || pathname === "/social-login/complete") return;
  const pending = readSessionValue<LoginAttribution & { readonly provider: LoginProvider }>(LOGIN_RETURN_PENDING_KEY);
  if (!pending) return;
  trackAnalyticsEvent("login_return_success", { ...pending, return_target: loginReturnTarget(pathname) });
  removeSessionValue(LOGIN_RETURN_PENDING_KEY);
  removeSessionValue(LOGIN_ATTRIBUTION_KEY);
}

export function clearLoginAnalyticsState() {
  removeSessionValue(LOGIN_RETURN_PENDING_KEY);
  removeSessionValue(LOGIN_ATTRIBUTION_KEY);
}

export function loginReturnTarget(value?: string): LoginReturnTarget {
  if (!value) return "other";
  try {
    const url = new URL(value, "https://yesulin.local");
    const applicationMatch = /^\/apply\/[^/]+\/write\/(basic|additional|media|questions|review)$/.exec(url.pathname);
    if (applicationMatch?.[1]) return `application_${applicationMatch[1]}` as LoginReturnTarget;
    if (url.pathname === "/applicants") return "applicant_home";
    if (url.pathname.startsWith("/applicants/submissions")) return "applicant_submissions";
    if (url.pathname === "/applicants/profile") return "applicant_profile";
    if (url.pathname.startsWith("/producers")) return "producer_home";
    return "other";
  } catch {
    return "other";
  }
}

function readSessionValue<Value>(key: string): Value | null {
  if (typeof window === "undefined" || !canSendAnalytics()) return null;
  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) as Value : null;
  } catch {
    return null;
  }
}

function writeSessionValue(key: string, value: object) {
  if (typeof window === "undefined" || !canSendAnalytics()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 분석 저장소를 사용할 수 없으면 현재 이벤트만 전송한다.
  }
}

function removeSessionValue(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // 저장소 접근 실패는 로그인 흐름에 영향을 주지 않는다.
  }
}
