import { latestCareers, type DisplayCareerSource } from "@/features/pdf-reviews/career-display";
export function PdfCareerList({ careers }: { careers: readonly DisplayCareerSource[] }) {
  const visible = latestCareers(careers);
  return <>
    {careers.length > 5 && <p className="mb-3 text-xs leading-5 text-muted">전체 {careers.length}건 중 최근 5건 · 전체 경력은 원본 PDF에서 확인해 주세요.</p>}
    <ul aria-label="지원자 경력" className="divide-y divide-border-soft">
      {visible.map((career, index) => <li key={`${index}-${career.sourceText}`} className="break-words py-3 first:pt-0 last:pb-0">
        <p className="text-sm font-bold leading-6 text-foreground">{career.title}</p>
        {(career.detail || career.genre) && <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5">
          {career.detail && <span className="font-medium text-foreground">{career.detail}</span>}
          {career.genre && <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-muted-strong">{career.genre}</span>}
        </p>}
        <p className="mt-1 text-xs leading-5 text-muted-strong"><span className="num" title={career.rawPeriod}>{career.period}</span>{career.company && <><span className="mx-1.5" aria-hidden="true">·</span>{career.company}</>}</p>
      </li>)}
    </ul>
  </>;
}
