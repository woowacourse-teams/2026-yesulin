"use client";

import { trackProductEvent } from "./product-analytics";
import type { ProductProperties } from "./posthog-contract";

const seen = new Set<string>();
const applied = new Map<string, string>();
const reviews = new Map<string, string>();

export function registerPdfReviewJob(jobId: string, reviewId: string) { reviews.set(jobId, reviewId); }

export function observePdfExtraction(job: import("@/features/pdf-extractions/types").PdfExtractionJob) {
  const reviewId = reviews.get(job.jobId);
  if (!reviewId || !["COMPLETED", "PARTIAL", "FAILED", "UPLOAD_EXPIRED"].includes(job.status)) return;
  const profile = job.result?.applicantInfo?.profile;
  void trackPdfStep({ workflow: "producer_pdf", review_id: reviewId, operation_id: job.jobId, step: "extract",
    outcome: job.status === "FAILED" || job.status === "UPLOAD_EXPIRED" ? "failure" : "success",
    extraction_status: job.status,
    duration_ms: Math.max(0, Date.now() - Date.parse(job.uploadedAt ?? job.createdAt)),
    ...(job.result ? { missing_field_count: profile ? [profile.birthDate, profile.height, profile.education].filter(f => !f.value).length : 3 } : {}),
  }, true);
}

/** 추출 결과 재조회는 새 완료가 아니다. 원문·파일명·추출 내용은 받지 않는다. */
export async function trackPdfStep(properties: ProductProperties, deduplicate = false) {
  const key = `yesulin:pdf-metric:${properties.workflow}:${properties.operation_id}:${properties.step}:${properties.outcome}`;
  if (deduplicate) {
    if (seen.has(key)) return;
    try { if (sessionStorage.getItem(key)) return; } catch { /* optional storage */ }
    seen.add(key);
  }
  const sent = await trackProductEvent(properties.outcome === "failure" ? "pdf_step_failed" : "pdf_step_completed", properties);
  if (deduplicate && sent) {
    try { sessionStorage.setItem(key, "1"); } catch { /* optional storage */ }
  } else if (!sent) seen.delete(key);
}

export function markPdfApplied(jobId: string) {
  applied.set("actor_pdf", jobId);
  void trackPdfStep({ workflow: "actor_pdf", operation_id: jobId, step: "apply", outcome: "success" });
}

export function trackPdfProfileSaved() {
  const jobId = applied.get("actor_pdf");
  if (!jobId) return;
  void trackPdfStep({ workflow: "actor_pdf", operation_id: jobId, step: "save", outcome: "success" });
  applied.delete("actor_pdf");
}

export function clearPdfApplied() { applied.clear(); }
