"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApplicantSubmissions } from "@/features/applicants/api";
import { getApplicantApplicationDrafts } from "@/features/applicants/application-drafts";
import { formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantApplicationDraftSummary, ApplicantSelectedRole, ApplicantSubmissionSummary } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";

export function ApplicantSubmissionList() {
  const query = useAuditionQuery("applicant-submissions", getApplicantSubmissions, "지원서 목록을 불러오지 못했습니다.");
  const [drafts, setDrafts] = useState<readonly ApplicantApplicationDraftSummary[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(true);
  useEffect(() => {
    if (!query.data) return;
    let active = true;
    const submittedPostingIds = new Set(query.data.submissions.map((submission) => submission.postingId));
    getApplicantApplicationDrafts(submittedPostingIds).then((items) => { if (active) setDrafts(items); }).catch((cause) => { if (active) { console.error("[지원서 임시저장 목록 조회 실패]", cause); setDrafts([]); } }).finally(() => { if (active) setDraftsLoading(false); });
    return () => { active = false; };
  }, [query.data]);
  if (query.loading) return <SubmissionListSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const submissions = query.data.submissions;
  const empty = !draftsLoading && drafts.length === 0 && submissions.length === 0;

  return <Container>
    <header><p className="text-sm font-semibold text-brand">내 지원서</p><h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">작성 중인 내용과 제출 이력을 확인하세요.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-strong">이 기기에 저장된 작성 중 지원서와 제출 당시 내용이 보존된 지원서를 한곳에서 확인할 수 있어요.</p><div className="mt-5 flex flex-wrap gap-2"><SummaryChip label="작성 중" count={drafts.length} loading={draftsLoading} /><SummaryChip label="제출 완료" count={submissions.length} /></div></header>
    {draftsLoading || drafts.length ? <section aria-labelledby="draft-submissions-title" className="mt-10"><SectionHeader id="draft-submissions-title" eyebrow="이 기기에 저장됨" title="작성 중" detail="제출 전 내용은 기획사/제작사에 공개되지 않아요." />{draftsLoading ? <div className="mt-4 h-40 animate-pulse rounded-card bg-border-soft" /> : <ul className="mt-4 grid gap-4">{drafts.map((draft) => <DraftCard key={draft.postingId} draft={draft} />)}</ul>}</section> : null}
    {submissions.length ? <section aria-labelledby="submitted-submissions-title" className="mt-10"><SectionHeader id="submitted-submissions-title" eyebrow="읽기 전용 스냅샷" title="제출 완료" detail="제출 당시의 지원 정보와 사진·영상은 이후 프로필을 변경해도 그대로 보존됩니다." /><ul className="mt-4 grid gap-4">{submissions.map((submission) => <SubmittedCard key={submission.id} submission={submission} />)}</ul></section> : null}
    {empty ? <EmptySubmissions /> : null}
  </Container>;
}

function DraftCard({ draft }: { readonly draft: ApplicantApplicationDraftSummary }) {
  const open = draft.postingStatus === "OPEN";
  return <li><Link href={applicantRoutes.applicationDraft(draft.postingId)} className="group grid gap-5 rounded-card border border-warn/30 bg-card p-5 transition-[border-color,box-shadow] hover:border-warn hover:shadow-[var(--shadow-1)] sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center md:p-6"><Image src={draft.posterUrl} alt={`${draft.performanceTitle} 포스터`} width={88} height={116} unoptimized className="h-[116px] w-[88px] rounded-control object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge label="작성 중" tone="border-warn/30 bg-warn-bg text-warn" /><span className="text-xs text-muted">{draft.companyName}</span></div><h2 className="mt-3 truncate text-lg font-bold group-hover:text-brand">{draft.performanceTitle}</h2><p className="mt-1 truncate text-sm text-muted-strong">{draft.postingTitle}</p><div className="mt-4 flex flex-wrap gap-2">{draft.roleNames.length ? draft.roleNames.map((role) => <span key={role} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted-strong">{role}</span>) : <span className="text-sm text-muted">지원 배역 선택 전</span>}</div><p className="num mt-3 text-xs text-muted">{formatApplicantDate(draft.updatedAt, true)} 마지막 저장</p></div><span className="inline-flex min-h-11 items-center justify-center self-end rounded-control border border-border px-4 text-sm font-semibold text-muted-strong group-hover:border-brand-line group-hover:bg-brand-soft group-hover:text-brand sm:self-center">{open ? "이어서 작성" : "공고 확인"}</span></Link></li>;
}

function SubmittedCard({ submission }: { readonly submission: ApplicantSubmissionSummary }) {
  return <li><Link href={applicantRoutes.submission(submission.id)} className="group grid gap-5 rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center md:p-6"><Image src={submission.posterUrl} alt={`${submission.performanceTitle} 포스터`} width={88} height={116} unoptimized className="h-[116px] w-[88px] rounded-control object-cover" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><StatusBadge label="제출 완료" tone="border-pass/25 bg-pass-bg text-pass" /><span className="text-xs text-muted">{submission.companyName}</span></div><h2 className="mt-3 truncate text-lg font-bold group-hover:text-brand">{submission.performanceTitle}</h2><p className="mt-1 truncate text-sm text-muted-strong">{submission.postingTitle}</p><SelectedRoleList roles={submission.selectedRoles} /><p className="num mt-3 text-xs text-muted">{formatApplicantDate(submission.submittedAt, true)} 제출</p></div><span className="inline-flex min-h-11 items-center justify-center self-end rounded-control border border-border px-4 text-sm font-semibold text-muted-strong group-hover:border-brand-line group-hover:bg-brand-soft group-hover:text-brand sm:self-center">상세 보기</span></Link></li>;
}

export function SelectedRoleList({ roles }: { readonly roles: readonly ApplicantSelectedRole[] }) {
  return <ul className="mt-4 flex flex-wrap gap-2">{roles.map((role) => <li key={role.roleId} className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-strong">{role.roleName}</li>)}</ul>;
}

function SummaryChip({ label, count, loading = false }: { readonly label: string; readonly count: number; readonly loading?: boolean }) { return <span className="rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-strong"><strong className="font-semibold text-foreground">{label}</strong><span className="num ml-2">{loading ? "–" : count}</span></span>; }
function StatusBadge({ label, tone }: { readonly label: string; readonly tone: string }) { return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>; }
function SectionHeader({ id, eyebrow, title, detail }: { readonly id: string; readonly eyebrow: string; readonly title: string; readonly detail: string }) { return <div><p className="text-xs font-semibold text-brand">{eyebrow}</p><h2 id={id} className="mt-1 text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted">{detail}</p></div>; }
function EmptySubmissions() { return <section className="mt-8 rounded-card border border-dashed border-border bg-card px-6 py-14 text-center"><span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="M7 3.5h8l3 3V20.5H7z" /><path d="M15 3.5v4h3M9.5 11h6M9.5 14.5h6M9.5 18h4" /></svg></span><h2 className="mt-5 text-lg font-bold">아직 지원한 공고가 없어요</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">지원서를 작성하면 작성 중인 내용부터 제출 후 전형 진행 상황까지 이곳에 모입니다.</p></section>; }
function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[980px] px-5 py-9 md:px-8 md:py-12">{children}</div>; }
function SubmissionListSkeleton() { return <Container><div aria-label="지원서 목록 불러오는 중" className="animate-pulse"><div className="h-9 w-72 rounded bg-border" /><div className="mt-4 h-5 w-full max-w-xl rounded bg-border-soft" /><div className="mt-10 space-y-4">{[0, 1].map((item) => <div key={item} className="h-52 rounded-card bg-border-soft" />)}</div></div></Container>; }
