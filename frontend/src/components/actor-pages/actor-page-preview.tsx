"use client";

import Link from "next/link";
import { ApplicantPageContainer as Container } from "@/components/applicants/applicant-page-container";
import { ScreenError } from "@/components/auditions/screen-status";
import { WorkspaceBreadcrumb, WorkspacePageHeading } from "@/components/landing/workspace-page-heading";
import { SiteIcon } from "@/components/ui/site-icon";
import { getActorPagePreview, getActorPageSettings } from "@/features/actor-pages/owner-api";
import { applicantRoutes } from "@/features/applicants/routes";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ActorPageView } from "./actor-page-detail";

async function loadPreview() {
  const [preview, settings] = await Promise.all([getActorPagePreview(), getActorPageSettings()]);
  return { preview, settings };
}

/** 공개 상태와 무관하게, 지금 공개하면 로그인하지 않은 방문자에게 보일 내용을 본인이 미리 본다. */
export function ActorPagePreviewScreen() {
  const query = useAuditionQuery("actor-page-preview", loadPreview, "배우 페이지 미리보기를 불러오지 못했어요.");
  const settingsLink = <Link href={applicantRoutes.actorPageSettings} className="workspace-text-link">공개 설정으로 돌아가기 <SiteIcon name="next" size={16} /></Link>;

  return <Container>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지", href: applicantRoutes.home }, { label: "내 프로필", href: applicantRoutes.actorPageSettings }, { label: "배우 페이지 미리보기" }]} />
    <WorkspacePageHeading
      eyebrow="배우 페이지"
      title="미리보기"
      description="로그인하지 않은 방문자에게 보일 모습이에요. 공개로 설정한 항목·사진·영상만 보여요."
      action={settingsLink}
    />
    {query.loading ? <div role="status" aria-label="미리보기 불러오는 중" className="workspace-panel animate-pulse"><div className="grid gap-6 min-[761px]:grid-cols-[minmax(0,320px)_1fr]"><div className="aspect-[3/4] rounded-card bg-border-soft" /><div><div className="h-8 w-1/3 rounded bg-border-soft" /><div className="mt-3 h-5 w-1/2 rounded bg-border-soft" /></div></div></div> : null}
    {!query.loading && (query.error || !query.data) ? <ScreenError message={query.error || "배우 페이지 미리보기를 불러오지 못했어요."} onRetry={query.reload} /> : null}
    {query.data ? <>
      <p role="status" className="mb-4 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm leading-6">
        {query.data.settings.status === "PUBLIC"
          ? "지금 공개 중이에요. 다른 사람에게도 이렇게 보여요."
          : "지금은 비공개라 다른 사람은 볼 수 없어요. 공개하면 이렇게 보여요."}
      </p>
      <section aria-label="배우 페이지 미리보기" className="workspace-panel">
        <ActorPageView actorPage={query.data.preview} preview />
      </section>
    </> : null}
  </Container>;
}
