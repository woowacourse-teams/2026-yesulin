import { reportError } from "@/features/monitoring/report-error";
export function reportPdfError(cause: unknown, operation: string) {
  if (cause instanceof Error && ["AbortError", "RenderingCancelledException"].includes(cause.name)) return;
  if (typeof cause === "object" && cause !== null && "status" in cause && typeof cause.status === "number" && cause.status >= 400 && cause.status < 500) return;
  reportError(new Error("PDF display failed"), { feature: "pdf_viewer", operation });
}
