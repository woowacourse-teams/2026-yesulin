import { notFound } from "next/navigation";
import { PdfExtractionWorkbench } from "@/components/pdf-extractions/pdf-extraction-workbench";

export default function LocalPdfExtractionsPage() {
  if (process.env.PDF_EXTRACTION_LOCAL !== "true" || process.env.VERCEL) notFound();
  return <PdfExtractionWorkbench local />;
}
