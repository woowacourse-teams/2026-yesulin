import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FrontendAuthSession } from "@/components/auth/auth-session";
import { NotebookHeader } from "./notebook-site-layout";

const auth = vi.hoisted(() => ({ session: null as FrontendAuthSession | null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/auditions", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => auth }));
beforeEach(() => { auth.session = null; });

describe("공개 헤더의 계정 이동", () => {
  it("방문자는 기존 로그인 경로를 이용한다", () => {
    const html = renderToStaticMarkup(<NotebookHeader />);
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/producer-service"');
    expect(html).not.toContain("로그아웃");
  });

  it("배우는 공개 공고에서 내 지원서로 돌아갈 수 있다", () => {
    auth.session = { credential: "fixture", role: "APPLICANT", displayName: "배우" };
    const html = renderToStaticMarkup(<NotebookHeader />);
    expect(html).toContain('href="/applicants/submissions"');
    expect(html).not.toContain('href="/login"');
    expect(html).toContain("로그아웃");
    expect(html).not.toContain('href="/producer-service"');
  });

  it("공연사 세션은 기존 공연 관리로 연결한다", () => {
    auth.session = { credential: "fixture", role: "PRODUCER", displayName: "공연사" };
    const html = renderToStaticMarkup(<NotebookHeader />);
    expect(html).toContain('href="/producers/shows"');
    expect(html).not.toContain('href="/applicants/submissions"');
    expect(html).toContain("로그아웃");
    expect(html).not.toContain('href="/producer-service"');
  });
});
