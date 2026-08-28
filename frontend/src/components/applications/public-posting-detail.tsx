"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicPosting } from "@/features/applications/public-posting";
import { publicPostingAvailability, publicPostingDate, publicPostingDateTime } from "@/features/applications/public-posting";
import { PrimaryButton } from "@/components/ui/controls";
import { PostingStatusBadge } from "./public-posting-status";
import { readPublicApplicationDraft } from "@/features/applications/public-application-draft-store";
import { buildApplicationAuthReturnTo } from "@/features/auth/return-to";
import { useAuthSession } from "@/components/auth/auth-session";
import { applicantRoutes } from "@/features/applicants/routes";
import { AnalyticsSettingsButton } from "@/components/analytics/analytics-settings-button";
import { getApplicantSubmissions } from "@/features/applicants/api";
import { applicationFormSteps } from "@/features/applications/application-form";
import { applicationWriteRoute } from "@/features/applications/routes";
import { PublicVenueGuide } from "./public-venue-guide";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { trackAnalyticsEvent } from "@/features/analytics/events";

export function PublicPostingDetail({ posting, useProfilePrefill = false, resumeDraft = false, initialRoleIds = [] }: { posting: PublicPosting; useProfilePrefill?: boolean; resumeDraft?: boolean; initialRoleIds?: readonly string[] }) {
  const router = useRouter();
  const skipsRoleChoice = posting.isOpenCall || posting.roles.length === 1;
  const { session } = useAuthSession();
  const [validInitialRoleIds] = useState(() => initialRoleIds.filter((id) => posting.roles.some((role) => role.id === id)));
  const [selectedRoleIds, setSelectedRoleIds] = useState<readonly string[]>(validInitialRoleIds.length ? validInitialRoleIds : skipsRoleChoice && posting.roles[0] ? [posting.roles[0].id] : []);
  const [restoring, setRestoring] = useState(resumeDraft);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [submittedPostingIds, setSubmittedPostingIds] = useState<readonly string[]>([]);
  const authenticated = session?.role === "APPLICANT";
  const selectedRoles = posting.roles.filter((role) => selectedRoleIds.includes(role.id));
  const acceptingApplications = posting.status === "OPEN";
  const alreadySubmitted = authenticated && submittedPostingIds.includes(posting.id);
  const actionEnabled = acceptingApplications && selectedRoles.length > 0 && !alreadySubmitted;
  const selectedRoleLabel = selectedRoles.map((role) => role.name).join(" · ");
  const loginHref = `/login?returnTo=${encodeURIComponent(buildApplicationAuthReturnTo(posting.id, selectedRoleIds, "basic"))}`;
  const loginAnalytics = { entry_point: "public_posting_header", login_reason: "application_start", actor_type: "applicant", return_target: "application_basic" } as const;
  const toggleRole = (id: string) => setSelectedRoleIds((current) => posting.allowsMultipleRoles ? (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) : [id]);
  const showMobileAction = acceptingApplications;
  const focusRoleSelection = () => {
    const section = document.getElementById("posting-roles");
    section?.scrollIntoView({ behavior: "smooth", block: "center" });
    section?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  };
  const beginApplication = () => {
    trackAnalyticsEvent("application_start", { start_mode: hasLocalDraft ? "resume" : authenticated ? "authenticated" : "guest", selected_role_count: selectedRoleIds.length, has_draft: hasLocalDraft });
    router.push(applicationWriteRoute(posting.id, "basic", selectedRoleIds, { prefill: authenticated && !hasLocalDraft }));
  };

  useEffect(() => {
    trackAnalyticsEvent("view_posting", { posting_status: posting.status.toLowerCase(), role_count: posting.roles.length });
  }, [posting.roles.length, posting.status]);

  // 같은 공고에는 한 번만 제출할 수 있다. 다 쓰고 나서 막지 않도록 작성 전에 확인한다.
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    getApplicantSubmissions()
      .then((response) => { if (active) setSubmittedPostingIds(response.submissions.map((submission) => submission.postingId)); })
      .catch((cause) => { console.error("[지원 여부 확인 실패]", cause); });
    return () => { active = false; };
  }, [authenticated]);

  useEffect(() => {
    let active = true;
    readPublicApplicationDraft(posting.id).then((draft) => {
      if (!active) return;
      const validRoleIds = draft?.roleIds.filter((id) => posting.roles.some((role) => role.id === id)) ?? [];
      if (draft) {
        setHasLocalDraft(true);
        if (validRoleIds.length) setSelectedRoleIds((current) => current.length === validRoleIds.length && current.every((id) => validRoleIds.includes(id)) ? current : validRoleIds);
      }
      const canOpenForm = validRoleIds.length > 0 || validInitialRoleIds.length > 0 || skipsRoleChoice;
      if (resumeDraft && (Boolean(draft) || useProfilePrefill) && canOpenForm) {
        const draftSteps = applicationFormSteps(posting.applicationFields);
        const route = draft?.reviewing ? "review" : draftSteps[Math.min(draft?.stepIndex ?? 0, draftSteps.length - 1)]?.key ?? "basic";
        const routeRoleIds = validRoleIds.length ? validRoleIds : validInitialRoleIds.length ? validInitialRoleIds : posting.roles[0] ? [posting.roles[0].id] : [];
        router.replace(applicationWriteRoute(posting.id, route, routeRoleIds, { prefill: useProfilePrefill && !draft }));
      } else if (resumeDraft) setRestoring(false);
    }).catch((cause) => { if (active) { console.error("[지원서 임시저장 확인 실패]", cause); if (resumeDraft) setRestoring(false); } });
    return () => { active = false; };
  }, [posting.applicationFields, posting.id, posting.roles, resumeDraft, router, skipsRoleChoice, useProfilePrefill, validInitialRoleIds]);

  if (restoring) return <DraftResumeLoading />;

  return <main className={`min-h-screen bg-surface text-foreground ${showMobileAction ? "pb-[calc(152px+env(safe-area-inset-bottom))]" : "pb-12"} min-[1200px]:pb-12`}>
    <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-16 max-w-[880px] items-center px-5 md:px-8 min-[1200px]:max-w-[1200px]">
        <Link href="/" aria-label="예술in 홈" className="inline-flex min-h-11 items-center rounded-control px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><Image src="/images/yesulin-logo.png" alt="예술in" width={84} height={49} priority className="h-auto w-[84px] object-contain" /></Link>
        {authenticated ? <>
          <AnalyticsSettingsButton className="ml-auto mr-2" /><span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-strong sm:text-sm"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand" />로그인됨</span>
          <Link href={applicantRoutes.submissions} className="ml-2 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">내 지원서</Link>
        </> : <>
          <AnalyticsSettingsButton className="ml-auto mr-2" /><span className="text-xs text-muted-strong sm:text-sm">로그인 전 작성 가능</span>
          <TrackedLoginLink href={loginHref} analytics={loginAnalytics} className="ml-2 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">로그인</TrackedLoginLink>
        </>}
      </div>
    </header>

    <div className="mx-auto max-w-[880px] px-5 py-8 md:px-8 md:py-12 min-[1200px]:max-w-[1200px] min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,1fr)_320px] min-[1200px]:gap-12">
      <article className="min-w-0">
        <PostingHero posting={posting} />
        <PostingAvailability posting={posting} />
        <PostingSchedule posting={posting} />
        <PerformanceInformation posting={posting} />
        <RoleSelection posting={posting} selectedRoleIds={selectedRoleIds} onSelect={toggleRole} selectable={acceptingApplications && !skipsRoleChoice} />
        <PostingDocuments posting={posting} />
        <ProducerInformation posting={posting} />
      </article>
      <aside className="hidden min-[1200px]:block"><DesktopAction posting={posting} selectedRole={selectedRoleLabel} enabled={actionEnabled} hasDraft={hasLocalDraft} alreadySubmitted={alreadySubmitted} onAction={beginApplication} onChooseRole={focusRoleSelection} /></aside>
    </div>
    {showMobileAction ? <MobileAction posting={posting} selectedRole={selectedRoleLabel} enabled={actionEnabled} hasDraft={hasLocalDraft} alreadySubmitted={alreadySubmitted} onAction={beginApplication} onChooseRole={focusRoleSelection} /> : null}
  </main>;
}

function PostingHero({ posting }: { posting: PublicPosting }) {
  return <section className="border-b border-border pb-8"><p className="text-sm font-semibold text-brand">{posting.companyName}</p><h1 className="mt-3 text-[clamp(32px,4vw,44px)] font-bold leading-tight tracking-[-0.035em]">{posting.performanceTitle}</h1><p className="mt-2 text-lg text-muted-strong">{posting.title}</p></section>;
}

function PostingAvailability({ posting }: { posting: PublicPosting }) {
  const availability = publicPostingAvailability(posting);
  const accessLabel = posting.status === "OPEN" ? "로그인 후 최종 제출" : "공고 공개 열람";
  return <section className="border-b border-border py-8 sm:py-10"><div className="flex flex-wrap items-center gap-3"><PostingStatusBadge status={posting.status} /><span className="inline-flex items-center rounded-full bg-card px-3 py-1 text-sm font-semibold text-muted-strong">{accessLabel}</span></div><dl className="mt-5 grid gap-1 text-sm sm:grid-cols-[112px_1fr] sm:gap-y-3"><dt className="font-semibold text-muted-strong">{availability.label}</dt><dd className="num text-base font-bold text-foreground">{availability.detail}</dd><dt className="sr-only sm:not-sr-only">안내</dt><dd className="text-muted-strong">{availability.notice}</dd></dl></section>;
}

function RoleSelection({ posting, selectedRoleIds, onSelect, selectable }: { posting: PublicPosting; selectedRoleIds: readonly string[]; onSelect: (id: string) => void; selectable: boolean }) {
  const unavailable = posting.status !== "OPEN";
  const description = unavailable ? posting.status === "UPCOMING" ? "모집 시작 전에는 배역을 선택하거나 지원할 수 없어요." : "접수는 마감되었지만 모집 배역과 조건은 확인할 수 있어요." : selectable ? posting.allowsMultipleRoles ? "지원할 배역을 하나 이상 선택해 주세요. 선택한 배역은 각각 독립적으로 심사됩니다." : "지원할 배역 하나를 선택해 주세요." : posting.isOpenCall ? "배역 구분 없이 한 개의 지원서로 접수합니다." : "이 공고는 하나의 배역으로 지원합니다.";
  return <section id="posting-roles" className="border-b border-border py-8 sm:py-10"><fieldset><legend className="text-xl font-bold tracking-[-0.02em]">{posting.isOpenCall ? "모집 분야" : "모집 배역"}</legend><p id="posting-roles-description" className="mt-2 text-sm text-muted-strong">{description}</p><div aria-describedby="posting-roles-description" className="mt-5 grid gap-3">{posting.roles.map((role) => <RoleCard key={role.id} role={role} multiple={posting.allowsMultipleRoles} selected={selectedRoleIds.includes(role.id)} disabled={!selectable} unavailable={unavailable} onSelect={onSelect} />)}</div></fieldset></section>;
}

function RoleCard({ role, multiple, selected, disabled, unavailable, onSelect }: { role: PublicPosting["roles"][number]; multiple: boolean; selected: boolean; disabled: boolean; unavailable: boolean; onSelect: (id: string) => void }) {
  const gender = role.gender === "ANY" ? "성별 무관" : role.gender === "MALE" ? "남성" : "여성";
  const interaction = disabled ? "cursor-default border-border bg-border-soft text-muted" : "cursor-pointer hover:border-brand-line";
  return <label className={`block min-h-28 rounded-card border bg-card p-4 transition-[border-color,background-color,box-shadow] ${selected ? "border-brand bg-brand-soft shadow-[var(--shadow-1)]" : "border-border"} ${interaction}`}><input type={multiple ? "checkbox" : "radio"} name="application-role" value={role.id} checked={selected} disabled={disabled} onChange={() => onSelect(role.id)} className="peer sr-only" /><span className="flex items-start gap-3"><span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center ${multiple ? "rounded-md" : "rounded-full"} border-2 ${selected ? "border-brand bg-brand" : "border-muted-soft bg-card"} peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2`}><span className={`text-xs font-bold text-white ${selected ? "block" : "hidden"}`}>{multiple ? "✓" : "•"}</span></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-base">{role.name}</strong><span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted-strong">{role.quota}명</span>{selected ? <span className="text-sm font-semibold text-brand">{unavailable ? "선택됨 · 현재 지원 불가" : "선택됨"}</span> : null}</span><span className="mt-2 block text-sm text-muted-strong">{role.description}</span><span className="mt-1 block text-sm text-muted">만 {role.ageMin}~{role.ageMax}세 · {gender}</span></span></span></label>;
}

function PostingSchedule({ posting }: { posting: PublicPosting }) {
  return <div className="border-b border-border">
    <InfoSection title="주요 전형 일정">
      <ol className="grid gap-3 sm:grid-cols-2">{posting.schedule.map((item, index) => <li key={item.title} className="rounded-card border border-border bg-card p-4"><span className="num text-xs font-bold text-brand">0{index + 1}</span><strong className="mt-3 block font-semibold">{item.title}</strong><span className="mt-1 block text-sm leading-6 text-muted-strong">{item.detail}</span></li>)}</ol>
    </InfoSection>
  </div>;
}

function PostingDocuments({ posting }: { posting: PublicPosting }) {
  const requiredCount = posting.documents.filter((document) => document.required).length;
  const optionalCount = posting.documents.length - requiredCount;
  return <section className="border-b border-border py-8 sm:py-10" aria-labelledby="posting-documents-title">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="posting-documents-title" className="text-xl font-bold tracking-[-0.02em]">제출 자료</h2><p className="mt-2 text-sm leading-6 text-muted-strong">아래 항목은 <strong className="font-semibold text-foreground">지원서 작성</strong>을 시작한 뒤에 입력합니다. 이 화면에서는 확인만 하세요.</p></div><p className="text-sm font-semibold text-muted-strong"><span className="text-brand">필수 {requiredCount}개</span>{optionalCount ? ` · 선택 ${optionalCount}개` : ""}</p></div>
    <ul className="mt-5 flex flex-wrap gap-2">{posting.documents.map((document) => <li key={document.id} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${document.required ? "border-brand-line bg-brand-soft" : "border-border bg-card"}`}><span className={`text-xs font-bold ${document.required ? "text-brand" : "text-muted"}`}>{document.required ? "필수" : "선택"}</span><span className="text-sm font-semibold text-foreground">{document.title}</span></li>)}</ul>
  </section>;
}

function PerformanceInformation({ posting }: { posting: PublicPosting }) {
  return <div className="border-b border-border"><InfoSection title="공연 정보"><PublicVenueGuide venue={posting.venue} address={posting.venueAddress} /><dl className="mt-6 grid gap-x-6 gap-y-4 text-base sm:grid-cols-[112px_1fr]"><dt className="text-muted">공연 기간</dt><dd className="num">{publicPostingDate(posting.performanceStart)} ~ {posting.performanceEnd ? publicPostingDate(posting.performanceEnd) : <strong className="font-semibold text-brand">오픈런</strong>}</dd><dt className="text-muted">모집 기간</dt><dd className="num">{publicPostingDateTime(posting.recruitmentStart)} ~ {publicPostingDateTime(posting.recruitmentEnd)}</dd></dl><p className="mt-4 text-sm text-muted">모든 일정은 한국 시간(KST) 기준입니다.</p></InfoSection></div>;
}

function ProducerInformation({ posting }: { posting: PublicPosting }) {
  return <InfoSection title="기획사/제작사"><p className="font-semibold">{posting.companyName}</p>{posting.companyDescription ? <p className="mt-2 max-w-[680px] text-sm leading-7 text-muted-strong">{posting.companyDescription}</p> : null}</InfoSection>;
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="py-8 sm:py-10"><h2 className="text-xl font-bold tracking-[-0.02em]">{title}</h2><div className="mt-5">{children}</div></section>; }

function DesktopAction({ posting, selectedRole, enabled, hasDraft, alreadySubmitted, onAction, onChooseRole }: { posting: PublicPosting; selectedRole?: string; enabled: boolean; hasDraft: boolean; alreadySubmitted: boolean; onAction: () => void; onChooseRole: () => void }) { const availability = publicPostingAvailability(posting); return <div className="glass-surface-strong sticky top-24 rounded-modal p-6"><p className="text-sm font-bold text-muted-strong">지원 요약</p><div className="mt-5 space-y-4"><div><span className="block text-xs font-medium text-muted">선택 배역</span><strong className="mt-1 block text-lg leading-7">{selectedRole ?? "지원할 배역을 선택해 주세요"}</strong></div><div><span className="block text-xs font-medium text-muted">{availability.label}</span><strong className="num mt-1 block text-sm leading-6">{availability.detail}</strong></div></div><div className="mt-6 [&>button]:w-full"><ActionButton posting={posting} enabled={enabled} hasDraft={hasDraft} alreadySubmitted={alreadySubmitted} onAction={onAction} onChooseRole={onChooseRole} /></div><div className="mt-4 border-t border-border-soft pt-4"><ActionNotice status={posting.status} hasDraft={hasDraft} alreadySubmitted={alreadySubmitted} /></div></div>; }

function MobileAction({ posting, selectedRole, enabled, hasDraft, alreadySubmitted, onAction, onChooseRole }: { posting: PublicPosting; selectedRole?: string; enabled: boolean; hasDraft: boolean; alreadySubmitted: boolean; onAction: () => void; onChooseRole: () => void }) { const availability = publicPostingAvailability(posting); return <div className="glass-surface fixed inset-x-0 bottom-0 z-20 border-x-0 border-b-0 min-[1200px]:hidden"><div className="mx-auto max-w-[880px] px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-8"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{selectedRole ?? "배역을 선택해 주세요"}</strong><span className="num block text-xs text-muted">{availability.label} · {availability.detail}</span></div><ActionButton posting={posting} enabled={enabled} hasDraft={hasDraft} alreadySubmitted={alreadySubmitted} onAction={onAction} onChooseRole={onChooseRole} /></div><div className="mt-2"><ActionNotice status={posting.status} hasDraft={hasDraft} alreadySubmitted={alreadySubmitted} /></div></div></div>; }

function ActionButton({ posting, enabled, hasDraft, alreadySubmitted, onAction, onChooseRole }: { posting: PublicPosting; enabled: boolean; hasDraft: boolean; alreadySubmitted: boolean; onAction: () => void; onChooseRole: () => void }) { const unavailable = posting.status !== "OPEN" || alreadySubmitted; const label = alreadySubmitted ? "이미 지원한 공고" : posting.status === "UPCOMING" ? "모집 시작 전" : posting.status === "CLOSED" ? "지원 마감" : enabled ? hasDraft ? "지원서 이어쓰기" : "지원서 작성" : "배역 선택하기"; return <PrimaryButton disabled={unavailable} onClick={enabled ? onAction : onChooseRole} className="shrink-0 px-5">{label}</PrimaryButton>; }

function ActionNotice({ status, hasDraft, alreadySubmitted }: { status: PublicPosting["status"]; hasDraft: boolean; alreadySubmitted: boolean }) { const message = alreadySubmitted ? "이미 이 공고에 지원했어요. 제출한 내용은 내 지원서에서 확인할 수 있습니다." : status === "OPEN" ? hasDraft ? "이 브라우저에 작성 중인 내용이 있어요. 이어서 확인한 뒤 제출할 수 있습니다." : "로그인 전에도 작성할 수 있어요. 작성 내용은 이 브라우저에 저장되고, 최종 제출할 때 로그인이 필요합니다." : status === "UPCOMING" ? "모집 시작 전이라 지원할 수 없어요." : "접수가 마감되어 지원할 수 없어요. 공고 내용은 계속 확인할 수 있어요."; return <p className="text-xs leading-5 text-muted">{message}</p>; }

function DraftResumeLoading() { return <main className="grid min-h-screen place-items-center bg-surface px-5"><section role="status" className="w-full max-w-lg rounded-modal border border-border bg-card px-6 py-12 text-center"><span aria-hidden="true" className="mx-auto block h-10 w-10 animate-pulse rounded-2xl bg-brand" /><h1 className="mt-5 text-xl font-bold">작성하던 지원서를 찾고 있어요</h1><p className="mt-2 text-sm leading-6 text-muted-strong">이전에 입력한 내용이 있으면 불러온 뒤 지원서를 열게요.</p></section></main>; }
