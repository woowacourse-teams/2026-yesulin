import { describe, expect, it } from "vitest";
import { featuredCareers } from "./featured-careers";

describe("featuredCareers", () => {
  it("shows only the three most recent careers in the first detailed view", () => {
    const careers = [
      { year: 2022, title: "첫 작품", part: "배역 1" },
      { year: 2024, title: "둘째 작품", part: "배역 2" },
      { year: 2025, title: "셋째 작품", part: "배역 3" },
      { year: 2026, title: "넷째 작품", part: "배역 4" },
    ];

    expect(featuredCareers(careers)).toEqual([
      { year: 2026, title: "넷째 작품", part: "배역 4" },
      { year: 2025, title: "셋째 작품", part: "배역 3" },
      { year: 2024, title: "둘째 작품", part: "배역 2" },
    ]);
  });

  it("keeps every career when there are at most three", () => {
    const careers = [{ year: 2025, title: "한 작품", part: "주연" }];

    expect(featuredCareers(careers)).toEqual(careers);
  });
});
