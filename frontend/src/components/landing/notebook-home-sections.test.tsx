import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomeShowSection } from "./notebook-home-sections";

describe("홈 무료 공연 섹션", () => {
  it("실제 공개 공연을 최대 3개 소개하고 기존 상세·전체 목록으로 연결한다", () => {
    const html = renderToStaticMarkup(<HomeShowSection initialShows={Array.from({ length: 4 }, (_, index) => ({
      id: `show-${index + 1}`, title: `공연 ${index + 1}`, hostName: "공연사", genre: "PLAY",
      posterUrl: "/images/performances/moonlight.jpg", venueName: "극장", nextSessionStartsAt: null, runningMinutes: 60,
    }))} />);
    expect(html).toContain('href="/shows/show-3"');
    expect(html).not.toContain('href="/shows/show-4"');
    expect(html).toContain('href="/shows"');
    expect(html).toContain("예매 가능한 회차 없음");
  });

  it("빈 목록을 예시 공연으로 채우지 않는다", () => {
    const html = renderToStaticMarkup(<HomeShowSection initialShows={[]} />);
    expect(html).toContain("지금 예매할 수 있는 공연이 없어요");
    expect(html).not.toContain("notebook-show-card");
  });
});
