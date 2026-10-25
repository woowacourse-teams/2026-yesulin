import { notFound } from "next/navigation";
import { PdfReviewWorkbench } from "@/components/pdf-reviews/pdf-review-workbench";

export default function LocalPdfReviewsPage() {
  if (process.env.PDF_EXTRACTION_LOCAL !== "true" || process.env.VERCEL) notFound();
  return <Suspense fallback={<p role="status" className="p-6">심사함을 불러오는 중입니다…</p>}><PdfReviewWorkbench local /></Suspense>;
}
import { Suspense } from "react";
