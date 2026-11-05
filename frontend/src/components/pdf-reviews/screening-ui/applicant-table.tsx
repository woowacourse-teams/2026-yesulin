"use client";
import type { Applicant } from "@/features/pdf-reviews/screening-types";
import { StatusBadge } from "@/components/auditions/status-badge";
import { SecondaryButton } from "@/components/ui/controls";
import { useBoard } from "./board-context";
export function ApplicantTable({ rows }: { readonly rows: readonly Applicant[] }) {
  const { selected, toggleSelected, openApplicant } = useBoard();
  return <div className="overflow-x-auto rounded-card border border-border bg-card"><table className="w-full min-w-[600px] text-left text-sm"><caption className="sr-only">PDF 지원서 심사 목록</caption>
    <thead className="border-b border-border bg-surface"><tr>{['선택','지원서','배역','심사 상태','내부 메모','원본'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-border-soft">{rows.map(applicant => <tr key={applicant.id}>
      <td className="px-4 py-3"><label className="inline-flex min-h-11 min-w-11 items-center justify-center"><input type="checkbox" aria-label={`${applicant.name} 선택`} checked={selected.has(applicant.id)} onChange={() => toggleSelected(applicant.id)} className="h-5 w-5 accent-brand" /></label></td>
      <th scope="row" className="max-w-80 break-all px-4 py-3 font-semibold">{applicant.name}</th><td className="px-4 py-3">{applicant.roleName}</td><td className="px-4 py-3"><StatusBadge status={applicant.review.status} size="sm" /></td>
      <td className="max-w-64 px-4 py-3"><p className="line-clamp-2 whitespace-pre-wrap break-words">{applicant.review.note || '—'}</p></td><td className="px-4 py-3"><SecondaryButton onClick={() => openApplicant(applicant.id)}>PDF 심사</SecondaryButton></td>
    </tr>)}</tbody>
  </table></div>;
}
