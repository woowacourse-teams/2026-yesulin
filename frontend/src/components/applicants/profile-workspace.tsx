"use client";

import { ApplicantPageContainer as Container } from "./applicant-page-container";
import { useState } from "react";
import { getApplicantProfile } from "@/features/applicants/api";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";
import { ProfileEditor, type ProfileTab } from "./profile-editor";
import { WorkspaceBreadcrumb, WorkspacePageHeading } from "@/components/landing/workspace-page-heading";

export function ApplicantProfileWorkspace({ initialTab }: { readonly initialTab?: ProfileTab }) {
  const query = useAuditionQuery("applicant-profile", getApplicantProfile, "프로필을 불러오지 못했습니다.");
  const [saved, setSaved] = useState<ApplicantProfileResponse | null>(null);
  const [completed, setCompleted] = useState(false);
  if (query.loading) return <ProfileSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const profile = saved ?? query.data;
  return <Container>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지", href: "/applicants" }, { label: "내 프로필" }]} />
    {!completed ? <WorkspacePageHeading eyebrow="배우 프로필" title="내 프로필"
      description={<>기본정보와 사진으로 내 배우 페이지를 만들어 보세요.<br />추가정보와 영상은 나중에 채워도 괜찮아요.</>}
    /> : null}
    <ProfileEditor profile={profile} onSaved={setSaved} initialTab={initialTab} onCompletionChange={setCompleted} />
  </Container>;
}


function ProfileSkeleton() { return <Container><div role="status" aria-label="프로필 불러오는 중" className="animate-pulse"><div className="h-9 w-96 max-w-full rounded bg-border" /><div className="mt-4 h-5 w-full max-w-2xl rounded bg-border-soft" /><div className="mt-9 h-14 rounded-card bg-border-soft" /><div className="mt-5 h-[520px] rounded-modal bg-border-soft" /></div></Container>; }
