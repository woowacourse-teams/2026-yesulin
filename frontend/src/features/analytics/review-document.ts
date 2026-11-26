import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { reviewDocumentFormat, reviewPreviewStatus } from "./posthog-contract";
import { trackProductEvent } from "./product-analytics";

type DocumentObservation = Pick<PdfExtractionJob, "jobId" | "extension" | "previewStatus" | "uploadedAt" | "status">;

function properties(reviewId: string, job: DocumentObservation) {
  if (!job.uploadedAt || job.status === "UPLOAD_EXPIRED") return;
  const format = reviewDocumentFormat(job.extension);
  const status = reviewPreviewStatus(job.previewStatus);
  if (!format || !status) return;
  return {
    metric_version: 1, workflow: "producer_pdf" as const, review_id: reviewId,
    operation_id: job.jobId, document_format: format, preview_status: status,
  };
}

export function observeReviewDocumentPreview(reviewId: string, job: DocumentObservation) {
  const data = properties(reviewId, job);
  if (data) return trackProductEvent("review_document_preview_observed", data, `review-document-first:${reviewId}:${job.jobId}`);
}

export function trackReviewDocumentDownload(reviewId: string, job: DocumentObservation) {
  const data = properties(reviewId, job);
  if (data) return trackProductEvent("review_document_original_download_requested", data);
}
