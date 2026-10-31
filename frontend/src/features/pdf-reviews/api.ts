import { registerPdfReviewJob } from "@/features/analytics/pdf-analytics";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import { withCsrfHeaders } from "../csrf";
import { readErrorDetail, readErrorMessage } from "../api-error";
import type { PreparedPdfUpload } from "../pdf-extractions/types";
import type { ReviewDecision, ReviewDetail, ReviewEntry, ReviewKey, ReviewProgress, ReviewSummary } from "./types";

const BASE = "/api/v1/pdf-reviews";

export class PdfReviewApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

/** PDF 심사·추출 API 어느 쪽의 오류든 세션 만료만 가려낸다. */
export function isUnauthorized(cause: unknown) {
  return cause instanceof Error && "status" in cause && cause.status === 401;
}

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(BASE + path, {
    method, credentials: "include", cache: "no-store", signal,
    ...(body === undefined ? {} : {
      headers: await withCsrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body),
    }),
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const fallback = response.status === 401 ? "로그인이 필요합니다."
      : response.status === 404 ? "심사를 찾지 못했습니다. 목록을 새로고침해 주세요." : "심사 정보를 처리하지 못했습니다.";
    throw new PdfReviewApiError(response.status, data ? readErrorMessage(data, readErrorDetail(data)) : fallback);
  }
  return response.json() as Promise<T>;
}

const reviewPath = (id: ReviewKey) => `/${encodeURIComponent(String(id))}`;

export function createPdfReview(title: string, roles: readonly string[]) {
  return request<ReviewDetail>("", "POST", { title, roles });
}

export async function listPdfReviews(signal?: AbortSignal) {
  return (await request<{ reviews: ReviewSummary[] }>("", "GET", undefined, signal)).reviews;
}

export async function fetchPdfReview(id: ReviewKey, signal?: AbortSignal) {
  const detail = await request<ReviewDetail>(reviewPath(id), "GET", undefined, signal);
  detail.entries.forEach(entry => registerPdfReviewJob(entry.jobId, String(id)));

  return detail;
}

export function fetchPdfReviewProgress(id: ReviewKey, signal?: AbortSignal) {
  return request<ReviewProgress>(`${reviewPath(id)}/progress`, "GET", undefined, signal);
}

export type PreparedReviewUpload = Omit<PreparedPdfUpload, "upload"> & {
  readonly duplicate?: boolean;
  readonly upload: PreparedPdfUpload["upload"] | null;
};

export async function preparePdfReviewUpload(reviewId: ReviewKey, file: File) {
  const sha256 = await pdfSourceSha256(file);
  return request<PreparedReviewUpload>(`${reviewPath(reviewId)}/uploads`, "POST", {
    originalFilename: file.name, size: file.size, sha256,
  });
}

/** 내용으로 비교한다. 파일명·수정 시각은 원본의 동일성 근거가 아니다. 읽기는 업로드 워커 안에서만 한다. */
export async function pdfSourceSha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

export async function updatePdfReviewEntry(reviewId: ReviewKey, entryId: ReviewKey,
  change: { readonly memo: string; readonly decision: ReviewDecision }, saveKind: "decision" | "memo" = "decision") {
  const properties = { metric_version: 2, workflow: "producer_pdf" as const, review_id: String(reviewId),
    item_id: String(entryId), operation_id: crypto.randomUUID(), save_kind: saveKind };
  const started = performance.now();
  void trackProductEvent("review_save_attempted", properties);
  try {
    const entry = await request<ReviewEntry>(`${reviewPath(reviewId)}/entries/${encodeURIComponent(String(entryId))}`, "PATCH", change);
    void trackProductEvent("review_save_result", { ...properties, outcome: "success", duration_ms: Math.round(performance.now() - started) });
    void trackProductEvent("review_saved", { workflow: "producer_pdf", review_id: String(reviewId), item_id: String(entryId), eligible: entry.decision !== "PENDING" });
    return entry;
  } catch (cause) {
    const status = cause instanceof PdfReviewApiError ? cause.status : 0;
    const error_code = status === 401 ? "unauthorized" : status === 403 ? "forbidden" : status === 404 ? "not_found"
      : status >= 500 ? "server" : status >= 400 ? "invalid_input" : cause instanceof TypeError ? "network" : "unknown";
    void trackProductEvent("review_save_result", { ...properties, outcome: "failure", error_code, duration_ms: Math.round(performance.now() - started) });
    throw cause;
  }
}

export function observeReviewProgress(detail: ReviewDetail) {
  const properties = { workflow: "producer_pdf" as const, review_id: String(detail.id), total_count: detail.entries.length,
    completed_count: detail.entries.filter(e => e.decision !== "PENDING").length };
  // 기존 시계열은 의미를 유지한다. v2의 최종 판정/보류와 섞지 않는다.
  void trackProductEvent("review_progress", properties);
  void trackProductEvent("review_progress_v2", { ...properties, metric_version: 2,
    pending_count: detail.entries.filter(e => e.decision === "PENDING").length,
    held_count: detail.entries.filter(e => e.decision === "HOLD").length,
    final_count: detail.entries.filter(e => e.decision === "PASS" || e.decision === "FAIL").length });
}

export function assignPdfReviewRoles(reviewId: ReviewKey, entryIds: readonly ReviewKey[], roleId: ReviewKey | null) {
  return request<ReviewEntry[]>(`${reviewPath(reviewId)}/role-assignments`, "PATCH", { entryIds, roleId });
}
