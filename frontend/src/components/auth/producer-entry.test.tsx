// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { login } from "@/features/auth/session-api";
import { signupProducer } from "@/features/auth/api";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { ProducerAccessGate } from "@/components/producers/producer-access-gate";
import type { FrontendAuthSession } from "./auth-session";
import { openProducerWorkspace } from "@/features/auth/producer-navigation";

const auth = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), setSession: vi.fn(), refreshSession: vi.fn(), toast: vi.fn(),
  session: null as FrontendAuthSession | null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: auth.push, replace: auth.replace }),
  usePathname: () => "/producers/audition-posts",
}));
vi.mock("./auth-session", () => ({ useAuthSession: () => auth }));
vi.mock("@/features/auth/producer-navigation", () => ({ openProducerWorkspace: vi.fn() }));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => auth.toast }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: { apiMockingEnabled: false } }));
vi.mock("@/features/auth/session-api", async (original) => ({
  ...await original<typeof import("@/features/auth/session-api")>(), login: vi.fn(),
}));
vi.mock("@/features/auth/api", () => ({ signupProducer: vi.fn(), resendProducerVerificationEmail: vi.fn() }));
vi.mock("@/features/analytics/events", () => ({
  loginAttributionFor: vi.fn(), trackLoginAttempt: vi.fn(), trackLoginPageView: vi.fn(), trackLoginSuccess: vi.fn(),
}));

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  auth.session = null;
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(login).mockResolvedValue({ memberId: 10, role: "PRODUCER", status: "ACTIVE" });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

function typeInto(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`)!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("기획사 로그인 후 내 오디션 공고를 바로 연다", async () => {
  await act(async () => root.render(<LoginForm />));
  await act(async () => container.querySelector<HTMLInputElement>('input[value="producer"]')!.click());
  await act(async () => { typeInto("login-identifier", "producer@example.com"); typeInto("login-password", "password123"); });
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(login).toHaveBeenCalledWith("producer@example.com", "password123");
  expect(openProducerWorkspace).toHaveBeenCalled();
  expect(auth.push).not.toHaveBeenCalled();
  expect(auth.setSession).toHaveBeenCalledWith(expect.objectContaining({ role: "PRODUCER", producerStatus: "ACTIVE" }));
});

it("가입 직후에도 내 공고 경로로 이동하고 이메일 인증 대기 상태를 유지한다", async () => {
  vi.mocked(signupProducer).mockResolvedValue({ memberId: 10, email: "producer@example.com", companyName: "극단 예술", role: "PRODUCER", verificationStatus: "PENDING" });
  vi.mocked(login).mockResolvedValue({ memberId: 10, role: "PRODUCER", status: "PENDING" });
  await act(async () => root.render(<SignupForm />));
  await act(async () => {
    typeInto("signup-company", "극단 예술");
    typeInto("signup-phone", "01012345678");
    typeInto("signup-email", "producer@example.com");
    typeInto("signup-password", "password123");
    typeInto("signup-passwordConfirm", "password123");
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  });
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(signupProducer).toHaveBeenCalled();
  expect(openProducerWorkspace).toHaveBeenCalled();
  expect(auth.replace).not.toHaveBeenCalled();
  expect(auth.setSession).toHaveBeenCalledWith(expect.objectContaining({ producerStatus: "PENDING" }));

  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단 예술", producerStatus: "PENDING" };
  await act(async () => root.render(<ProducerAccessGate><p>연결된 공고 목록</p></ProducerAccessGate>));
  expect(container.textContent).toContain("이메일의 인증 링크");
  expect(container.textContent).not.toContain("연결된 공고 목록");
});

it("인증 대기 화면에서 페이지를 닫지 않고 인증 상태를 다시 확인한다", async () => {
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  auth.refreshSession.mockResolvedValue(undefined);
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  const check = [...container.querySelectorAll("button")].find((button) => button.textContent === "인증 상태 확인")!;
  await act(async () => check.click());
  expect(auth.refreshSession).toHaveBeenCalledOnce();
  expect(container.textContent).toContain("인증 상태를 확인했습니다");
});
