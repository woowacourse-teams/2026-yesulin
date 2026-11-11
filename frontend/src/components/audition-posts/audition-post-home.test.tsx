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
    postedAt: null, alertChatMembers: 109, thumbnailUrl: null, attachmentCount: 0,
  })),
};

const renderedAt = Date.parse("2026-11-10T14:58:00Z");

vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: null }) }));

describe("메인과 오디션 전용 목록", () => {
  it("홈은 분야 바로가기와 공고·공연 포스터 줄을 보여 주고 전체 목록으로 연결한다", () => {
    pathname.mockReturnValue("/");
    const html = renderToStaticMarkup(<AuditionPostHome renderedAt={renderedAt} initialLatest={data} initialDeadline={data} initialShows={[]} />);
    expect(html).toContain('aria-label="분야 바로가기"');
    expect(html).toContain('href="/auditions/musical"');
    expect(html).toContain("새로 올라온 공고");
    expect(html).toContain("마감 임박 공고");
    expect(html).toContain("많이 본 공고");
    expect(html).toContain('href="/posts/12"');
    expect(html).toContain('href="/auditions"');
    expect(html).toContain('href="/auditions?sort=deadline"');
    expect(html).toContain('aria-label="1위"');
    expect(html).toContain('id="shows"');
    expect(html).toContain('id="faq"');
    expect(html).not.toContain('aria-current="page"');
    expect(html).not.toContain('type="search"');
  });

  it("캐시 생성 뒤 한국 날짜가 바뀌어도 홈의 공고 마감 배지와 공연 표시는 생성 시각으로 렌더링한다", () => {
    pathname.mockReturnValue("/");
    const posts = { ...data, posts: [{ ...data.posts[0], deadline: "2026-11-11" }] };
    const shows = [{
      id: "show-1", title: "경계 시각 공연", hostName: "공연사", genre: "PLAY", status: "OPEN",
      posterUrl: null, venueName: "극장", nextSessionStartsAt: "2026-11-10T15:00:00Z", runningMinutes: 60,
    }] as const;
    const render = () => renderToStaticMarkup(
      <AuditionPostHome renderedAt={renderedAt} initialLatest={posts} initialDeadline={posts} initialShows={shows} />,
    );

    vi.useFakeTimers();
    try {
      vi.setSystemTime(renderedAt);
      const cached = render();
      vi.setSystemTime(Date.parse("2026-11-10T15:01:00Z"));
      expect(cached).toContain("D-1");
      expect(cached).toContain("경계 시각 공연");
      expect(render()).toBe(cached);
    } finally {
      vi.useRealTimers();
    }
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

  it("마감순 정렬이 선택된 목록의 모든 탐색 링크가 정렬 조건을 유지한다", () => {
    const html = renderToStaticMarkup(<AuditionPostList query={{ category: "연극", page: 1, includeClosed: true, sort: "deadline" }} initialPage={{ ...data, page: 1 }} />);
    expect(html).toContain('href="/auditions/theater?closed=1&amp;page=3&amp;sort=deadline"');
    expect(html).toContain('href="/auditions/musical?closed=1&amp;sort=deadline"');
    expect(html).toContain('href="/auditions/theater?sort=deadline"');
    expect(html).toContain('aria-label="공고 정렬"');
    expect(html).toMatch(/<a\b(?=[^>]*href="\/auditions\/theater\?closed=1&amp;sort=deadline")(?=[^>]*aria-current="true")[^>]*>마감 임박순<\/a>/);
  });

  it("서버 조회가 없는 상태를 빈 데이터로 단정하지 않는다", () => {
    const html = renderToStaticMarkup(<AuditionPostHome renderedAt={renderedAt} initialLatest={null} initialDeadline={null} initialShows={null} />);
    expect(html).toContain("포스터 불러오는 중");
    expect(html).not.toContain("지금 예매할 수 있는 공연이 없어요");
  });
});
