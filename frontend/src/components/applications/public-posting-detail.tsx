"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublicPosting } from "@/features/applications/public-posting";
import { publicPostingDate } from "@/features/applications/public-posting";
import { PostingStatusBadge } from "./public-posting-status";
import { PublicApplicationForm } from "./public-application-form";

export function PublicPostingDetail({ posting }: { posting: PublicPosting }) {
  const skipsRoleChoice = posting.isOpenCall || posting.roles.length === 1;
  const [selectedRoleId, setSelectedRoleId] = useState(skipsRoleChoice ? posting.roles[0]?.id ?? "" : "");
  const [view, setView] = useState<"posting" | "form">("posting");
  const selectedRole = posting.roles.find((role) => role.id === selectedRoleId);
  const acceptingApplications = posting.status === "OPEN";
  const actionEnabled = acceptingApplications && Boolean(selectedRole);
  if (view === "form") return <PublicApplicationForm fields={posting.applicationFields} performanceTitle={posting.performanceTitle} postingTitle={posting.title} roleName={selectedRole?.name ?? "전체 지원자"} onBack={() => setView("posting")} />;

  return (
    <main className="min-h-screen bg-surface pb-28 text-foreground">
      <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex min-h-16 max-w-[1200px] items-center px-5 sm:px-8">
          <Link href="/" aria-label="예술in 홈" className="rounded-control text-lg font-bold tracking-[-0.03em] text-brand">예술in</Link>
          <Link href="/login" className="ml-auto inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground">로그인</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12 lg:py-12">
        <article className="min-w-0">
          <PostingHero posting={posting} />
          <PostingSections posting={posting} selectedRoleId={selectedRoleId} selectRole={setSelectedRoleId} selectable={acceptingApplications && !skipsRoleChoice} />
        </article>
        <aside className="hidden lg:block"><DesktopAction posting={posting} selectedRole={selectedRole?.name} enabled={actionEnabled} onAction={() => setView("form")} /></aside>
      </div>

      <MobileAction posting={posting} selectedRole={selectedRole?.name} enabled={actionEnabled} onAction={() => setView("form")} />
    </main>
  );
}

function PostingHero({ posting }: { posting: PublicPosting }) {
  return (
    <section className="border-b border-border pb-7">
      <PostingStatusBadge status={posting.status} />
      <h1 className="mt-4 text-[clamp(30px,4vw,44px)] font-bold leading-tight tracking-[-0.035em]">{posting.performanceTitle}</h1>
      <p className="mt-2 text-lg text-muted-strong">{posting.title}</p>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-strong"><strong className="font-semibold text-foreground">{posting.companyName}</strong><span aria-hidden="true">·</span><span>사업자 확인</span></div>
    </section>
  );
}

function PostingSections({ posting, selectedRoleId, selectRole, selectable }: { posting: PublicPosting; selectedRoleId: string; selectRole: (id: string) => void; selectable: boolean }) {
  return (
    <div className="divide-y divide-border">
      <InfoSection title="공연 정보"><dl className="grid gap-x-6 gap-y-4 text-base sm:grid-cols-[112px_1fr]"><dt className="text-muted">공연 장소</dt><dd>{posting.venue}</dd><dt className="text-muted">모집 기간</dt><dd className="num">{publicPostingDate(posting.recruitmentStart)} ~ {publicPostingDate(posting.recruitmentEnd)} 23:59</dd><dt className="text-muted">출연료</dt><dd>경력과 배역에 따라 협의하며, 면접 시 안내합니다.</dd></dl></InfoSection>
      <InfoSection title={posting.isOpenCall ? "모집 분야" : "모집 배역"} description={selectable ? "지원할 배역을 하나 선택해 주세요." : undefined}><div className="grid gap-3">{posting.roles.map((role) => <RoleCard key={role.id} role={role} selected={role.id === selectedRoleId} disabled={!selectable} onSelect={() => selectRole(role.id)} />)}</div>{posting.isOpenCall ? <p className="mt-3 text-sm text-muted">배역 구분 없이 한 개의 지원서로 접수합니다.</p> : null}</InfoSection>
      <InfoSection title="전형 일정"><ol className="space-y-4 border-l border-border pl-5">{posting.schedule.map((item, index) => <li key={item.title} className="relative"><span aria-hidden="true" className={`absolute -left-[25px] top-2 h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-brand" : "bg-border"}`} /><strong className="block font-semibold">{item.title}</strong><span className="mt-0.5 block text-sm text-muted-strong">{item.detail}</span></li>)}</ol></InfoSection>
      <InfoSection title="제출 자료"><ul className="space-y-4">{posting.documents.map((document) => <li key={document.title} className="flex gap-3"><span className={`mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold ${document.required ? "bg-brand-soft text-brand" : "bg-surface text-muted"}`}>{document.required ? "필수" : "선택"}</span><span><strong className="block font-semibold">{document.title}</strong><span className="mt-0.5 block text-sm text-muted-strong">{document.detail}</span></span></li>)}</ul></InfoSection>
      <InfoSection title="공연사 정보"><p className="font-semibold">{posting.companyName}</p><p className="mt-2 text-muted-strong">{posting.companyDescription}</p><div className="mt-5 rounded-control border border-warn/20 bg-warn-bg px-4 py-3 text-sm leading-6 text-warn">{posting.notice}</div></InfoSection>
    </div>
  );
}

function InfoSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="py-8 sm:py-10"><h2 className="text-xl font-bold tracking-[-0.02em]">{title}</h2>{description ? <p className="mt-2 text-sm text-muted-strong">{description}</p> : null}<div className="mt-5">{children}</div></section>;
}

function RoleCard({ role, selected, disabled, onSelect }: { role: PublicPosting["roles"][number]; selected: boolean; disabled: boolean; onSelect: () => void }) {
  const gender = role.gender === "ANY" ? "성별 무관" : role.gender === "MALE" ? "남성" : "여성";
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onSelect} className={`min-h-24 rounded-card border p-4 text-left transition-[border-color,background-color,box-shadow] ${selected ? "border-brand bg-brand-soft shadow-[var(--shadow-1)]" : "border-border bg-card hover:border-brand-line"} disabled:cursor-default disabled:hover:border-border`}><span className="flex items-center gap-2"><strong className="text-base">{role.name}</strong><span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted-strong">{role.quota}명</span>{selected ? <span className="ml-auto text-sm font-semibold text-brand">선택됨</span> : null}</span><span className="mt-2 block text-sm text-muted-strong">{role.description}</span><span className="mt-1 block text-sm text-muted">만 {role.ageMin}~{role.ageMax}세 · {gender}</span></button>;
}

function DesktopAction({ posting, selectedRole, enabled, onAction }: { posting: PublicPosting; selectedRole?: string; enabled: boolean; onAction: () => void }) {
  return <div className="glass-surface-strong sticky top-24 rounded-modal p-5"><p className="text-sm font-semibold text-muted-strong">지원 요약</p><strong className="mt-3 block text-lg">{selectedRole ?? "지원할 배역을 선택해 주세요"}</strong><p className="mt-2 text-sm text-muted">마감 {publicPostingDate(posting.recruitmentEnd)} 23:59</p><ActionButton posting={posting} enabled={enabled} onAction={onAction} /></div>;
}

function MobileAction({ posting, selectedRole, enabled, onAction }: { posting: PublicPosting; selectedRole?: string; enabled: boolean; onAction: () => void }) {
  return <div className="glass-surface fixed inset-x-0 bottom-0 z-20 border-x-0 border-b-0 lg:hidden"><div className="mx-auto flex max-w-[680px] items-center gap-3 px-5 py-3"><div className="min-w-0 flex-1"><strong className="block truncate text-sm">{selectedRole ?? "배역을 선택해 주세요"}</strong><span className="num block text-xs text-muted">마감 {publicPostingDate(posting.recruitmentEnd)} 23:59</span></div><ActionButton posting={posting} enabled={enabled} onAction={onAction} /></div></div>;
}

function ActionButton({ posting, enabled, onAction }: { posting: PublicPosting; enabled: boolean; onAction: () => void }) {
  const label = posting.status === "UPCOMING" ? "모집 시작 전" : posting.status === "CLOSED" ? "지원 마감" : enabled ? "지원하기" : "배역 선택";
  return <button type="button" disabled={!enabled} onClick={onAction} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:bg-border disabled:text-muted">{label}</button>;
}
