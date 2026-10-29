"use client";

import { ApplicantPageContainer as Container } from "./applicant-page-container";
import { useState } from "react";
import { getApplicantProfile } from "@/features/applicants/api";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";
import { ProfileEditor, type ProfileTab } from "./profile-editor";
import { WorkspaceBreadcrumb, WorkspacePageHeading } from "@/components/landing/workspace-page-heading";

export function ApplicantProfileWorkspace({ initialTab, eventId }: { readonly initialTab?: ProfileTab; readonly eventId?: number }) {
  const query = useAuditionQuery("applicant-profile", getApplicantProfile, "프로필을 불러오지 못했습니다.");
  const [saved, setSaved] = useState<ApplicantProfileResponse | null>(null);
  if (query.loading) return <ProfileSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const profile = saved ?? query.data;
  const percent = Math.min(100, Math.max(0, Math.round(profile.completeness.filled / Math.max(1, profile.completeness.standardTotal) * 100)));
  return <Container>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지", href: "/applicants" }, { label: "내 프로필" }]} />
    <WorkspacePageHeading eyebrow="배우 프로필" title="내 프로필"
      description={<>한 번 저장한 정보로 다음 지원을 편리하게 준비하세요.<br />이미 제출한 지원서는 프로필을 수정해도 바뀌지 않아요.</>}
      action={<div className="applicant-profile-meter"><div><span>필수 기본정보</span><strong className="num">{profile.completeness.filled} / {profile.completeness.standardTotal}</strong></div><div className="workspace-progress" role="progressbar" aria-label="필수 기본정보 작성률" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: percent + "%" }} /></div></div>}
    />
    <ProfileEditor eventId={eventId} profile={profile} onSaved={setSaved} initialTab={initialTab} />
  </Container>;
}


function ProfileSkeleton() { return <Container><div role="status" aria-label="프로필 불러오는 중" className="animate-pulse"><div className="h-9 w-96 max-w-full rounded bg-border" /><div className="mt-4 h-5 w-full max-w-2xl rounded bg-border-soft" /><div className="mt-9 h-14 rounded-card bg-border-soft" /><div className="mt-5 h-[520px] rounded-modal bg-border-soft" /></div></Container>; }
