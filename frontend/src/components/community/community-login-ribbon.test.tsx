// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommunityLoginRibbon } from "./community-login-ribbon";
import { SocialLogin } from "@/components/auth/social-login";
import { consumeSocialLoginReturnTo } from "@/features/auth/social-login-return-to";
import { trackLoginAttempt, trackLoginSuccess } from "@/features/analytics/events";
import { LoginForm } from "@/components/auth/login-form";

const state = vi.hoisted(() => ({
  session: null as null | { role: string; credential: string }, sessionReady: true,
  setSession: vi.fn(), push: vi.fn(), mockLogin: vi.fn(), toast: vi.fn(),
  environment: { apiMockingEnabled: true, socialLoginEnabled: false },
}));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => state, createFrontendCredential: () => "test" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }) }));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => state.toast }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: state.environment }));
vi.mock("@/mocks/auth-handlers", () => ({ mockApplicantLogin: state.mockLogin }));
vi.mock("@/features/analytics/events", () => ({ loginAttributionFor: () => ({ actor_type: "applicant" }), trackLoginAttempt: vi.fn(), trackLoginSuccess: vi.fn(), trackLoginPageView: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
let assign: ReturnType<typeof vi.fn>;
const buttons = () => [...container.querySelectorAll<HTMLButtonElement>("[data-provider]")];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.session = null; state.sessionReady = true;
  Object.assign(state.environment, { apiMockingEnabled: true, socialLoginEnabled: false });
  state.mockLogin.mockReturnValue({ memberId: 7 });
  window.sessionStorage.clear();
  assign = vi.fn();
  vi.stubGlobal("window", new Proxy(window, { get(target, key) {
    if (key === "location") return { assign };
    return Reflect.get(target, key);
  } }));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

describe("커뮤니티 1초 로그인", () => {
  it("비로그인일 때만 설명 없는 제목과 소셜3개를 보여 준다", async () => {
    await act(async () => root.render(<CommunityLoginRibbon />));
    expect(container.querySelector("h2")?.textContent).toBe("1초 로그인");
    expect(buttons()).toHaveLength(3);
    expect(container.querySelector("p")).toBeNull();
    state.session = { role: "APPLICANT", credential: "member-7" };
    await act(async () => root.render(<CommunityLoginRibbon />));
    expect(container.innerHTML).toBe("");
  });

  it("세션 확인 중에는 띠를 표시하지 않는다", async () => {
    state.sessionReady = false;
    await act(async () => root.render(<CommunityLoginRibbon />));
    expect(container.innerHTML).toBe("");
  });

  it.each(["kakao", "naver", "google"])("%s는 로그인 페이지를 거치지 않고 실제 OAuth와 내부 복귀 주소를 사용한다", async provider => {
    state.environment.apiMockingEnabled = false;
    await act(async () => root.render(<CommunityLoginRibbon />));
    await act(async () => container.querySelector<HTMLButtonElement>(`[data-provider=${provider}]`)!.click());
    expect(assign).toHaveBeenCalledWith(`/oauth2/authorization/${provider}`);
    expect(consumeSocialLoginReturnTo()).toBe("/community/new");
    expect(trackLoginAttempt).toHaveBeenCalledTimes(1);
    expect(trackLoginSuccess).not.toHaveBeenCalled();
    expect(state.mockLogin).not.toHaveBeenCalled();
  });

  it("목에서도 실제 소셜 설정이 켜져 있으면 OAuth를 사용한다", async () => {
    state.environment.socialLoginEnabled = true;
    await act(async () => root.render(<CommunityLoginRibbon />));
    await act(async () => buttons()[0].click());
    expect(assign).toHaveBeenCalledWith("/oauth2/authorization/kakao");
    expect(state.mockLogin).not.toHaveBeenCalled();
  });

  it("중복 클릭을 막고 목 로그인 성공 후 글쓰기로 돌아온다", async () => {
    await act(async () => root.render(<CommunityLoginRibbon />));
    await act(async () => { buttons()[0].click(); buttons()[1].click(); });
    expect(state.mockLogin).toHaveBeenCalledTimes(1);
    expect(state.setSession).toHaveBeenCalledWith(expect.objectContaining({ credential: "member-7", role: "APPLICANT" }));
    expect(state.push).toHaveBeenCalledWith("/community/new");
    expect(trackLoginSuccess).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it("이동을 시작하지 못하면 오류를 보여 주고 다시 누를 수 있다", async () => {
    state.environment.apiMockingEnabled = false;
    assign.mockImplementationOnce(() => { throw new Error("blocked"); });
    await act(async () => root.render(<CommunityLoginRibbon />));
    await act(async () => buttons()[0].click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("다시 눌러");
    expect(buttons().every(button => !button.disabled)).toBe(true);
    await act(async () => buttons()[0].click());
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it("공통 소셜 동작도 외부 복귀 주소를 허용하지 않는다", async () => {
    state.environment.apiMockingEnabled = false;
    await act(async () => root.render(<SocialLogin returnTo="//example.com" />));
    await act(async () => buttons()[0].click());
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });

  it("로그인 폼은 계정 이름과 실제 로그인 컨트롤만 보여 준다", async () => {
    await act(async () => root.render(<LoginForm />));
    expect(container.querySelector('input[value="applicant"]')).not.toBeNull();
    expect(container.querySelector('input[value="producer"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/이용 목적|사용할 계정 유형|오디션을 찾고 지원해요|공고와 배우를 관리해요|자동으로 만들어집니다/);
    await act(async () => container.querySelector<HTMLInputElement>('input[value="producer"]')!.click());
    expect(container.querySelector('#login-identifier')).not.toBeNull();
    expect(container.querySelector('#login-password')).not.toBeNull();
    expect(buttons()).toHaveLength(0);
  });
});
