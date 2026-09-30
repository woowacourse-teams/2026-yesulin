import { beforeEach, describe, expect, it, vi } from "vitest";
import { noticeApi, noticeHistoryError, type NoticeCommand } from "./notice-api";
import { AuditionRequestError, producerRequest } from "./api-client";

vi.mock("./api-client", async importOriginal => ({ ...await importOriginal<typeof import("./api-client")>(), producerRequest: vi.fn() }));

describe("안내 문자 API 계약", () => {
  const command: NoticeCommand = { targetStageId: 42, template: "{이름} {오디션일시}", recipients: [{ submissionId: "submission-uuid", appointment: "2026-10-01T14:30" }] };
  beforeEach(() => vi.mocked(producerRequest).mockReset());

  it("OTR은 공고 UUID와 배역 순번으로 모든 문자 요청을 보낸다", async () => {
    const api = noticeApi("999", 1, { kind: "OTR", auditionId: "otr-public-uuid", roleOrder: 2 });
    await api.metadata();
    await api.history();
    await api.preview(command);
    await api.send(command, "token", "key");
    await api.detail("batch");
    await api.retryPreview("batch", ["delivery"]);
    await api.retry("batch", ["delivery"], "token", "retry-key");
    await api.draft();
    await api.saveDraft(command, 0);
    const paths = vi.mocked(producerRequest).mock.calls.map(([path]) => path);
    expect(paths).toEqual(["sms-settings", "sms-batches", "sms-previews", "sms-batches",
      "sms-batches/batch", "sms-batches/batch/retry-preview", "sms-batches/batch/retries", "sms-draft", "sms-draft"]
      .map(suffix => `/v1/otr-auditions/otr-public-uuid/roles/2/screening-rounds/1/${suffix}`));
  });

  it("빈 내역은 성공 응답이고 권한·없는 공고·통신 오류는 별도로 안내한다", async () => {
    vi.mocked(producerRequest).mockResolvedValueOnce([]);
    expect(await noticeApi("1", 1).history()).toEqual([]);
    expect(noticeHistoryError(new AuditionRequestError("", 403, "test"))).toContain("권한이 없습니다");
    expect(noticeHistoryError(new AuditionRequestError("", 404, "test"))).toContain("찾을 수 없거나");
    expect(noticeHistoryError(new Error("network"))).toContain("불러오지 못했습니다");
  });

  it("서버에서 이름·전화번호를 조회하도록 ID와 일시만 보낸다", async () => {
    await noticeApi("7", 1).preview(command);
    expect(producerRequest).toHaveBeenCalledWith("/v1/audition-roles/7/screening-rounds/1/sms-previews", { method: "POST", body: JSON.stringify(command) });
    expect(JSON.parse(vi.mocked(producerRequest).mock.calls[0][1]!.body as string).recipients[0]).not.toHaveProperty("phone");
  });

  it("재요청에서 호출자가 보관한 동일한 멱등 키와 미리보기 토큰을 보낸다", async () => {
    const api = noticeApi("7", 2);
    await api.send(command, "preview-token", "same-key");
    await api.send(command, "preview-token", "same-key");
    for (const [, init] of vi.mocked(producerRequest).mock.calls) {
      expect(init?.headers).toEqual({ "Idempotency-Key": "same-key" });
      expect(JSON.parse(init!.body as string).previewToken).toBe("preview-token");
    }
  });

  it("초안 버전과 확정 실패 재발송 대상 ID를 별도 계약으로 전달한다", async () => {
    const api = noticeApi("7", 1);
    await api.saveDraft(command, 3);
    expect(producerRequest).toHaveBeenLastCalledWith(expect.stringContaining("sms-draft"), { method: "PUT", body: JSON.stringify({ command, version: 3 }) });
    await api.retry("batch-id", ["delivery-id"], "token", "retry-key");
    expect(producerRequest).toHaveBeenLastCalledWith(expect.stringContaining("sms-batches/batch-id/retries"), { method: "POST", body: JSON.stringify({ deliveryIds: ["delivery-id"], previewToken: "token" }), headers: { "Idempotency-Key": "retry-key" } });
  });
});
