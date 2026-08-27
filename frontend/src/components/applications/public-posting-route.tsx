"use client";

import { useEffect, useState } from "react";
import { getPublicPosting } from "@/features/applicants/api";
import type { PublicPosting } from "@/features/applications/public-posting";
import { PublicPostingDetail } from "./public-posting-detail";
import { PublicPostingUnavailable } from "./public-posting-status";

export function PublicPostingRoute({ postingId, initialPosting, useProfilePrefill, resumeDraft = false, initialRoleIds = [] }: {
  readonly postingId: string;
  readonly initialPosting: PublicPosting | null;
  readonly useProfilePrefill: boolean;
  readonly resumeDraft?: boolean;
  readonly initialRoleIds?: readonly string[];
}) {
  const [posting, setPosting] = useState(initialPosting);
  const [state, setState] = useState<"loading" | "ready" | "missing">(initialPosting ? "ready" : "loading");

  useEffect(() => {
    if (initialPosting) return;
    let active = true;
    getPublicPosting(postingId)
      .then((next) => {
        if (!active) return;
        setPosting(next);
        setState("ready");
      })
      .catch((cause) => {
        if (active) {
          console.error("[공개 공고 조회 실패]", cause);
          setState("missing");
        }
      });
    return () => { active = false; };
  }, [initialPosting, postingId]);

  if (state === "loading") return <PublicPostingLoading />;
  if (state === "missing" || !posting) return <PublicPostingUnavailable />;
  return <PublicPostingDetail posting={posting} useProfilePrefill={useProfilePrefill} resumeDraft={resumeDraft} initialRoleIds={initialRoleIds} />;
}

function PublicPostingLoading() {
  return <main aria-label="공개 공고 불러오는 중" className="min-h-screen bg-surface px-5 py-10 text-foreground">
    <div className="mx-auto max-w-[1120px] animate-pulse">
      <div className="h-8 w-40 rounded bg-border-soft" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[560px] rounded-modal bg-border-soft" />
        <div className="h-72 rounded-card bg-border" />
      </div>
      <p className="sr-only">공고 정보를 불러오고 있습니다.</p>
    </div>
  </main>;
}
