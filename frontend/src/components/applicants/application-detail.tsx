"use client";

import Image from "next/image";
import Link from "next/link";
import { getApplicantApplication } from "@/features/applicants/api";
import { answerValueText, applicationAvailability, formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantAnswer, ApplicantApplicationDetail } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import type { ApplicationId } from "@/features/auditions/types";
import { ScreenError, ScreenMessage } from "@/components/auditions/screen-status";
import { PrimaryLink, SecondaryButton, TextLink } from "@/components/ui/controls";

const sectionDetails = {
  BASIC: "기본 정보",
  INTRODUCTION: "자기소개",
  MATERIALS: "사진과 영상",
  CAREER: "경력",
  CUSTOM: "추가 질문",
} as const;

export function ApplicantApplicationDetailView({ applicationId }: { readonly applicationId: ApplicationId }) {
  const query = useAuditionQuery(`applicant-application-${applicationId}`, () => getApplicantApplication(applicationId), "지원서 상세를 불러오지 못했습니다.");
  if (!Number.isFinite(applicationId)) return <Container><ScreenMessage title="올바른 지원서 주소가 아니에요"><PrimaryLink href={applicantRoutes.applications} className="mt-5">목록으로 돌아가기</PrimaryLink></ScreenMessage></Container>;
  if (query.loading) return <DetailSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  return <ApplicationReadView detail={query.data} />;
}

function ApplicationReadView({ detail }: { readonly detail: ApplicantApplicationDetail }) {
  const availability = applicationAvailability(detail.editable);
  const fieldSections = new Map(detail.applicationFields.map((field) => [field.id, field.section]));
  const sections = (Object.keys(sectionDetails) as Array<keyof typeof sectionDetails>).map((section) => ({
    section,
    answers: detail.answers.filter((answer) => fieldSections.get(answer.key) === section),
  })).filter((group) => group.answers.length);
  const unknown = detail.answers.filter((answer) => !fieldSections.has(answer.key));
  const copyCode = async () => navigator.clipboard.writeText(detail.lookupCode);

  return <Container>
    <TextLink href={applicantRoutes.applications} className="px-2">← 내 지원서</TextLink>
    <header className="mt-4 grid gap-6 rounded-modal border border-border bg-card p-5 shadow-[var(--shadow-1)] sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center md:p-7">
      <Image src={detail.posterUrl} alt={`${detail.performanceTitle} 포스터`} width={96} height={128} unoptimized className="h-32 w-24 rounded-control object-cover" />
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${availability.tone}`}>{availability.label}</span><span className="text-xs text-muted">{detail.companyName}</span></div><h1 className="mt-3 truncate text-2xl font-bold tracking-[-0.025em]">{detail.performanceTitle}</h1><p className="mt-1 truncate text-muted-strong">{detail.postingTitle} · {detail.roleName}</p><p className="num mt-3 text-sm text-muted">{formatApplicantDate(detail.submittedAt, true)} 제출</p></div>
      <span className="text-sm text-muted">제출된 지원서는 열람만 가능해요.</span>
    </header>

    <section className="mt-5 rounded-card border border-border bg-card p-5 md:p-6"><div className="flex flex-wrap items-start gap-4"><div className="min-w-0 flex-1"><p className="text-sm text-muted">지원 접수 번호</p><strong className="num mt-1 block text-lg">{detail.lookupCode}</strong><p className="mt-2 text-sm leading-6 text-muted">로그인한 내 지원서 화면에서만 확인할 수 있습니다.</p></div><SecondaryButton onClick={copyCode}>번호 복사</SecondaryButton><SecondaryButton onClick={() => window.print()}>인쇄</SecondaryButton></div></section>

    <div className="mt-8 space-y-5">{sections.map((group) => <AnswerSection key={group.section} title={sectionDetails[group.section]} answers={group.answers} />)}{unknown.length ? <AnswerSection title="제출 당시 항목" answers={unknown} notice="현재 공고 양식에서는 사라졌지만 제출 당시 답변은 스냅샷으로 보존돼요." /> : null}</div>
    <aside className="mt-8 rounded-card border border-brand-line bg-brand-soft p-5"><h2 className="font-bold text-brand">프로필과 제출 내용은 따로 보관돼요</h2><p className="mt-2 text-sm leading-6 text-muted-strong">지금 프로필을 수정해도 제출 당시의 불변 지원서에는 반영되지 않습니다.</p><Link href={applicantRoutes.profile} className="mt-4 inline-flex min-h-11 items-center rounded-control bg-card px-4 text-sm font-semibold text-brand">프로필 관리</Link></aside>
  </Container>;
}

function AnswerSection({ title, answers, notice }: { readonly title: string; readonly answers: readonly ApplicantAnswer[]; readonly notice?: string }) {
  return <section className="overflow-hidden rounded-card border border-border bg-card"><div className="border-b border-border-soft bg-surface px-5 py-4"><h2 className="font-bold">{title}</h2>{notice ? <p className="mt-1 text-xs leading-5 text-muted">{notice}</p> : null}</div><dl className="divide-y divide-border-soft px-5">{answers.map((answer) => <div key={answer.key} className="grid gap-2 py-4 sm:grid-cols-[140px_minmax(0,1fr)]"><dt className="text-sm font-medium text-muted">{answer.label}</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium leading-6">{answer.key === "PHOTOS" && answer.previewUrls?.length ? <div className="flex gap-2 overflow-x-auto">{answer.previewUrls.map((url, index) => <Image key={url} src={url} alt={`제출 프로필 사진 ${index + 1}`} width={72} height={96} unoptimized className="h-24 w-[72px] rounded-md object-cover" />)}</div> : answerValueText(answer.value)}</dd></div>)}</dl></section>;
}

function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[920px] px-5 py-8 md:px-8 md:py-10">{children}</div>; }
function DetailSkeleton() { return <Container><div aria-label="지원서 상세 불러오는 중" className="animate-pulse"><div className="h-11 w-28 rounded bg-border-soft" /><div className="mt-4 h-48 rounded-modal bg-border" /><div className="mt-6 h-80 rounded-card bg-border-soft" /></div></Container>; }
