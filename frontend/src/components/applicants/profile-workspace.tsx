"use client";

import { useState } from "react";
import { getApplicantProfile } from "@/features/applicants/api";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";
import { ProfileEditor } from "./profile-editor";

export function ApplicantProfileWorkspace() {
  const query = useAuditionQuery("applicant-profile", getApplicantProfile, "프로필을 불러오지 못했습니다.");
  const [saved, setSaved] = useState<ApplicantProfileResponse | null>(null);
  if (query.loading) return <ProfileSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const profile = saved ?? query.data;
  const percent = Math.round((profile.completeness.filled / profile.completeness.standardTotal) * 100);
  return <Container>
    <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:items-end"><div><p className="text-sm font-semibold text-brand">내 프로필</p><h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">한 번 저장하고, 다음 지원에 활용하세요.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-strong">공고가 요구하는 항목과 일치할 때 지원서에 자동으로 채워집니다. 프로필 수정은 이미 제출한 지원서에 영향을 주지 않아요.</p></div><div className="rounded-card border border-brand-line bg-brand-soft p-4"><div className="flex items-end justify-between"><span className="text-sm font-semibold text-brand">표준 항목</span><strong className="num text-xl text-brand">{profile.completeness.filled} / {profile.completeness.standardTotal}</strong></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} /></div></div></header>
    <ProfileEditor key={profile.answers.map((answer) => `${answer.key}:${answer.updatedAt ?? ""}`).join("|")} profile={profile} onSaved={setSaved} />
  </Container>;
}

function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[1040px] px-5 py-9 md:px-8 md:py-12">{children}</div>; }
function ProfileSkeleton() { return <Container><div aria-label="프로필 불러오는 중" className="animate-pulse"><div className="h-9 w-96 max-w-full rounded bg-border" /><div className="mt-4 h-5 w-full max-w-2xl rounded bg-border-soft" /><div className="mt-9 h-14 rounded-card bg-border-soft" /><div className="mt-5 h-[520px] rounded-modal bg-border-soft" /></div></Container>; }
