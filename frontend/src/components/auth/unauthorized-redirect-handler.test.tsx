// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AUTH_UNAUTHORIZED_EVENT } from "@/features/auth/unauthorized";
import type { FrontendAuthSession } from "./auth-session";
import { UnauthorizedRedirectHandler } from "./unauthorized-redirect-handler";

const state = vi.hoisted(() => ({
  pathname: "/producers/audition-posts",
  replace: vi.fn(),
  setSession: vi.fn(),
  session: null as FrontendAuthSession | null,
}));
vi.mock("next/navigation", () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("./auth-session", () => ({ useAuthSession: () => ({ session: state.session, setSession: state.setSession }) }));

let root: Root;
let container: HTMLDivElement;

async function expire() {
  await act(async () => root.render(<UnauthorizedRedirectHandler />));
  await act(async () => { window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT)); });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  state.pathname = "/producers/audition-posts";
  state.session = null;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("기획사 세션이 끝나면 기획사 로그인으로 현재 주소와 함께 보낸다", async () => {
  state.session = { credential: "member-1", role: "PRODUCER", displayName: "공연사" };

  await expire();

  expect(state.setSession).toHaveBeenCalledWith(null);
  expect(state.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/producer-service\/login\?returnTo=/));
});

it("그 밖의 세션이 끝나면 일반 로그인으로 보낸다", async () => {
  state.session = { credential: "member-2", role: "APPLICANT", displayName: "회원" };

  await expire();

  expect(state.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?returnTo=/));
});

it.each(["/login", "/producer-service/login"])("로그인 화면(%s)에서는 다시 보내지 않는다", async (pathname) => {
  state.pathname = pathname;

  await expire();

  expect(state.setSession).toHaveBeenCalledWith(null);
  expect(state.replace).not.toHaveBeenCalled();
});
