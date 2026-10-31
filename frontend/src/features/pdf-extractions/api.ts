import { observePdfExtraction } from "@/features/analytics/pdf-analytics";
import { withCsrfHeaders } from "../csrf";
import { readErrorDetail, readErrorMessage } from "../api-error";
import type { PdfExtractionJob, PreparedPdfUpload } from "./types";

const BASE = "/api/v1/pdf-extractions";

export class PdfExtractionApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

async function json<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(BASE + path, {
    method: body === undefined ? "GET" : "POST", credentials: "include", cache: "no-store", signal,
    ...(body === undefined ? {} : {
      headers: await withCsrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(body),
    }),
  });
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const fallback = response.status === 404 ? "PDF 추출 기능을 사용할 수 없습니다. 서버 설정을 확인해 주세요." : "PDF 처리 상태를 확인하지 못했습니다.";
    throw new PdfExtractionApiError(response.status, data ? readErrorMessage(data, readErrorDetail(data)) : fallback);
  }
  return response.json() as Promise<T>;
}

export async function listPdfExtractions() {
  return (await json<{ jobs: PdfExtractionJob[] }>("")).jobs;
}

export function preparePdfUpload(file: File) {
  return json<PreparedPdfUpload>("/uploads", { originalFilename: file.name, size: file.size });
}

export function completePdfUpload(jobId: string) {
  return json<PdfExtractionJob>(`/${encodeURIComponent(jobId)}/completion`, {});
}

export async function fetchPdfExtraction(jobId: string, includeResult = false, signal?: AbortSignal) {
  const job = await json<PdfExtractionJob>(`/${encodeURIComponent(jobId)}?includeResult=${includeResult}`, undefined, signal);
  if (!signal?.aborted) observePdfExtraction(job);
  return job;
}

export type PdfAiRetryParameters = {
  readonly failedAttempts: number;
  readonly failedAt: number;
  readonly generation: number;
};

export function retryPdfAnalysis(jobId: string, parameters: PdfAiRetryParameters) {
  return json<{ status: "QUEUED" | "ALREADY_PROCESSING"; message: string }>(
    `/${encodeURIComponent(jobId)}/ai-retry`, parameters,
  );
}

/** 읽기/업로드 메모리는 이 함수가 실행되는 파일에만 할당한다. 전체 선택 파일을 한꺼번에 읽지 않는다. */
export async function putPdf(file: File, target: PreparedPdfUpload["upload"]) {
  const buffer = await file.arrayBuffer();
  const body = new Blob([buffer], { type: "application/pdf" });
  if (body.size !== file.size) throw new Error("파일을 읽지 못했습니다. 다시 선택해 주세요.");
  const response = await fetch(target.url, {
    method: target.method, headers: target.headers, body, signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok && response.status !== 412) throw new Error(`파일 업로드가 거절되었습니다. (${response.status})`);
  // 같은 작업의 PUT 재시도라면 이미 존재하는 객체를 덮어쓰지 않고 completion에서 검사한다.
}
