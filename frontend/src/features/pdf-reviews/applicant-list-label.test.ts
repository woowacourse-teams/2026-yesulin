import { describe, expect, it } from "vitest";
import { applicantListLabel } from "./applicant-list-label";
import { screeningApplicant } from "./screening-adapter";
import type { ReviewDetail, ReviewEntry } from "./types";

const review = (roles: ReviewDetail["roles"]): Omit<ReviewDetail, "entries"> => ({ id: "review", title: "심사", createdAt: "2026-11-16", roles });
const entry = (patch: Partial<ReviewEntry>): ReviewEntry => ({
  id: "entry", jobId: "job", originalFilename: "지원서_가상.pdf", title: "", applicantName: "자동 추출 이름", roleId: null,
  matchStatus: "NEEDS_CHECK", matchEvidence: null, memo: "", decision: "PENDING", processingStatus: "READY", ...patch,
});
const label = (roles: ReviewDetail["roles"], patch: Partial<ReviewEntry>) => {
  const item = entry(patch);
  return applicantListLabel(screeningApplicant({ ...review(roles), entries: [item] }, item));
};

describe("PDF 심사 지원자 목록 표시", () => {
  it("기존 응답에 제목이 없으면 원본 파일명으로 표시한다", () => {
    expect(label([{ id: "r1", name: "남주" }], {})).toEqual({
      title: "지원서_가상.pdf", role: "", uploading: false,
    });
  });

  it("공백만 적은 제목은 원본 파일명으로 돌아간다", () => {
    expect(label([], { title: "   " })).toMatchObject({ title: "지원서_가상.pdf" });
  });

  it("수동 제목과 배정 배역을 표시한다", () => {
    expect(label([{ id: "r1", name: "남주" }], { title: "가람", roleId: "r1" })).toMatchObject({ title: "가람", role: "남주" });
  });

  it("아직 올라가는 중인 지원서는 업로드 중으로 표시한다", () => {
    expect(label([], { processingStatus: "UPLOADING" }).uploading).toBe(true);
    expect(label([], { processingStatus: "EXTRACTING" }).uploading).toBe(false);
  });
});
