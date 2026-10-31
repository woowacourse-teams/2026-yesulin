// @vitest-environment jsdom
import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfExtraction, PdfExtractionApiError } from "../pdf-extractions/api";
import type { PdfExtractionJob } from "../pdf-extractions/types";
import { fetchPdfReview } from "./api";
import type { ReviewDetail, ReviewEntry } from "./types";
import { usePassedContacts } from "./use-passed-contacts";

vi.mock("../pdf-extractions/api", async importOriginal => ({ ...await importOriginal<typeof import("../pdf-extractions/api")>(), fetchPdfExtraction: vi.fn() }));
vi.mock("./api", async importOriginal => ({ ...await importOriginal<typeof import("./api")>(), fetchPdfReview: vi.fn() }));

const entry = (id: string, decision: ReviewEntry["decision"] = "PASS"): ReviewEntry => ({
  id, jobId: `job-${id}`, applicantName: `가상${id}`, originalFilename: `${id}.pdf`,
  roleId: "role-a", matchStatus: "MATCHED", matchEvidence: "", memo: "", decision, processingStatus: "READY",
});
const review = (entries: readonly ReviewEntry[]): ReviewDetail => ({ id: "review", title: "합성 심사", createdAt: "2026-10-31", roles: [{ id: "role-a", name: "주연" }], entries });
const job = (text = "전화번호: 010-0000-0001"): PdfExtractionJob => ({
  jobId: "job", originalFilename: "합성.pdf", size: 1, createdAt: "2026-10-31", uploadedAt: null, status: "COMPLETED", sourceFileKey: "", resultFileKey: "", sourceUrl: null,
  result: { status: "COMPLETED", sourceSha256: "", errorCode: "", warnings: [], pages: [{ number: 1, text, needsOcr: false, images: [] }] },
});
let root: Root;
let state: ReturnType<typeof usePassedContacts>;
let reviewId = "review";
const unauthorized = vi.fn();
function Harness() { const value = usePassedContacts(reviewId, unauthorized); useEffect(() => { state = value; }); return null; }
async function render() { await act(async () => root.render(<Harness />)); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks(); reviewId = "review";
  root = createRoot(document.createElement("div"));
  vi.mocked(fetchPdfReview).mockResolvedValue(review([entry("1")]));
  vi.mocked(fetchPdfExtraction).mockResolvedValue(job());
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

describe("합격자 연락처 조회", () => {
  it("최신 명단의 PASS만 조회하고 다른 배역과 번호 없는 합격자도 빠뜨리지 않는다", async () => {
    vi.mocked(fetchPdfReview).mockResolvedValue(review([entry("1"), { ...entry("2"), roleId: null }, entry("3", "HOLD"), entry("4", "FAIL"), entry("5", "PENDING")]));
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job()).mockResolvedValueOnce(job("사진만 있음"));
    await render();
    expect(state.rows.map(row => row.entry.id)).toEqual(["1", "2"]);
    expect(state.rows.map(row => row.contact.status)).toEqual(["FOUND", "MISSING"]);
    expect(state.rows[1].roleName).toBe("미기재");
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(2);
    expect(state.loading).toBe(false);
  });
  it("한 번에 최대 4건만 조회하고 이탈하면 남은 요청을 보내지 않는다", async () => {
    vi.mocked(fetchPdfReview).mockResolvedValue(review(Array.from({ length: 9 }, (_, i) => entry(String(i)))));
    const complete: (() => void)[] = [];
    vi.mocked(fetchPdfExtraction).mockImplementation(() => new Promise(resolve => complete.push(() => resolve(job()))));
    await render();
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(4);
    await act(async () => complete[0]());
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(5);
    const signals = vi.mocked(fetchPdfExtraction).mock.calls.map(call => call[2]);
    await act(async () => root.render(null));
    expect(signals.every(signal => signal?.aborted)).toBe(true);
    await act(async () => complete.forEach(resolve => resolve()));
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(5);
  });
  it("같은 조회 결과에서 전화번호와 이메일을 독립적으로 확인한다", async () => {
    vi.mocked(fetchPdfReview).mockResolvedValue(review([entry("1"), entry("2"), entry("3")]));
    vi.mocked(fetchPdfExtraction)
      .mockResolvedValueOnce(job("이메일: actor@example.test"))
      .mockResolvedValueOnce(job("010-0000-0001\n이메일 미기재"))
      .mockResolvedValueOnce(job("010-0000-0002\na@example.test b@example.test"));
    await render();
    expect(state.rows.map(row => row.contact.status)).toEqual(["MISSING", "FOUND", "FOUND"]);
    expect(state.rows.map(row => row.email.status)).toEqual(["FOUND", "MISSING", "MULTIPLE"]);
    expect(state.rows[0].email.email).toBe("actor@example.test");
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(3);
  });
  it("PDF 하나의 조회 실패가 다른 합격자의 연락처를 막지 않는다", async () => {
    vi.mocked(fetchPdfReview).mockResolvedValue(review([entry("1"), entry("2")]));
    vi.mocked(fetchPdfExtraction).mockRejectedValueOnce(new Error("temporary")).mockResolvedValueOnce(job());
    await render();
    expect(state.rows.map(row => row.contact.status)).toEqual(["ERROR", "FOUND"]);
    expect(state.rows[0].email.status).toBe("ERROR");
    expect(state.error).toBe("");
  });
  it("401이면 연락처를 지우고 대기열을 중단한 뒤 재로그인을 안내한다", async () => {
    vi.mocked(fetchPdfReview).mockResolvedValue(review(Array.from({ length: 8 }, (_, i) => entry(String(i)))));
    vi.mocked(fetchPdfExtraction).mockRejectedValue(new PdfExtractionApiError(401, "로그인 필요"));
    await render();
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(state.rows).toEqual([]); expect(state.error).toContain("로그인이 만료"); expect(state.loading).toBe(false);
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(4);
  });
  it("새로고침하면 변경된 판정을 반영하고 미처리 PDF는 번호 없음과 구분한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValue({ ...job(), status: "QUEUED", result: null });
    await render(); expect(state.rows[0].contact.status).toBe("PROCESSING");
    expect(state.rows[0].email.status).toBe("PROCESSING");
    vi.mocked(fetchPdfReview).mockResolvedValue(review([entry("1", "HOLD")]));
    await act(async () => state.refresh());
    expect(state.rows).toEqual([]); expect(state.loading).toBe(false);
  });
  it("심사함 전환 뒤 도착한 이전 명단은 버린다", async () => {
    let resolve!: (value: ReviewDetail) => void;
    vi.mocked(fetchPdfReview).mockImplementationOnce(() => new Promise(done => { resolve = done; })).mockResolvedValue(review([entry("new")]));
    await render(); reviewId = "another"; await render();
    await act(async () => resolve(review([entry("old")])));
    expect(state.rows.map(row => row.entry.id)).toEqual(["new"]);
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(1);
  });
  it.each(["FAILED", "UPLOAD_EXPIRED"] as const)("%s는 번호 미확인과 구분한다", async status => {
    vi.mocked(fetchPdfExtraction).mockResolvedValue({ ...job(), status, result: null });
    await render();
    expect(state.rows[0].contact.status).toBe("EXTRACTION_FAILED");
    expect(state.rows[0].email.status).toBe("EXTRACTION_FAILED");
    expect(state.loading).toBe(false);
  });
  it("목록 실패는 합격자 0명으로 처리하지 않고 재시도로 회복한다", async () => {
    vi.mocked(fetchPdfReview).mockRejectedValueOnce(new Error("unavailable"));
    await render(); expect(state.error).toContain("불러오지 못했습니다");
    await act(async () => state.refresh());
    expect(state.rows).toHaveLength(1); expect(state.error).toBe("");
  });
});
