// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchCurrentSession, logout, type SessionResponse } from "@/features/auth/session-api";
import { AuthSessionProvider, useAuthSession } from "./auth-session";

vi.mock("@/config/environment", () => ({ frontendEnvironment: { apiMockingEnabled: false } }));
vi.mock("@/features/auth/session-api", () => ({ fetchCurrentSession: vi.fn(), logout: vi.fn() }));

const pending: SessionResponse = { memberId: 10, role: "PRODUCER", status: "PENDING" };
let root: Root;
let container: HTMLDivElement;

function SessionProbe() {
  const auth = useAuthSession();
  return <>
    <output>{auth.sessionReady && (auth.session?.producerStatus ?? "anonymous")}</output>
    <button onClick={() => auth.setSession({ credential: "member-20", role: "PRODUCER", displayName: "극단", producerStatus: "ACTIVE" })}>login</button>
    <button onClick={() => void auth.logoutSession()}>logout</button>
    <button onClick={() => void auth.refreshSession()}>refresh</button>
    <button onClick={() => auth.completeProducerVerification({ ...pending, status: "ACTIVE" })}>verified</button>
  </>;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(fetchCurrentSession).mockResolvedValue(pending);
  vi.mocked(logout).mockResolvedValue(undefined);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderSession() {
  await act(async () => root.render(<AuthSessionProvider><SessionProbe /></AuthSessionProvider>));
}

function button(label: string) {
  return [...container.querySelectorAll("button")].find((element) => element.textContent === label)!;
}

it("다른 탭에서 인증한 뒤 돌아오면 ACTIVE로 갱신한다", async () => {
  // given
  await renderSession();
  expect(container.querySelector("output")?.textContent).toBe("PENDING");
  // when
  vi.mocked(fetchCurrentSession).mockResolvedValue({ ...pending, status: "ACTIVE" });
  await act(async () => window.dispatchEvent(new Event("focus")));
  // then
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE");
});

it("늦게 끝난 최초 조회가 새 로그인 결과를 덮어쓰지 않는다", async () => {
  let resolve!: (value: SessionResponse | null) => void;
  vi.mocked(fetchCurrentSession).mockReturnValue(new Promise((complete) => { resolve = complete; }));
  // given
  await renderSession();
  // when
  await act(async () => button("login").click());
  await act(async () => resolve(pending));
  // then
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE");
});

it("로그아웃 전에 시작한 조회 응답으로 로그인 상태를 되살리지 않는다", async () => {
  // given
  await renderSession();
  let resolve!: (value: SessionResponse | null) => void;
  vi.mocked(fetchCurrentSession).mockReturnValue(new Promise((complete) => { resolve = complete; }));
  // when
  await act(async () => button("refresh").click());
  await act(async () => button("logout").click());
  await act(async () => resolve(pending));
  // then
  expect(container.querySelector("output")?.textContent).toBe("anonymous");
});

it("복귀한 탭의 서버 세션이 만료됐으면 비로그인으로 갱신한다", async () => {
  // given
  await renderSession();
  // when
  vi.mocked(fetchCurrentSession).mockResolvedValue(null);
  await act(async () => window.dispatchEvent(new Event("focus")));
  // then
  expect(container.querySelector("output")?.textContent).toBe("anonymous");
});

it("과거 조회 실패가 최신 조회 완료 전에 준비 상태를 확정하지 않는다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  let rejectInitial!: (reason: Error) => void;
  let resolveLatest!: (value: SessionResponse | null) => void;
  vi.mocked(fetchCurrentSession)
    .mockReturnValueOnce(new Promise((_, reject) => { rejectInitial = reject; }))
    .mockReturnValueOnce(new Promise((resolve) => { resolveLatest = resolve; }));
  // given
  await renderSession();
  // when
  await act(async () => window.dispatchEvent(new Event("focus")));
  await act(async () => rejectInitial(new Error("offline")));
  // then
  expect(container.querySelector("output")?.textContent).toBe("");
  await act(async () => resolveLatest(pending));
  expect(container.querySelector("output")?.textContent).toBe("PENDING");
  vi.restoreAllMocks();
});

it("숨긴 탭에서는 불필요한 조회를 보내지 않는다", async () => {
  // given
  await renderSession();
  // when
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => document.dispatchEvent(new Event("visibilitychange")));
  // then
  expect(fetchCurrentSession).toHaveBeenCalledTimes(1);
  vi.restoreAllMocks();
});

it("코드 검증 응답을 추가 GET 없이 ACTIVE로 반영한다", async () => {
  // given
  await renderSession();
  vi.mocked(fetchCurrentSession).mockRejectedValue(new Error("offline"));
  // when
  await act(async () => button("verified").click());
  // then
  expect(container.querySelector("output")?.textContent).toBe("ACTIVE");
  expect(fetchCurrentSession).toHaveBeenCalledTimes(1);
});

it("로그아웃 뒤 늦은 코드 인증 응답이 계정을 되살리지 않는다", async () => {
  // given
  await renderSession();
  await act(async () => button("logout").click());
  // when
  await act(async () => button("verified").click());
  // then
  expect(container.querySelector("output")?.textContent).toBe("anonymous");
});
