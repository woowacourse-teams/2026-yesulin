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

describe("PDF 심사 카드·표 목록 표시", () => {
  it("이름·배역이 비어 있으면 파일 이름만 보이고 자리 표시를 쓰지 않는다", () => {
    expect(label([{ id: "r1", name: "남주" }], {})).toEqual({
      filename: "지원서_가상.pdf", name: "", heading: "지원서_가상.pdf", details: "", uploading: false,
    });
  });

  it("공백만 적은 이름은 비어 있는 것으로 본다", () => {
    expect(label([], { title: "   " })).toMatchObject({ name: "", heading: "지원서_가상.pdf" });
  });

  it("자동으로 읽은 이름은 보이지 않고 담당자가 적은 이름과 배정한 배역만 덧붙인다", () => {
    expect(label([{ id: "r1", name: "남주" }], { title: "가람", roleId: "r1" }).details).toBe("가람 · 남주");
  });

  it("아직 올라가는 중인 지원서는 업로드 중으로 표시한다", () => {
    expect(label([], { processingStatus: "UPLOADING" }).uploading).toBe(true);
    expect(label([], { processingStatus: "EXTRACTING" }).uploading).toBe(false);
  });
});
