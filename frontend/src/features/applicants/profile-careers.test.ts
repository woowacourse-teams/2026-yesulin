import { describe, expect, it } from "vitest";
import { mergeProfileCareers, profileCareersError } from "./profile-careers";
import type { CareerEntry } from "./types";

const career = (title: string): CareerEntry => ({ year: 2026, title, part: "주연", genre: "MUSICAL" });

describe("제출 후 프로필 경력 병합", () => {
  it("기존 경력·장르·순서를 유지하고 새 경력만 null 장르로 뒤에 붙인다", () => {
    const current = [career("기존 작품"), { ...career("남겨 둘 작품"), genre: null }];
    const result = mergeProfileCareers(current, [{ year: " 2026 ", title: " 기존 작품 ", part: " 주연 " }, { year: 2025, title: " 새 작품 ", part: " 조연 " }]);
    expect(result.careers).toEqual([...current, { year: 2025, title: "새 작품", part: "조연", genre: null }]);
    expect(result.skippedCareerCount).toBe(0);
    expect(current).toHaveLength(2);
  });

  it("지원서에서 뺀 경력은 남기고 고친 경력은 새 항목으로 추가한다", () => {
    const current = [career("기존 작품"), career("지원서에서 뺀 작품")];
    expect(mergeProfileCareers(current, [{ ...career("고친 작품"), part: "조연" }]).careers)
      .toEqual([...current, { year: 2026, title: "고친 작품", part: "조연", genre: null }]);
  });

  it("지원서끼리도 숫자 연도·공백 기준으로 중복 제거한다", () => {
    const result = mergeProfileCareers([], [career("작품"), { year: "2026", title: " 작품 ", part: " 주연 " }]);
    expect(result.careers).toEqual([{ year: 2026, title: "작품", part: "주연", genre: null }]);
  });

  it("30개까지만 붙이고 초과한 새 경력의 중복을 뺀 개수를 반환한다", () => {
    const current = Array.from({ length: 29 }, (_, index) => career(`기존 ${index}`));
    const result = mergeProfileCareers(current, [career("추가"), career("초과"), { ...career(" 초과 "), year: "2026" }, career("또 초과")]);
    expect(result.careers).toHaveLength(30);
    expect(result.skippedCareerCount).toBe(2);
    expect(result.careers.at(-1)?.title).toBe("추가");
  });

  it("장르가 있는 30개 프로필에 최근 10개를 다시 저장해도 모두 보존한다", () => {
    const current = Array.from({ length: 30 }, (_, index) => career(`작품 ${index}`));
    expect(mergeProfileCareers(current, current.slice(0, 10))).toEqual({ careers: current, skippedCareerCount: 0 });
    expect(mergeProfileCareers(current, [career("새 작품"), career("새 작품")]))
      .toEqual({ careers: current, skippedCareerCount: 1 });
  });

  it("프로필은 장르·null과 30개를 받지만 31개와 잘못된 장르는 거부한다", () => {
    expect(profileCareersError(Array.from({ length: 30 }, (_, index) => career(`작품 ${index}`)))).toBeNull();
    expect(profileCareersError([{ ...career("작품"), genre: null }])).toBeNull();
    expect(profileCareersError(Array.from({ length: 31 }, () => career("작품")))).toContain("30개");
    expect(profileCareersError([{ ...career("작품"), genre: "INVALID" }])).not.toBeNull();
  });
});
