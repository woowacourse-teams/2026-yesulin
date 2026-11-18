"use client";
import type { Applicant } from "@/features/pdf-reviews/screening-types";
import { applicantListLabel } from "@/features/pdf-reviews/applicant-list-label";
import { StatusBadge } from "@/components/auditions/status-badge";
import { Spinner } from "../loading-status";
import { useBoard } from "./board-context";

export function ApplicantCards({ rows }: { readonly rows: readonly Applicant[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(applicant => <ApplicantCard key={applicant.id} applicant={applicant} />)}</div>;
}

function cardTone(selected: boolean) {
  if (selected) return "border-brand ring-1 ring-brand";
  return "border-border hover:border-brand-line hover:shadow-sm";
}

function ApplicantCard({ applicant }: { readonly applicant: Applicant }) {
  const { selected, toggleSelected, openApplicant } = useBoard();
  const label = applicantListLabel(applicant);
  const checked = selected.has(applicant.id);
  return <article className={`flex min-w-0 flex-col rounded-card border bg-card transition-[border-color,box-shadow] ${cardTone(checked)}`}>
    <div className="flex items-start gap-3 p-4 pb-3">
      <label className="-m-2 grid h-11 w-11 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" checked={checked} onChange={() => toggleSelected(applicant.id)} className="h-5 w-5 accent-brand" />
        <span className="sr-only">{label.filename} 선택</span>
      </label>
      <PdfMark />
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 break-all text-sm font-semibold leading-5" title={label.filename}>{label.filename}</h3>
        <ApplicantMeta name={label.name} role={label.role} uploading={label.uploading} />
      </div>
      <StatusBadge status={applicant.review.status} size="sm" />
    </div>
    {applicant.review.note && <p className="mx-4 line-clamp-2 whitespace-pre-wrap break-words rounded-control bg-surface px-3 py-2 text-xs text-muted-strong">{applicant.review.note}</p>}
    <button type="button" onClick={() => openApplicant(applicant.id)}
      className="mt-auto flex min-h-11 items-center justify-between border-t border-border-soft px-4 text-sm font-semibold text-brand hover:bg-brand-soft">
      원본으로 심사하기<span aria-hidden="true">→</span>
    </button>
  </article>;
}

function PdfMark() {
  return <span aria-hidden="true" className="grid h-9 w-8 shrink-0 place-items-center rounded-md border border-border bg-surface text-[10px] font-bold text-muted-strong">PDF</span>;
}

function ApplicantMeta({ name, role, uploading }: { readonly name: string; readonly role: string; readonly uploading: boolean }) {
  if (uploading) return <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-strong"><Spinner size="sm" />업로드 중</p>;
  if (!name && !role) return null;
  return <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-strong">
    {name && <span className="font-medium text-foreground">{name}</span>}
    {role && <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand">{role}</span>}
  </p>;
}
