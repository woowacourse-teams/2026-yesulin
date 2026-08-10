"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { getApplicantApplication } from "@/features/applicants/api";
import { answerValueText, applicationAvailability, formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantAnswer, ApplicantApplicationDetail } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import type { ApplicationId } from "@/features/auditions/types";
import { ScreenError, ScreenMessage } from "@/components/auditions/screen-status";
import { ApplicationEditForm } from "./application-edit-form";

const sectionDetails = {
  BASIC: "기본 정보",
  INTRODUCTION: "자기소개",
  MATERIALS: "사진과 영상",
  CAREER: "경력",
  CUSTOM: "추가 질문",
} as const;

export function ApplicantApplicationDetailView({ applicationId }: { readonly applicationId: ApplicationId }) {
  const query = useAuditionQuery(`applicant-application-${applicationId}`, () => getApplicantApplication(applicationId), "지원서 상세를 불러오지 못했습니다.");
  const [saved, setSaved] = useState<ApplicantApplicationDetail | null>(null);
  const [editing, setEditing] = useState(false);
  if (!Number.isFinite(applicationId)) return <Container><ScreenMessage title="올바른 지원서 주소가 아니에요"><Link href={applicantRoutes.applications} className="mt-5 inline-flex min-h-11 items-center rounded-control bg-brand px-4 font-semibold text-white">목록으로 돌아가기</Link></ScreenMessage></Container>;
  if (query.loading) return <DetailSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const detail = saved ?? query.data;
  if (editing) return <ApplicationEditForm detail={detail} onCancel={() => setEditing(false)} onSaved={(next) => { setSaved(next); setEditing(false); }} />;
  return <ApplicationReadView detail={detail} onEdit={() => setEditing(true)} />;
}

function ApplicationReadView({ detail, onEdit }: { readonly detail: ApplicantApplicationDetail; readonly onEdit: () => void }) {
  const availability = applicationAvailability(detail.editable);
  const fieldSections = new Map(detail.applicationFields.map((field) => [field.id, field.section]));
  const sections = (Object.keys(sectionDetails) as Array<keyof typeof sectionDetails>).map((section) => ({
    section,
    answers: detail.answers.filter((answer) => fieldSections.get(answer.key) === section),
  })).filter((group) => group.answers.length);
  const unknown = detail.answers.filter((answer) => !fieldSections.has(answer.key));
  const copyCode = async () => navigator.clipboard.writeText(detail.lookupCode);

  return <Container>
    <Link href={applicantRoutes.applications} className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-card hover:text-brand">← 내 지원서</Link>
    <header className="mt-4 grid gap-6 rounded-modal border border-border bg-card p-5 shadow-[var(--shadow-1)] sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center md:p-7">
      <Image src={detail.posterUrl} alt={`${detail.performanceTitle} 포스터`} width={96} height={128} unoptimized className="h-32 w-24 rounded-control object-cover" />
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${availability.tone}`}>{availability.label}</span><span className="text-xs text-muted">{detail.companyName}</span></div><h1 className="mt-3 truncate text-2xl font-bold tracking-[-0.025em]">{detail.performanceTitle}</h1><p className="mt-1 truncate text-muted-strong">{detail.postingTitle} · {detail.roleName}</p><p className="num mt-3 text-sm text-muted">{formatApplicantDate(detail.submittedAt, true)} 제출</p></div>
      {detail.editable ? <button type="button" onClick={onEdit} className="min-h-12 rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong">지원서 수정</button> : <span className="text-sm text-muted">마감 후에는 열람만 가능해요.</span>}
    </header>

    <section className="mt-5 rounded-card border border-border bg-card p-5 md:p-6"><div className="flex flex-wrap items-start gap-4"><div className="min-w-0 flex-1"><p className="text-sm text-muted">지원 조회 코드</p><strong className="num mt-1 block text-lg">{detail.lookupCode}</strong><p className="mt-2 text-sm leading-6 text-muted">비로그인 조회에도 사용할 수 있어요. 연락처와 함께 본인 확인 후 내용을 보여줍니다.</p></div><button type="button" onClick={copyCode} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold hover:border-brand-line hover:bg-brand-soft hover:text-brand">코드 복사</button><button type="button" onClick={() => window.print()} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold hover:border-brand-line hover:bg-brand-soft hover:text-brand">인쇄</button></div></section>

    <div className="mt-8 space-y-5">{sections.map((group) => <AnswerSection key={group.section} title={sectionDetails[group.section]} answers={group.answers} />)}{unknown.length ? <AnswerSection title="제출 당시 항목" answers={unknown} notice="현재 공고 양식에서는 사라졌지만 제출 당시 답변은 스냅샷으로 보존돼요." /> : null}</div>
    <aside className="mt-8 rounded-card border border-brand-line bg-brand-soft p-5"><h2 className="font-bold text-brand">프로필과 제출 내용은 따로 보관돼요</h2><p className="mt-2 text-sm leading-6 text-muted-strong">지금 프로필을 수정해도 이 지원서에는 반영되지 않습니다. 접수 중인 지원서는 위의 수정 버튼으로 직접 고쳐 주세요.</p><Link href={applicantRoutes.profile} className="mt-4 inline-flex min-h-11 items-center rounded-control bg-card px-4 text-sm font-semibold text-brand">프로필 관리</Link></aside>
  </Container>;
}

function AnswerSection({ title, answers, notice }: { readonly title: string; readonly answers: readonly ApplicantAnswer[]; readonly notice?: string }) {
  return <section className="overflow-hidden rounded-card border border-border bg-card"><div className="border-b border-border-soft bg-surface px-5 py-4"><h2 className="font-bold">{title}</h2>{notice ? <p className="mt-1 text-xs leading-5 text-muted">{notice}</p> : null}</div><dl className="divide-y divide-border-soft px-5">{answers.map((answer) => <div key={answer.key} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="text-sm font-medium text-muted">{answer.label}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{answer.key === "PHOTOS" && answer.previewUrls?.length ? <div className="flex gap-2 overflow-x-auto">{answer.previewUrls.map((url, index) => <Image key={url} src={url} alt={`제출 프로필 사진 ${index + 1}`} width={72} height={96} unoptimized className="h-24 w-[72px] rounded-md object-cover" />)}</div> : answerValueText(answer.value)}</dd></div>)}</dl></section>;
}

function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[920px] px-5 py-8 md:px-8 md:py-10">{children}</div>; }
function DetailSkeleton() { return <Container><div aria-label="지원서 상세 불러오는 중" className="animate-pulse"><div className="h-11 w-28 rounded bg-border-soft" /><div className="mt-4 h-48 rounded-modal bg-border" /><div className="mt-6 h-80 rounded-card bg-border-soft" /></div></Container>; }
