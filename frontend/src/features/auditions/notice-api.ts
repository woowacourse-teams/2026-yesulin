import { AuditionRequestError, producerRequest } from "./api-client";
import type { ScreeningSource } from "./screening-source";

export type NoticeCommand = {
  targetStageId: number | null;
  template: string;
  recipients: { submissionId: string; appointment: string | null }[];
};
export type NoticeMetadata = {
  enabled: boolean; sender: string; footer: string; messageHeader: string; targetStageId: number | null;
  targetName: string; targetDate: string | null; requestLimit: number;
  candidates: { submissionId: string; name: string | null; phone: string | null }[];
};
export type NoticePreview = {
  recipients: { submissionId: string; name: string | null; phone: string | null; appointment: string | null;
    body: string | null; type: string | null; bytes: number; price: number | null; error: string | null }[];
  warnings: string[]; total: number | null; sender: string; token: string; sendable: boolean;
};
export type NoticeBatch = { id: string; createdAt: string; count: number; estimatedCost: number; retryOf: string | null };
export type NoticeHistoryItem = { batch: NoticeBatch; firstRecipientName: string | null; retainedCount: number;
  deliveredCount: number; failedCount: number; pendingCount: number; unknownCount: number; messageType: string | null };
export type NoticeDetail = { batch: NoticeBatch; deliveries: { id: string; name: string; phone: string; body: string;
  status: string; code: string | null; providerId: string | null; appointment: string }[] };
export type NoticeDraft = { version: number; command: NoticeCommand | null };

export function noticeHistoryError(cause: unknown): string {
  if (cause instanceof AuditionRequestError) {
    if (cause.status === 401) return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    if (cause.status === 403) return "발송 내역을 조회할 권한이 없습니다.";
    if (cause.status === 404) return "공고·배역 또는 발송 내역을 찾을 수 없거나 접근 권한이 없습니다.";
  }
  return "발송 내역을 불러오지 못했습니다. 자동으로 다시 확인합니다.";
}

export function noticeApi(roleId: string, round: number, source: ScreeningSource = { kind: "STANDARD" }) {
  const base = source.kind === "OTR"
    ? `/v1/otr-auditions/${encodeURIComponent(source.auditionId)}/roles/${source.roleOrder}/screening-rounds/${round}`
    : `/v1/audition-roles/${roleId}/screening-rounds/${round}`;
  const get = <T>(path: string) => producerRequest<T>(`${base}/${path}`, { cache: "no-store" });
  const write = <T>(path: string, body: unknown, method = "POST", key?: string) => producerRequest<T>(`${base}/${path}`, {
    method, body: JSON.stringify(body), ...(key ? { headers: { "Idempotency-Key": key } } : {}),
  });
  return {
    metadata: () => get<NoticeMetadata>("sms-settings"),
    draft: () => get<NoticeDraft>("sms-draft"),
    saveDraft: (command: NoticeCommand, version: number) => write<NoticeDraft>("sms-draft", { command, version }, "PUT"),
    preview: (command: NoticeCommand) => write<NoticePreview>("sms-previews", command),
    send: (command: NoticeCommand, previewToken: string, key: string) => write<NoticeBatch>("sms-batches", { command, previewToken }, "POST", key),
    history: () => get<NoticeHistoryItem[]>("sms-batches"),
    detail: (id: string) => get<NoticeDetail>(`sms-batches/${id}`),
    retryPreview: (id: string, deliveryIds: string[]) => write<NoticePreview>(`sms-batches/${id}/retry-preview`, { deliveryIds }),
    retry: (id: string, deliveryIds: string[], previewToken: string, key: string) => write<NoticeBatch>(`sms-batches/${id}/retries`, { deliveryIds, previewToken }, "POST", key),
  };
}

export const NOTICE_STATUS: Record<string, string> = {
  QUEUED: "발송 대기", SENDING: "업체에 요청 중", ACCEPTED: "업체 접수 · 전달 확인 중",
  DELIVERED: "전달 완료", FAILED: "확정 실패", UNKNOWN: "결과 확인 필요 · 자동 재발송 안 함",
};
