import { describe, expect, it } from "vitest";
import { appendProfileCareer, applicationCareersFromProfile, profileCareerChoices } from "./application-careers";
import { applicationDraftFromPrefill, submissionValue } from "./public-application-draft";
import type { CareerEntry } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";

const career = (year: number, title: string): CareerEntry => ({ year, title, part: "배역", genre: "THEATER" });
const draft = (year: string, title: string) => ({ id: title, year, title, part: "배역" });

describe("프로필 경력의 지원서 선택", () => {
  it("최근 연도순으로 10개를 넣고 같은 연도의 프로필 순서는 유지한다", () => {
    const profile = [career(2020, "오래된 작품"), career(2026, "같은 해 첫 작품"), career(2026, "같은 해 두 번째"),
      ...Array.from({ length: 10 }, (_, index) => career(2025 - index, `작품 ${index}`))];
    const result = applicationCareersFromProfile(profile);
    expect(result).toHaveLength(10);
    expect(result.slice(0, 3).map((entry) => entry.title)).toEqual(["같은 해 첫 작품", "같은 해 두 번째", "작품 0"]);
    expect(result.every((entry, index) => index === 0 || Number(result[index - 1]!.year) >= Number(entry.year))).toBe(true);
    expect(profile[0]!.title).toBe("오래된 작품");
    expect(Object.keys(result[0]!)).toEqual(["id", "title", "part", "year"]);
  });

  it("10개 이하인 프로필은 전부 넣고 교체용 전체 목록은 원래 순서와 장르로 보존한다", () => {
    const profile = [career(2023, "첫 작품"), career(2026, "최근 작품")];
    const result = applicationDraftFromPrefill({ answers: [{ key: "CAREER", label: "경력", value: profile }], filledCount: 1, requiredCount: 1, missingKeys: [] });
    expect(result.careers.map((entry) => entry.title)).toEqual(["최근 작품", "첫 작품"]);
    expect(result.profileCareers).toEqual(profile);
    const field = { id: "CAREER" } as ApplicationFieldInput;
    expect(submissionValue(field, { ...result, noCareer: false })).toEqual([
      { year: 2026, title: "최근 작품", part: "배역" }, { year: 2023, title: "첫 작품", part: "배역" },
    ]);
  });

  it("prefill이 없으면 교체 목록도 없다", () => {
    expect(applicationDraftFromPrefill().profileCareers).toEqual([]);
  });

  it("문자열 연도를 숫자로 비교하고 공백을 뺀 같은 경력은 교체 목록에서 제외한다", () => {
    expect(profileCareerChoices([career(2026, "작품"), career(2025, "다른 작품")], [draft(" 2026 ", " 작품 ")]))
      .toEqual([career(2025, "다른 작품")]);
  });

  it("삭제한 경력을 다른 프로필 경력으로 채울 수 있고 10개이거나 중복이면 추가하지 않는다", () => {
    const selected = Array.from({ length: 10 }, (_, index) => draft("2026", `작품 ${index}`));
    expect(appendProfileCareer(selected, career(2025, "다른 작품"), "new")).toBe(selected);
    const removed = selected.slice(1);
    const result = appendProfileCareer(removed, career(2025, "다른 작품"), "new");
    expect(result).toHaveLength(10);
    expect(result.at(-1)).toEqual({ id: "new", year: "2025", title: "다른 작품", part: "배역" });
    expect(appendProfileCareer(removed, career(2026, "작품 1"), "duplicate")).toBe(removed);
  });
});
