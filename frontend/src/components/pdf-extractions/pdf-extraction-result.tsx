"use client";

import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { pdfStatusLabels } from "@/features/pdf-extractions/types";
import { PdfOriginalViewer } from "./pdf-original-viewer";

export function PdfExtractionResultPanel({ job }: { readonly job: PdfExtractionJob }) {
  const result = job.result;
  return <section aria-label="선택한 PDF 결과" className="min-w-0 rounded-card border border-border bg-card p-5 md:p-7">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="min-w-0 break-all text-lg font-bold">{job.originalFilename}</h2>
      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">{pdfStatusLabels[job.status]}</span>
    </div>
    <details className="my-5 rounded-control bg-surface p-4 text-xs">
      <summary className="cursor-pointer font-semibold">파일 키와 원본 해시</summary>
      <p className="mt-3 font-semibold">원본 fileKey</p><code className="block break-all">{job.sourceFileKey}</code>
      <p className="mt-3 font-semibold">결과 fileKey</p><code className="block break-all">{job.resultFileKey}</code>
      {result?.sourceSha256 ? <><p className="mt-3 font-semibold">SHA-256</p><code className="block break-all">{result.sourceSha256}</code></> : null}
    </details>
    {job.sourceUrl ? <div className="mb-6">
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">원본 PDF</h3><a href={job.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">새 창에서 보기</a></div>
      <PdfOriginalViewer key={job.jobId} url={job.sourceUrl} filename={job.originalFilename} />
    </div> : null}
    {result ? <>
      {result.applicantInfo && result.applicantInfo.reason !== "NO_REVIEW" ? <div role="status" className="mb-5 rounded-control bg-surface p-4 text-sm leading-6">
        <p className="font-semibold">{result.applicantInfo.status === "COMPLETED" ? "AI 지원 정보 정리 완료"
          : result.applicantInfo.status === "FAILED" ? "AI 지원 정보 정리 실패" : "AI 지원 정보 정리 생략"}</p>
        <p className="mt-1 text-muted-strong">{result.applicantInfo.status === "COMPLETED"
          ? "지원서 원문을 바탕으로 정리했습니다. 이름과 지원 배역의 근거를 확인한 뒤 심사해 주세요."
          : result.applicantInfo.reason === "NO_TEXT" ? "읽을 수 있는 문자가 없어 정리하지 못했습니다. 원본 PDF를 확인해 주세요."
          : result.applicantInfo.reason === "TEXT_LIMIT_EXCEEDED" ? "텍스트가 처리 한도를 넘어 정리하지 못했습니다. 원본 PDF를 확인해 주세요."
          : "원본 PDF와 추출 결과는 확인할 수 있습니다. 지원 정보는 직접 확인해 주세요."}</p>
      </div> : null}
      {result.errorCode ? <p role="alert" className="my-4 break-all rounded-control bg-fail-bg p-4 text-sm text-fail">추출을 완료하지 못했습니다. ({result.errorCode}) 원본 파일을 확인해 주세요.</p> : null}
      {result.warnings.length ? <div className="mb-5 rounded-control bg-surface p-4 text-sm"><p className="font-semibold">확인이 필요한 항목</p><ul className="mt-2 list-inside list-disc">{result.warnings.map((warning, i) => <li key={i} className="break-all">{warning}</li>)}</ul></div> : null}
      <h3 className="mb-3 font-semibold">추출 텍스트 · {result.pages.length}쪽</h3>
      {result.pages.map(page => <div key={page.number} className="mb-5 rounded-control border border-border p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3"><h4 className="text-sm font-semibold">{page.number}쪽</h4>{page.needsOcr ? <span className="rounded-full bg-surface px-3 py-1 text-xs text-muted-strong">텍스트 없음 · OCR 필요 가능성</span> : null}</div>
        <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7">{page.text || "텍스트가 추출되지 않았습니다. 이번 기능에는 OCR이 포함되지 않습니다."}</pre>
        {page.images.length ? <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{page.images.map((image, i) => <figure key={image.fileKey} className="min-w-0 rounded-control bg-surface p-3">
          {/* 추출 PNG는 원본 비율을 유지하고 브라우저에서 필요할 때만 읽는다. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt={`${page.number}쪽에서 추출한 이미지 ${i + 1}`} loading="lazy" referrerPolicy="no-referrer" className="h-60 w-full object-contain" />
          <figcaption className="mt-2 text-xs text-muted-strong">이미지 {i + 1} · 인물/로고 미분류<details className="mt-2"><summary className="cursor-pointer">fileKey 보기</summary><code className="block break-all pt-2">{image.fileKey}</code></details></figcaption>
        </figure>)}</div> : null}
      </div>)}
    </> : <p role="status" className="rounded-control bg-surface p-4 text-sm text-muted-strong">{job.status === "UPLOAD_EXPIRED" || job.status === "UPLOADING" ? "업로드 완료가 확인되지 않았습니다. 파일을 다시 선택해 주세요." : job.status === "DELAYED" ? "처리가 지연되고 있습니다. 실패로 확정된 것은 아니며 상태를 계속 확인합니다." : "업로드한 PDF의 추출 결과를 기다리고 있습니다."}</p>}
  </section>;
}
