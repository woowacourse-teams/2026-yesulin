import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CareerEntry } from "@/features/applicants/types";

beforeEach(() => vi.resetModules());

describe("MSW 제출 후 프로필 저장", () => {
  it("장르 있는 30개 프로필을 지원서 10개로 덮어쓰지 않고 초과 수를 반환한다", async () => {
    const store = await import("./store");
    const careers: CareerEntry[] = Array.from({ length: 30 }, (_, index) => ({ year: 2026, title: `작품 ${index}`, part: "주연", genre: "FILM" }));
    store.patchApplicantProfile({ answers: [{ key: "CAREER", value: careers }] });
    const submitted = [...careers.slice(0, 9), { year: 2025, title: "새 작품", part: "조연" }];
    expect(store.saveSubmissionAnswersToProfile([{ key: "CAREER", label: "경력", value: submitted }])).toBe(1);
    expect(store.applicantProfile().answers.find((answer) => answer.key === "CAREER")?.value).toEqual(careers);
  });

  it("지원서 내 중복을 한 번만 미분류 경력으로 붙인다", async () => {
    const store = await import("./store");
    store.patchApplicantProfile({ answers: [{ key: "CAREER", value: [] }] });
    store.saveSubmissionAnswersToProfile([{ key: "CAREER", label: "경력", value: [
      { year: 2026, title: "작품", part: "주연" }, { year: 2026, title: " 작품 ", part: "주연" },
    ] }]);
    expect(store.applicantProfile().answers.find((answer) => answer.key === "CAREER")?.value)
      .toEqual([{ year: 2026, title: "작품", part: "주연", genre: null }]);
  });
});
