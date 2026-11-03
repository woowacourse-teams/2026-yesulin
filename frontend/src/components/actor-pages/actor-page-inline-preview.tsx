"use client";

import { useEffect, useState } from "react";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import type { ActorPageSettings } from "@/features/actor-pages/settings";
import type { ActorPageContent } from "@/features/actor-pages/types";
import { getActorPagePreview } from "@/features/actor-pages/owner-api";
import { ScreenError } from "@/components/auditions/screen-status";
import { ActorPageView } from "./actor-page-detail";

/** 서버가 공개 범위를 적용한 저장본만 표시한다. 편집 폼은 부모에 그대로 남긴다. */
export function ActorPageInlinePreview({ profile, settings, unsaved }: {
  readonly profile: ApplicantProfileResponse;
  readonly settings: ActorPageSettings | null;
  readonly unsaved: boolean;
}) {
  const [state, setState] = useState<{ page?: ActorPageContent; error?: string }>({});
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    void getActorPagePreview().then((page) => { if (active) setState({ page }); }).catch(() => {
      if (active) setState({ error: "미리보기를 불러오지 못했어요. 작성한 내용은 입력 화면에 남아 있어요." });
    });
    return () => { active = false; };
  }, [profile, settings, retry]);
  return <section className="workspace-panel min-w-0" aria-label="저장된 배우 페이지 미리보기">
    <h2 tabIndex={-1} id="profile-preview-title" className="text-xl font-bold outline-none">페이지 미리보기</h2>
    <p role="status" className="mt-2 text-sm leading-6 text-muted-strong">저장된 정보와 공개로 선택한 사진·영상만 보여요. {unsaved ? "아직 저장하지 않은 입력값은 반영되지 않았어요. 입력으로 돌아가 저장해 주세요." : "아이디는 저장한 값으로 표시돼요."}</p>
    {state.error ? <div className="mt-5"><ScreenError message={state.error} onRetry={() => { setState({}); setRetry((value) => value + 1); }} /></div> : state.page ? <ActorPageView actorPage={state.page} preview compact /> : <div role="status" className="mt-5 animate-pulse"><p className="text-sm text-muted">저장된 페이지를 불러오는 중…</p><div className="mt-4 aspect-[3/4] rounded-card bg-border-soft" /></div>}
  </section>;
}
