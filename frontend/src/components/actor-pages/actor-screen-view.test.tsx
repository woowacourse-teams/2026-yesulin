// @vitest-environment jsdom
import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_STORAGE_KEY, ANALYTICS_READY_EVENT } from "@/features/analytics/consent";
import { ActorScreenView } from "./actor-screen-view";

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "GTM-TEST");
  window.localStorage.clear();
  window.dataLayer = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("StrictMode와 분석 준비 신호가 반복돼도 한 번만 보내고 배우 이름·아이디·실제 주소는 보내지 않는다", async () => {
  window.history.replaceState(null, "", "/@secret.actor?name=private");
  document.title = "비공개이름 | 예술in";

  await act(async () => root.render(<StrictMode><ActorScreenView screen="actor_page" /></StrictMode>));
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
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));

  expect(window.dataLayer).toHaveLength(1);
  expect(window.dataLayer?.[0]).toMatchObject({ screen_name: "actor_list", page_title: "배우 목록" });
});

it("다른 배우로 이동하면 새 화면을 한 번 보내고 GTM 미설정 환경에서는 보내지 않는다", async () => {
  await act(async () => root.render(<ActorScreenView key="first" screen="actor_page" />));
  await act(async () => root.render(<ActorScreenView key="second" screen="actor_page" />));
  expect(window.dataLayer).toHaveLength(2);

  vi.stubEnv("NEXT_PUBLIC_GTM_ID", "");
  await act(async () => root.render(<ActorScreenView key="third" screen="actor_page" />));
  window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
  expect(window.dataLayer).toHaveLength(2);
});
