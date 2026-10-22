import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import EventNotFound from "@/app/events/not-found";
import CompanyNotFound from "@/app/companies/not-found";
import { ShowUnavailable } from "@/components/shows/show-status";

vi.mock("next/navigation", () => ({ usePathname: () => "/events/0" }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: null }) }));

describe("공개 상세의 서버 404 복귀 동선", () => {
  it.each([
    [EventNotFound, "이벤트를 찾을 수 없어요", "/events"],
    [CompanyNotFound, "공연사 정보를 찾을 수 없어요", "/auditions"],
    [ShowUnavailable, "공연을 찾을 수 없어요", "/shows"],
  ] as const)("브랜드 화면과 해당 목록 링크를 제공한다 (%s)", (Screen, title, list) => {
    const html = renderToStaticMarkup(<Screen />);
    expect(html).toContain(`<h1`);
    expect(html).toContain(title);
    expect(html).toContain(`href="${list}"`);
    expect(html).toContain('aria-label="예술in 홈"');
    expect(html).toContain('aria-label="푸터 서비스"');
    expect(html).not.toContain("This page could not be found");
  });
});
