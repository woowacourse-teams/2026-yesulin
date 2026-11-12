// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

const auth = vi.hoisted(() => ({ push: vi.fn(), setSession: vi.fn(), toast: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: auth.push }) }));
vi.mock("./auth-session", () => ({ useAuthSession: () => auth, createFrontendCredential: () => "credential" }));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => auth.toast }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: { apiMockingEnabled: false, socialLoginEnabled: false } }));
vi.mock("@/features/analytics/events", () => ({
  loginAttributionFor: vi.fn(), trackLoginAttempt: vi.fn(), trackLoginPageView: vi.fn(), trackLoginSuccess: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it("회원 로그인은 소셜 로그인만 보이고 계정 유형을 고르지 않는다", async () => {
  await act(async () => root.render(<LoginForm />));

  const labels = [...container.querySelectorAll("button")].map((button) => button.textContent);
  expect(labels).toEqual(["카카오 로그인", "네이버 로그인", "Google로 로그인"]);
  expect(container.querySelector("#login-identifier")).toBeNull();
  expect(container.querySelector('input[type="radio"]')).toBeNull();
  expect(container.textContent).not.toContain("이용 목적");
});
