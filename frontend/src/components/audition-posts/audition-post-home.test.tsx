import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AuditionPostPage } from "@/features/audition-posts/types";
import { AuditionPostHome } from "./audition-post-home";
import { AuditionPostList } from "./audition-post-list";

const { pathname } = vi.hoisted(() => ({ pathname: vi.fn(() => "/") }));
vi.mock("next/navigation", () => ({ usePathname: pathname }));

const data: AuditionPostPage = {
  page: 0, size: 12, totalPages: 3, totalElements: 30, openCount: 30, allCount: 40,
  posts: Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, category: "연극", title: `공개 오디션 ${index + 1}`, authorName: "극단",
    pay: "협의", deadlineText: "상시", deadline: null, closed: false, viewCount: 0,
    postedAt: null, thumbnailUrl: null, attachmentCount: 0,
  })),
};

vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: null }) }));

describe("메인과 오디션 전용 목록", () => {
  it("기본 홈은 3개를 소개하고 전체 목록을 여는 경로를 제공한다", () => {
    pathname.mockReturnValue("/");
    const html = renderToStaticMarkup(<AuditionPostHome initialPage={data} initialShows={[]} />);
    expect(html).toContain('href="/posts/3"');
    expect(html).not.toContain('href="/posts/4"');
    expect(html).toContain("전체 공고 보기");
    expect(html).toContain("공개 공고 30개 · 3개 미리보기");
    expect(html).toContain('href="/auditions"');
    expect(html).toContain('id="shows"');
    expect(html).toContain('id="faq"');
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain('type="search"');
  });

  it("전용 목록의 첫 페이지부터 12개를 표시하고 메인 섹션을 포함하지 않는다", () => {
    pathname.mockReturnValue("/auditions");
    const html = renderToStaticMarkup(<AuditionPostList query={{ page: 0, includeClosed: false }} initialPage={data} />);
    expect(html).toContain('href="/posts/12"');
    expect(html).toContain('href="/auditions?page=2"');
    expect(html).toContain('type="search"');
    expect(html).not.toContain("3개 미리보기");
    expect(html).not.toContain('id="shows"');
    expect(html).not.toContain('id="faq"');
    expect(html).not.toContain('class="notebook-banner"');
    expect(html).toMatch(/<a\b(?=[^>]*aria-current="page")(?=[^>]*href="\/auditions")[^>]*>오디션<\/a>/);
  });

  it("목록 페이지 이동에서 마감·분야 조건을 유지한다", () => {
    const html = renderToStaticMarkup(<AuditionPostList query={{ category: "연극", page: 1, includeClosed: true }} initialPage={{ ...data, page: 1 }} />);
    expect(html).toContain('href="/posts/12"');
    expect(html).toContain('href="/auditions/theater?closed=1&amp;page=3"');
    expect(html).not.toContain("3개 미리보기");
  });

  it("서버 조회가 없는 상태를 빈 데이터로 단정하지 않는다", () => {
    const html = renderToStaticMarkup(<AuditionPostHome initialPage={null} initialShows={null} />);
    expect(html).toContain("공고 목록 불러오는 중");
    expect(html).toContain("공연 목록 불러오는 중");
    expect(html).not.toContain("지금 예매할 수 있는 공연이 없어요");
  });
});
