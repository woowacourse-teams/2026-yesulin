// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observeReviewProgress, updatePdfReviewEntry } from "./api";
import type { ReviewDetail } from "./types";
const capture = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: capture }));
vi.mock("../csrf", () => ({ withCsrfHeaders: async (headers: unknown) => headers }));
beforeEach(() => capture.mockClear());
afterEach(() => vi.unstubAllGlobals());
describe("심사 지표 v2", () => {
  it("보류는 저장 수에만 포함하고 원문/판정 내용은 보내지 않는다", () => {
    const detail = { id: "review", title: "private title", createdAt: "2026-10-31", roles: [], entries: ['PASS','FAIL','HOLD','PENDING'].map((decision, id) => ({id, jobId: String(id), decision, memo: 'private memo', originalFilename: '', applicantName: null, roleId: null, matchStatus: 'WAITING', matchEvidence: null})) } as ReviewDetail;
    observeReviewProgress(detail);
    expect(capture).toHaveBeenCalledWith('review_progress_v2', { metric_version: 2, workflow: 'producer_pdf', review_id: 'review', total_count: 4, completed_count: 3, held_count: 1, final_count: 2, pending_count: 1 });
    expect(JSON.stringify(capture.mock.calls)).not.toContain('private');
  });
  it.each([[500, 'server'], [401, 'unauthorized'], [403, 'forbidden'], [404, 'not_found'], [400, 'invalid_input']])("HTTP %s도 같은 시도 ID의 실패로 연결한다", async (status, code) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: Number(status) })));
    await expect(updatePdfReviewEntry('review','entry',{memo:'private',decision:'HOLD'})).rejects.toThrow();
    expect(capture.mock.calls.map(c=>c[0])).toEqual(['review_save_attempted','review_save_result']);
    const attempted=capture.mock.calls[0][1]; const result=capture.mock.calls[1][1];
    expect(result).toMatchObject({operation_id:attempted.operation_id,outcome:'failure',error_code:code,save_kind:'decision'});
    expect(JSON.stringify(capture.mock.calls)).not.toContain('private');
  });
  it("메모 성공과 판정 저장을 구분하고 네트워크 오류도 기록한다", async () => {
    const fetch=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({decision:'PENDING'}))).mockRejectedValueOnce(new TypeError('private url'));
    vi.stubGlobal('fetch',fetch);
    await updatePdfReviewEntry('r','i',{memo:'private',decision:'PENDING'},'memo');
    expect(capture).toHaveBeenCalledWith('review_save_result',expect.objectContaining({save_kind:'memo',outcome:'success'}));
    await expect(updatePdfReviewEntry('r','i',{memo:'',decision:'PASS'})).rejects.toThrow();
    expect(capture).toHaveBeenCalledWith('review_save_result',expect.objectContaining({outcome:'failure',error_code:'network'}));
  });
});
