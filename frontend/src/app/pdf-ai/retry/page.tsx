import { Suspense } from "react";
import { PdfAiRetryPanel } from "@/components/pdf-extractions/pdf-ai-retry-panel";

export const metadata = {
  title: "지원자 재분석",
  robots: { index: false, follow: false },
};

export default function PdfAiRetryPage() {
  return <Suspense fallback={<p role="status" className="p-6">재분석 요청을 확인하고 있습니다…</p>}>
    <PdfAiRetryPanel />
  </Suspense>;
}
