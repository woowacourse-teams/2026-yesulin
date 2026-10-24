import { withCsrfHeaders } from "../csrf";
import { readErrorDetail, readErrorMessage } from "../api-error";
import type { PreparedPdfUpload } from "../pdf-extractions/types";
import type { ReviewDecision, ReviewDetail, ReviewEntry, ReviewKey, ReviewSummary } from "./types";

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
    ...(method === "GET" ? {} : { headers: await withCsrfHeaders(body === undefined ? {} : { "Content-Type": "application/json" }) }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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

export function fetchPdfReview(id: ReviewKey, signal?: AbortSignal) {
  return request<ReviewDetail>(reviewPath(id), "GET", undefined, signal);
}

export function preparePdfReviewUpload(reviewId: ReviewKey, file: File) {
  return request<PreparedPdfUpload>(`${reviewPath(reviewId)}/uploads`, "POST", { originalFilename: file.name, size: file.size });
}

export function updatePdfReviewEntry(reviewId: ReviewKey, entryId: ReviewKey, change: { readonly memo: string; readonly decision: ReviewDecision }) {
  return request<ReviewEntry>(`${reviewPath(reviewId)}/entries/${encodeURIComponent(String(entryId))}`, "PATCH", change);
}

export function reanalyzePdfReviewEntry(reviewId: ReviewKey, entryId: ReviewKey) {
  return request<ReviewEntry>(`${reviewPath(reviewId)}/entries/${encodeURIComponent(String(entryId))}/analysis`, "POST");
}
