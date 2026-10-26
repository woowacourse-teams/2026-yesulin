import { latestCareers, type DisplayCareerSource } from "@/features/pdf-reviews/career-display";

export function PdfCareerList({ careers }: { careers: readonly DisplayCareerSource[] }) {
  const visible = latestCareers(careers);
  return <>
    {careers.length > 5 && <p className="mb-3 text-sm leading-6 text-muted">전체 {careers.length}건 중 최근 5건 · 전체 경력은 원본 PDF에서 확인해 주세요.</p>}
    <div className="min-w-0 overflow-x-auto rounded-control border border-border" tabIndex={0} role="region" aria-label="지원자 경력 표">
      <table className="w-full table-fixed border-collapse text-left text-sm leading-6">
        <caption className="sr-only">지원자 경력</caption>
        <thead className="bg-surface text-muted-strong"><tr><th scope="col" className="w-[28%] px-3 py-2 font-medium">기간</th><th scope="col" className="px-3 py-2 font-medium">작품 · 활동</th><th scope="col" className="w-[24%] px-3 py-2 font-medium">역할</th></tr></thead>
        <tbody className="divide-y divide-border">{visible.map((career, index) => <tr key={`${index}-${career.sourceText}`} className="align-top">
          <td className="num break-words px-3 py-3 text-muted-strong" title={career.rawPeriod}>{career.period}</td>
          <td className="break-words px-3 py-3"><p>{career.title}</p>{(career.genre || career.company) && <p className="text-muted-strong">{[career.genre, career.company].filter(Boolean).join(" · ")}</p>}</td>
          <td className="break-words px-3 py-3">{career.detail || "—"}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
