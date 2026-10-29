import { PdfReviewWorkbench } from "@/components/pdf-reviews/pdf-review-workbench";

export default function PdfReviewsPage() {
  return <Suspense fallback={<p role="status" className="p-6">심사함을 불러오는 중입니다…</p>}><PdfReviewWorkbench /></Suspense>;
}
import { Suspense } from "react";
