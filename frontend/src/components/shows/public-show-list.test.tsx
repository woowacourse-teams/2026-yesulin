import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PublicShowList } from "./public-show-list";

vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: null }) }));

describe("공연 목록 최초 HTML", () => {
  it("자바스크립트 실행 전에 공연명과 상세 링크를 포함한다", () => {
    const markup = renderToStaticMarkup(<PublicShowList initialShows={[{
      id: "show-1",
      hostName: "공연사",
      title: "쇼팽의 편지",
      genre: "PLAY",
      status: "OPEN",
      posterUrl: "https://example.com/poster.jpg",
      venueName: "공연장",
      nextSessionStartsAt: "2026-10-10T08:00:00Z",
      runningMinutes: 60,
    }]} />);

    expect(markup).toContain("쇼팽의 편지");
    expect(markup).toContain('href="/shows/show-1"');
    expect(markup).not.toContain("공연 목록을 불러오고 있습니다.");
  });

  it("공연이 있는 장르만 필터로 보여 준다", () => {
    const show = {
      hostName: "공연사",
      status: "OPEN" as const,
      posterUrl: "https://example.com/poster.jpg",
      venueName: "공연장",
      nextSessionStartsAt: "2026-10-10T08:00:00Z",
      runningMinutes: 60,
    };
    const markup = renderToStaticMarkup(<PublicShowList initialShows={[
      { ...show, id: "show-1", title: "햄릿", genre: "PLAY" },
      { ...show, id: "show-2", title: "탱고의 밤", genre: "MUSIC" },
    ]} />);

    expect(markup).toContain("연극");
    expect(markup).toContain("음악");
    expect(markup).not.toContain("뮤지컬");
  });

  it("빈 배열은 로딩 화면 대신 빈 목록을 렌더링한다", () => {
    const markup = renderToStaticMarkup(<PublicShowList initialShows={[]} />);

    expect(markup).toContain("지금 예매할 수 있는 공연이 없어요");
    expect(markup).not.toContain("공연 목록을 불러오고 있습니다.");
  });

  it("목 환경의 null은 브라우저 조회를 위한 로딩 화면을 렌더링한다", () => {
    const markup = renderToStaticMarkup(<PublicShowList initialShows={null} />);

    expect(markup).toContain("공연 목록을 불러오고 있습니다.");
    expect(markup).not.toContain("지금 예매할 수 있는 공연이 없어요");
  });
});

describe("공연 일정에 따른 목록 구분", () => {
  it("미래 회차와 지난 회차·예정 회차 없음을 구분하고 마감 공연도 열 수 있다", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-15T00:00:00Z"));
    try {
      const common = { hostName: "공연사", genre: "PLAY" as const, status: "OPEN" as const, posterUrl: "/poster.jpg", venueName: "극장", runningMinutes: 60 };
      const html = renderToStaticMarkup(<PublicShowList initialShows={[
        { ...common, id: "past", title: "지난 공연", nextSessionStartsAt: "2026-10-10T08:00:00Z" },
        { ...common, id: "future", title: "다가올 공연", nextSessionStartsAt: "2026-10-20T08:00:00Z" },
        { ...common, id: "none", title: "회차 없는 공연", nextSessionStartsAt: null },
        { ...common, id: "closed", title: "마감한 공연", status: "CLOSED", nextSessionStartsAt: "2026-10-20T08:00:00Z" },
      ]} />);
      const upcoming = html.slice(html.indexOf('aria-label="다가오는 공연"'), html.indexOf('aria-label="예매 마감"'));
      const ended = html.slice(html.indexOf('aria-label="예매 마감"'));
      const cardText = (id: string) => {
        const start = ended.indexOf(`href="/shows/${id}"`);
        return ended.slice(start, ended.indexOf("</a>", start)).replace(/<[^>]+>/g, "");
      };
      expect(upcoming).toContain('href="/shows/future"');
      expect(upcoming).not.toContain('href="/shows/past"');
      expect(upcoming).not.toContain('href="/shows/closed"');
      expect(ended).toContain('href="/shows/past"');
      expect(ended).toContain('href="/shows/none"');
      expect(cardText("past")).toContain("예매 마감 · 예정 회차 없음");
      expect(cardText("past")).not.toContain("다음 회차");
      expect(cardText("none")).toContain("예매 마감 · 예정 회차 없음");
      expect(cardText("closed")).toContain("예매 마감 · 다음 회차 10월 20일 (화) 17:00");
    } finally { vi.restoreAllMocks(); }
  });
});
