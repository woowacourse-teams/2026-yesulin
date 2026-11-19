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
  return <article className={`relative flex min-w-0 flex-col rounded-card border bg-card transition-[border-color,box-shadow] ${cardTone(checked)}`}>
    <div className="flex items-start gap-3 p-4 pb-3">
      <label className="relative z-10 -m-2 grid h-11 w-11 shrink-0 cursor-pointer place-items-center">
        <input type="checkbox" checked={checked} onChange={() => toggleSelected(applicant.id)} className="h-5 w-5 accent-brand" />
        <span className="sr-only">{label.title} 선택</span>
      </label>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold leading-5"><button type="button" aria-label={`지원서 열기: ${label.title}`} onClick={() => openApplicant(applicant.id)}
          className="cursor-pointer text-left after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand">
          <span className="line-clamp-2 break-all whitespace-pre-wrap" title={label.title}>{label.title}</span>
        </button></h2>
        <ApplicantMeta role={label.role} uploading={label.uploading} />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={applicant.review.status} size="sm" />
        <MemoPresence note={applicant.review.note} />
      </div>
    </div>
    {applicant.review.note.trim() && <p className="mx-4 mb-4 line-clamp-2 whitespace-pre-wrap break-words rounded-control bg-surface px-3 py-2 text-xs text-muted-strong">{applicant.review.note}</p>}
  </article>;
}

function MemoPresence({ note }: { readonly note: string }) {
  if (note.trim()) return <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-pressed">메모 있음</span>;
  return <span className="px-2 py-0.5 text-xs text-muted">메모 없음</span>;
}

function ApplicantMeta({ role, uploading }: { readonly role: string; readonly uploading: boolean }) {
  if (uploading) return <p className="mt-1.5 flex items-center gap-2 text-xs text-muted-strong"><Spinner size="sm" />업로드 중</p>;
  if (!role) return null;
  return <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-strong">
    <span className="rounded-full bg-brand-soft px-2 py-0.5 font-semibold text-brand">{role}</span>
  </p>;
}
