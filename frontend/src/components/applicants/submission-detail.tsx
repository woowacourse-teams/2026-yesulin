"use client";

import Image from "next/image";
import Link from "next/link";
import { getApplicantSubmission } from "@/features/applicants/api";
import { answerValueText, formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantAnswer, ApplicantSubmissionDetail } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { isSubmissionId, type SubmissionId } from "@/features/auditions/types";
import { hasSubmittedValue } from "@/features/applications/materials";
import { ScreenError, ScreenMessage } from "@/components/auditions/screen-status";
import { PrimaryLink, TextLink } from "@/components/ui/controls";
import { SelectedRoleList } from "./submission-list";
import { SubmissionMaterials } from "./submission-materials";

const sectionDetails = {
  BASIC: "기본 정보",
  ADDITIONAL: "추가 정보",
  INTRODUCTION: "자기소개",
  MATERIALS: "사진과 영상",
  CAREER: "경력",
  CUSTOM: "추가 질문",
} as const;

export function ApplicantSubmissionDetailView({ submissionId }: { readonly submissionId: SubmissionId }) {
  if (!isSubmissionId(submissionId)) return <Container><ScreenMessage title="올바른 지원서 주소가 아니에요"><PrimaryLink href={applicantRoutes.submissions} className="mt-5">목록으로 돌아가기</PrimaryLink></ScreenMessage></Container>;
  return <ValidSubmissionDetail submissionId={submissionId} />;
}

function ValidSubmissionDetail({ submissionId }: { readonly submissionId: SubmissionId }) {
  const query = useAuditionQuery(`applicant-submission-${submissionId}`, () => getApplicantSubmission(submissionId), "지원서 상세를 불러오지 못했습니다.");
  if (query.loading) return <DetailSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  return <SubmissionReadView detail={query.data} />;
}

function SubmissionReadView({ detail }: { readonly detail: ApplicantSubmissionDetail }) {
  const roleNames = detail.selectedRoles.map((role) => role.roleName).join(" · ");
  const fieldSections = new Map(detail.applicationFields.map((field) => [field.id, field.section]));
  const visibleAnswers = detail.answers.filter((answer) => hasSubmittedValue(answer.value) || Boolean(answer.previewUrls?.length));
  const sections = (Object.keys(sectionDetails) as Array<keyof typeof sectionDetails>).map((section) => ({
    section,
    answers: visibleAnswers.filter((answer) => fieldSections.get(answer.key) === section),
  })).filter((group) => group.section !== "MATERIALS" && group.answers.length);
  const unknown = visibleAnswers.filter((answer) => !fieldSections.has(answer.key));

  return <Container>
    <TextLink href={applicantRoutes.submissions} className="px-2">← 내 지원서</TextLink>
    <header className="mt-4 grid gap-6 rounded-card border border-border bg-card p-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center md:p-7">
      <Image src={detail.posterUrl} alt={`${detail.performanceTitle} 포스터`} width={96} height={128} unoptimized className="h-32 w-24 rounded-control object-cover" />
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted-strong">제출 완료</span><span className="text-xs text-muted">{detail.companyName}</span></div><h1 className="mt-3 truncate text-2xl font-bold tracking-[-0.025em]">{detail.performanceTitle}</h1><p className="mt-1 truncate text-muted-strong">{detail.postingTitle} · {roleNames}</p><p className="num mt-3 text-sm text-muted">{formatApplicantDate(detail.submittedAt, true)} 제출</p></div>
      <span className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-muted-strong">읽기 전용</span>
    </header>

    <section className="mt-5 rounded-card border border-border bg-card p-5 md:p-6"><h2 className="font-bold">지원 배역</h2><p className="mt-2 text-sm leading-6 text-muted">이 지원서로 제출한 배역입니다.</p><SelectedRoleList roles={detail.selectedRoles} /></section>
    <section className="mt-5 rounded-card border border-border bg-card p-5 md:p-6"><p className="font-semibold">제출 당시 내용이 그대로 보존됩니다.</p><p className="mt-2 text-sm leading-6 text-muted">제출 후에는 일반 수정할 수 없으며, 프로필을 변경하거나 사진 보관함에서 삭제해도 이 지원서는 바뀌지 않습니다.</p></section>
    <SubmissionMaterials fields={detail.applicationFields} answers={detail.answers} />

    <div className="mt-8 space-y-5">{sections.map((group) => <AnswerSection key={group.section} title={sectionDetails[group.section]} answers={group.answers} />)}{unknown.length ? <AnswerSection title="제출 당시 항목" answers={unknown} notice="현재 공고 양식에서는 사라졌지만 제출 당시 답변은 스냅샷으로 보존돼요." /> : null}</div>
    <aside className="mt-8 rounded-card border border-brand-line bg-brand-soft p-5"><h2 className="font-bold text-brand">프로필과 제출 내용은 따로 보관돼요</h2><p className="mt-2 text-sm leading-6 text-muted-strong">지금 프로필을 수정해도 이 지원서에는 반영되지 않습니다.</p><Link href={applicantRoutes.profile} className="mt-4 inline-flex min-h-11 items-center rounded-control bg-card px-4 text-sm font-semibold text-brand">프로필 관리</Link></aside>
  </Container>;
}

function AnswerSection({ title, answers, notice }: { readonly title: string; readonly answers: readonly ApplicantAnswer[]; readonly notice?: string }) {
  return <section className="overflow-hidden rounded-card border border-border bg-card"><div className="border-b border-border-soft bg-surface px-5 py-4"><h2 className="font-bold">{title}</h2>{notice ? <p className="mt-1 text-xs leading-5 text-muted">{notice}</p> : null}</div><dl className="divide-y divide-border-soft px-5">{answers.map((answer) => <div key={answer.key} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="text-sm font-medium text-muted">{answer.label}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{answer.key === "PHOTOS" && answer.previewUrls?.length ? <div className="scrollbar-hidden flex gap-2 overflow-x-auto">{answer.previewUrls.map((url, index) => <Image key={url} src={url} alt={`제출 프로필 사진 ${index + 1}`} width={72} height={96} unoptimized className="h-24 w-[72px] rounded-md object-cover" />)}</div> : answerValueText(answer.value)}</dd></div>)}</dl></section>;
}

function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[920px] px-5 py-8 md:px-8 md:py-10">{children}</div>; }
function DetailSkeleton() { return <Container><div aria-label="지원서 상세 불러오는 중" className="animate-pulse"><div className="h-11 w-28 rounded bg-border-soft" /><div className="mt-4 h-48 rounded-modal bg-border" /><div className="mt-6 h-80 rounded-card bg-border-soft" /></div></Container>; }
