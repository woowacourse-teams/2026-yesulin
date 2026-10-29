// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AnalyticsConsentManager } from "@/components/analytics/analytics-consent-manager";
import { ANALYTICS_CONSENT_STORAGE_KEY, ANALYTICS_READY_EVENT, ANALYTICS_SCRIPT_ID } from "@/features/analytics/consent";
import { ActorScreenView } from "./actor-screen-view";

vi.mock("next/navigation", () => ({ usePathname: () => "/actors" }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
  window.localStorage.clear();
  window.localStorage.setItem("yesulin:analytics-refusal-reset:v1", "done");
  document.getElementById(ANALYTICS_SCRIPT_ID)?.remove();
  window.dataLayer = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.getElementById(ANALYTICS_SCRIPT_ID)?.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function initializeAnalytics() {
  const script = document.createElement("script");
  script.id = ANALYTICS_SCRIPT_ID;
  document.head.append(script);
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
}

it("StrictMode와 분석 준비 신호가 반복돼도 한 번만 보내고 배우 이름·아이디·실제 주소는 보내지 않는다", async () => {
  window.history.replaceState(null, "", "/actors/@secret.actor?name=private");
  document.title = "비공개이름 | 예술in";

  await act(async () => root.render(<StrictMode><ActorScreenView screen="actor_page" /></StrictMode>));
  expect(window.dataLayer).toEqual([]);
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  expect(window.dataLayer).toEqual([]);

  initializeAnalytics();
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));

  expect(window.dataLayer).toEqual([{
    event: "actor_screen_view", screen_name: "actor_page", page_title: "배우 페이지",
    page_location: `${window.location.origin}/actors/profile`, page_referrer: "",
  }]);
});

it("분석을 껐으면 보내지 않고 다시 켰을 때 한 번 보낸다", async () => {
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "denied");
  await act(async () => root.render(<ActorScreenView screen="actor_list" />));
  expect(window.dataLayer).toEqual([]);

  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "granted");
  initializeAnalytics();
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));

  expect(window.dataLayer).toHaveLength(1);
  expect(window.dataLayer?.[0]).toMatchObject({ screen_name: "actor_list", page_title: "배우 목록" });
});

it("다른 배우로 이동하면 새 화면을 한 번 보내고 GTM 미설정 환경에서는 보내지 않는다", async () => {
  initializeAnalytics();
  await act(async () => root.render(<ActorScreenView key="first" screen="actor_page" />));
  await act(async () => root.render(<ActorScreenView key="second" screen="actor_page" />));
  expect(window.dataLayer).toHaveLength(2);

  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
  await act(async () => root.render(<ActorScreenView key="third" screen="actor_page" />));
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  expect(window.dataLayer).toHaveLength(2);
});

it("실제 초기화에서 동의 명령과 gtm.js 다음에 첫 화면 이벤트를 큐에 넣는다", async () => {
  let initialize: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { initialize = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  await act(async () => root.render(<><ActorScreenView screen="actor_list" /><AnalyticsConsentManager gtmId="GTM-TEST" /></>));
  expect(window.dataLayer).toEqual([]);
  expect(initialize).toBeDefined();

  await act(async () => initialize!(0));

  expect(window.dataLayer).toHaveLength(4);
  expect(Array.from(window.dataLayer![0] as IArguments)).toEqual(["consent", "default", {
    analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  }]);
  expect(Array.from(window.dataLayer![1] as IArguments)).toEqual(["consent", "update", {
    analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  }]);
  expect(window.dataLayer![2]).toMatchObject({ event: "gtm.js" });
  expect(window.dataLayer![3]).toMatchObject({ event: "actor_screen_view", screen_name: "actor_list" });
});

it("이미 초기화된 상태에서 분석을 다시 켜면 스크립트를 중복 삽입하지 않고 화면을 보낸다", async () => {
  initializeAnalytics();
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "denied");
  let initialize: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { initialize = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());

  await act(async () => root.render(<><ActorScreenView screen="actor_page" /><AnalyticsConsentManager gtmId="GTM-TEST" /></>));
  await act(async () => initialize!(0));
  expect(window.dataLayer).toEqual([]);

  await act(async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "granted");
    window.dispatchEvent(new StorageEvent("storage", { key: ANALYTICS_CONSENT_STORAGE_KEY, newValue: "granted" }));
  });

  expect(document.querySelectorAll(`#${ANALYTICS_SCRIPT_ID}`)).toHaveLength(1);
  expect(window.dataLayer).toHaveLength(2);
  expect(Array.from(window.dataLayer![0] as IArguments)[0]).toBe("consent");
  expect(window.dataLayer![1]).toMatchObject({ event: "actor_screen_view", screen_name: "actor_page" });
});
