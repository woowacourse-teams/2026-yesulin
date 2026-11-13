import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "./page";

vi.mock("@/config/environment", () => ({ frontendEnvironment: { apiMockingEnabled: true } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "yesulin.art" }) }));
vi.mock("@/components/auth/auth-shell", () => ({
  AuthShell: ({ footer }: { footer?: React.ReactNode }) => <>{footer}</>,
}));
vi.mock("@/components/auth/login-form", () => ({ LoginForm: () => null }));

const application = vi.hoisted(() => ({ context: null as object | null }));
vi.mock("@/features/auth/application-auth-context-server", () => ({
  applicationAuthContextForServer: async () => application.context,
}));
vi.mock("@/components/auth/application-auth-context", () => ({ ApplicationAuthContextCard: () => null }));

it("일반 로그인 화면에는 기획사/제작사 이메일 로그인으로 가는 링크가 있다", async () => {
  application.context = null;

  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }));

  expect(html).toContain('href="/producer-service/login"');
});

it("지원서 제출 로그인에는 기획사 링크를 두지 않는다", async () => {
  application.context = { postingId: "post-1" };

  const html = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ returnTo: "/apply/post-1" }) }));

  expect(html).not.toContain("/producer-service/login");
  expect(html).toContain("회원 계정이 자동으로 만들어집니다");
});
