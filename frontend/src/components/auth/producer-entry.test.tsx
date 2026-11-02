// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { login } from "@/features/auth/session-api";
import { signupProducer, verifyProducerEmailCode } from "@/features/auth/api";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { ProducerAccessGate } from "@/components/producers/producer-access-gate";
import type { FrontendAuthSession } from "./auth-session";
import { openProducerWorkspace } from "@/features/auth/producer-navigation";

const auth = vi.hoisted(() => ({
  push: vi.fn(), replace: vi.fn(), setSession: vi.fn(), refreshSession: vi.fn(), completeProducerVerification: vi.fn(), toast: vi.fn(),
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
vi.mock("@/features/auth/api", () => ({ signupProducer: vi.fn(), resendProducerVerificationEmail: vi.fn(), verifyProducerEmailCode: vi.fn() }));
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
  expect(container.textContent).toContain("인증번호 6자리");
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

it("6자리 인증번호의 선행 0을 보존해 검증하고 세션을 갱신한다", async () => {
  // given
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  auth.refreshSession.mockResolvedValue(undefined);
  vi.mocked(verifyProducerEmailCode).mockResolvedValue({ memberId: 10, role: "PRODUCER", status: "ACTIVE" });
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  expect(container.querySelector("#producer-verification-code")).not.toBeNull();
  // when
  await act(async () => typeInto("producer-verification-code", "000123"));
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  // then
  expect(verifyProducerEmailCode).toHaveBeenCalledWith("000123");
  expect(auth.completeProducerVerification).toHaveBeenCalledWith({ memberId: 10, role: "PRODUCER", status: "ACTIVE" });
  expect(auth.refreshSession).not.toHaveBeenCalled();
});

it("인증번호가 6자리가 아니면 서버 요청 없이 입력 오류를 안내한다", async () => {
  // given
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  expect(container.querySelector("#producer-verification-code")).not.toBeNull();
  // when
  await act(async () => typeInto("producer-verification-code", "123"));
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  // then
  expect(verifyProducerEmailCode).not.toHaveBeenCalled();
  expect(container.textContent).toContain("숫자 6자리");
});

it("여섯 칸에 공백이 포함된 인증번호를 한 번에 붙여넣어 인증한다", async () => {
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  vi.mocked(verifyProducerEmailCode).mockResolvedValue({ memberId: 10, role: "PRODUCER", status: "ACTIVE" });
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  const input = container.querySelector<HTMLInputElement>("#producer-verification-code")!;
  const paste = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(paste, "clipboardData", { value: { getData: () => "000 123" } });

  await act(async () => input.dispatchEvent(paste));
  expect(input.value).toBe("000123");
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

  expect(verifyProducerEmailCode).toHaveBeenCalledWith("000123");
  expect(auth.completeProducerVerification).toHaveBeenCalledWith({ memberId: 10, role: "PRODUCER", status: "ACTIVE" });
});

it("서버가 코드를 거절하면 입력을 유지하고 재시도 가능한 오류를 보여준다", async () => {
  // given
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  vi.mocked(verifyProducerEmailCode).mockRejectedValue(new Error("인증번호가 일치하지 않습니다."));
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  await act(async () => typeInto("producer-verification-code", "999999"));
  // when
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  // then
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("인증번호가 일치하지 않습니다.");
  expect(container.querySelector<HTMLInputElement>("#producer-verification-code")?.value).toBe("999999");
  expect(auth.completeProducerVerification).not.toHaveBeenCalled();
});

it("인증 처리 중 연속 제출은 한 번만 전송한다", async () => {
  // given
  auth.session = { credential: "member-10", role: "PRODUCER", displayName: "극단", producerStatus: "PENDING" };
  let complete!: (session: { memberId: number; role: "PRODUCER"; status: "ACTIVE" }) => void;
  vi.mocked(verifyProducerEmailCode).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  await act(async () => root.render(<ProducerAccessGate><p>공고 목록</p></ProducerAccessGate>));
  await act(async () => typeInto("producer-verification-code", "000123"));
  // when
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  // then
  expect(verifyProducerEmailCode).toHaveBeenCalledOnce();
  await act(async () => complete({ memberId: 10, role: "PRODUCER", status: "ACTIVE" }));
});
