import { notFound } from "next/navigation";
import { PdfReviewWorkbench } from "@/components/pdf-reviews/pdf-review-workbench";

export default function LocalPdfReviewsPage() {
  if (process.env.PDF_EXTRACTION_LOCAL !== "true" || process.env.VERCEL) notFound();
  return <PdfReviewWorkbench local />;
}
