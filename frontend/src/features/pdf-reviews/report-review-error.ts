import { reportError } from "@/features/monitoring/report-error";
export function reportReviewError(cause: unknown, operation: string) {
  let status: number | undefined;
  if (typeof cause === "object" && cause !== null && "status" in cause && typeof cause.status === "number") status = cause.status;
  if (status !== undefined && status >= 400 && status < 500) return;
  if (cause instanceof Error && cause.name === "AbortError") return;
  reportError(new Error("PDF review request failed"), { feature: "pdf_review", operation, status });
}
