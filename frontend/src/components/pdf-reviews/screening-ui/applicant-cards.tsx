"use client";
import type { Applicant } from "@/features/pdf-reviews/screening-types";
import { StatusBadge } from "@/components/auditions/status-badge";
import { useBoard } from "./board-context";
export function ApplicantCards({ rows }: { readonly rows: readonly Applicant[] }) {
  const { selected, toggleSelected, openApplicant } = useBoard();
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(applicant => <article key={applicant.id} className={`min-w-0 rounded-card border bg-card p-4 ${selected.has(applicant.id) ? 'border-brand' : 'border-border'}`}>
    <div className="mb-4 flex items-center justify-between gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={selected.has(applicant.id)} onChange={() => toggleSelected(applicant.id)} className="h-5 w-5 accent-brand" /><span className="sr-only">{applicant.sourceDocument?.filename || applicant.name} 선택</span><span aria-hidden="true" className="font-semibold text-muted-strong">PDF 지원서</span></label><StatusBadge status={applicant.review.status} size="sm" /></div>
    <button type="button" onClick={() => openApplicant(applicant.id)} className="block min-h-28 w-full text-left"><h3 className="break-all font-semibold">{applicant.sourceDocument?.filename || applicant.name}</h3><p className="mt-2 text-sm text-muted-strong">{applicant.roleName}</p><span className="mt-4 inline-block text-sm font-semibold text-brand">원본으로 심사하기 →</span></button>
    {applicant.review.note && <p className="mt-3 line-clamp-2 whitespace-pre-wrap break-words border-t border-border pt-3 text-sm text-muted-strong">{applicant.review.note}</p>}
  </article>)}</div>;
}
