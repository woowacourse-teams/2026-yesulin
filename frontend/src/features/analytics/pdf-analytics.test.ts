// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
const capture = vi.hoisted(() => vi.fn());
vi.mock("./product-analytics", () => ({ trackProductEvent: capture }));
beforeEach(() => {
  vi.resetModules(); capture.mockReset().mockResolvedValue(true);
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());
const step = { workflow: "actor_pdf" as const, operation_id: "synthetic-job", step: "extract" as const, outcome: "success" as const };
describe("PDF 측정 흐름", () => {
  it("동시 관측과 새로고침 뒤 재조회는 같은 추출 결과를 다시 보내지 않는다", async () => {
    let analytics = await import("./pdf-analytics");
    await Promise.all([analytics.trackPdfStep(step, true), analytics.trackPdfStep(step, true)]);
    vi.resetModules(); analytics = await import("./pdf-analytics");
    await analytics.trackPdfStep(step, true); expect(capture).toHaveBeenCalledTimes(1);
  });
  it("거부·초기화 실패로 전송하지 못한 결과는 나중 관측을 막지 않는다", async () => {
    const { trackPdfStep } = await import("./pdf-analytics"); capture.mockResolvedValueOnce(false);
    await trackPdfStep(step, true); await trackPdfStep(step, true); await trackPdfStep(step, true);
    expect(capture).toHaveBeenCalledTimes(2);
  });
  it("적용 후 저장은 한 번만 연결하고 편집 이탈 후 일반 저장과 섞지 않는다", async () => {
    const { markPdfApplied, trackPdfProfileSaved, clearPdfApplied } = await import("./pdf-analytics");
    trackPdfProfileSaved(); expect(capture).not.toHaveBeenCalled();
    markPdfApplied("saved-job"); trackPdfProfileSaved(); trackPdfProfileSaved();
    markPdfApplied("abandoned-job"); clearPdfApplied(); trackPdfProfileSaved();
    expect(capture.mock.calls.filter(call => call[1].step === "save")).toEqual([
      ["pdf_step_completed", { workflow: "actor_pdf", operation_id: "saved-job", step: "save", outcome: "success" }],
    ]);
  });
  it.each([['COMPLETED', 'success'], ['PARTIAL', 'success'], ['FAILED', 'failure'], ['UPLOAD_EXPIRED', 'failure']] as const)("공연사 %s 상태는 보존하고 원문·파일명은 보내지 않는다", async (status, outcome) => {
    const { registerPdfReviewJob, observePdfExtraction } = await import("./pdf-analytics");
    const job: PdfExtractionJob = { jobId: "synthetic-job", originalFilename: "private-name.pdf", size: 10,
      createdAt: new Date().toISOString(), uploadedAt: null, status, sourceFileKey: "private-key", resultFileKey: "private-result",
      sourceUrl: "https://example.com/private.pdf", result: {
        status: "COMPLETED", sourceSha256: "private-sha", errorCode: "", warnings: [],
        pages: [{ number: 1, text: "합성가람 연락처 010-0000-0001 이메일 actor@example.test", needsOcr: false, images: [] }],
      } };
    observePdfExtraction(job); expect(capture).not.toHaveBeenCalled();
    registerPdfReviewJob(job.jobId, "synthetic-review"); observePdfExtraction(job);
    expect(capture).toHaveBeenCalledWith(outcome === "failure" ? "pdf_step_failed" : "pdf_step_completed", {
      workflow: "producer_pdf", review_id: "synthetic-review", operation_id: "synthetic-job", step: "extract",
      outcome, extraction_status: status, duration_ms: expect.any(Number), missing_field_count: 3,
    });
  });
});
