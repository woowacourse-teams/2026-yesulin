import type { Applicant } from "@/features/pdf-reviews/screening-types";

export function PdfPreparationStatus({ document }: { readonly document: Applicant["sourceDocument"] }) {
  if (!document) return null;
  return <span className="inline-flex items-center gap-2" role={document.processing ? "status" : undefined}>
    {document.processing && <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand/25 border-t-brand motion-reduce:animate-none" />}
    {document.preparation}
  </span>;
}
