import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicShowList } from "./public-show-list";

describe("공연 목록 최초 HTML", () => {
  it("자바스크립트 실행 전에 공연명과 상세 링크를 포함한다", () => {
    const markup = renderToStaticMarkup(<PublicShowList initialShows={[{
      id: "show-1",
      hostName: "공연사",
      title: "쇼팽의 편지",
      genre: "PLAY",
      posterUrl: "https://example.com/poster.jpg",
      venueName: "공연장",
      nextSessionStartsAt: "2026-10-10T08:00:00Z",
      runningMinutes: 60,
    }]} />);

    expect(markup).toContain("쇼팽의 편지");
    expect(markup).toContain('href="/shows/show-1"');
    expect(markup).not.toContain("공연 목록을 불러오고 있습니다.");
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
