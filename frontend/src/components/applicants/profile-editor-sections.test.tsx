import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProfileInformationSection } from "./profile-editor-sections";
import { PROFILE_CAREER_GENRES } from "@/features/applicants/career-genre";

describe("프로필 경력 편집", () => {
  it("장르 선택에 접근 가능한 이름과 확정된 옵션 순서를 제공한다", () => {
    const html = renderToStaticMarkup(<ProfileInformationSection tab="ADDITIONAL" fields={[]} values={{ CAREER: [{ year: 2026, title: "작품", part: "배역", genre: null }] }} onChange={() => undefined} />);
    expect(html).toContain('aria-label="경력 1 장르"');
    expect(html).toContain("미분류");
    const labels = ["선택 안 함", ...PROFILE_CAREER_GENRES.map(({ label }) => label)];
    const options = [...html.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map((match) => match[1]);
    expect(options).toEqual(labels);
  });

  it("30개까지 표시하고 추가 버튼 대신 최대 개수 안내를 보여 준다", () => {
    const html = renderToStaticMarkup(<ProfileInformationSection tab="ADDITIONAL" fields={[]} values={{ CAREER: Array.from({ length: 30 }, (_, index) => ({ year: 2026, title: `작품 ${index}`, part: "배역", genre: "THEATER" as const })) }} onChange={() => undefined} />);
    expect(html.match(/<article /g)).toHaveLength(30);
    expect(html).toContain("경력은 최대 30개까지 추가할 수 있어요.");
    expect(html).not.toContain("+ 경력 추가");
  });
});
