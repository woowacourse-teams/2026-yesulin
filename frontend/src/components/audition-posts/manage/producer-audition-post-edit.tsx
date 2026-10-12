"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { AuditionPostForm } from "@/components/audition-posts/editor/audition-post-form";
import { AuditionRequestError } from "@/features/auditions/api-client";
import type { AuditionPostWrite, EditableAuditionPost } from "@/features/audition-posts/editing";
import { fetchMyAuditionPost, updateMyAuditionPost, uploadMyAuditionPostFile } from "@/features/audition-posts/producer-api";
import { auditionPostRoutes, producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { AuditionPostStatusBadge } from "./audition-post-status-badge";
import { ProducerAuditionPostFrame } from "./producer-audition-post-frame";

type Phase = "loading" | "ready" | "missing" | "failed";

/** 기획사가 자기 공고를 고친다. 저장하면 공개 화면에 바로 반영되고, 저장된 내용으로 폼을 새로 채운다. */
export function ProducerAuditionPostEdit({ postId }: { readonly postId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [post, setPost] = useState<EditableAuditionPost | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const [loadError, setLoadError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    fetchMyAuditionPost(postId)
      .then((next) => {
        if (!active) return;
        setPost(next);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AuditionRequestError && cause.status === 404) {
          setPhase("missing");
          return;
        }
        console.error("[내 공고 조회 실패]", cause);
        setLoadError(cause instanceof Error ? cause.message : "공고를 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [postId, reloadToken]);

  const save = useCallback(async (write: AuditionPostWrite) => {
    await updateMyAuditionPost(postId, write);
    try {
      setPost(await fetchMyAuditionPost(postId));
      setNotice("저장했어요. 공개 화면에 바로 반영됐어요.");
    } catch {
      throw new Error("저장했지만 저장된 내용을 다시 불러오지 못했어요. 새로고침해 주세요.");
    }
  }, [postId]);

  return (
    <ProducerAuditionPostFrame title="공고 수정" description="저장하면 공개 중인 공고에 바로 반영돼요.">
      {phase === "loading" ? <p role="status" className="text-sm text-muted">공고를 불러오는 중이에요.</p> : null}
      {phase === "missing" ? (
        <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">
          공고를 찾을 수 없어요. <Link href={producerAuditionPostRoutes.list} className="font-semibold text-brand underline underline-offset-2">목록으로 돌아가기</Link>
        </p>
      ) : null}
      {phase === "failed" ? <ScreenError message={loadError} onRetry={() => { setPhase("loading"); setReloadToken((value) => value + 1); }} /> : null}
      {phase === "ready" && post ? (
        <>
          <section aria-label="공고 상태" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
            <AuditionPostStatusBadge status={post.status} />
            {post.status === "PUBLISHED" ? (
              <Link href={auditionPostRoutes.detail(post.id)} target="_blank" className="ml-auto font-semibold text-brand underline underline-offset-2">공개 화면</Link>
            ) : (
              <span className="text-muted-strong">운영자가 숨긴 공고예요. 고쳐도 숨김 상태는 그대로예요.</span>
            )}
          </section>
          {/* 저장할 때마다 서버가 정리한 내용으로 폼과 편집기를 새로 채운다. */}
          <AuditionPostForm
            key={post.updatedAt}
            post={post}
            notice={notice}
            submitLabel="저장"
            authorEditable={false}
            uploadFile={uploadMyAuditionPostFile}
            onSubmit={save}
          />
        </>
      ) : null}
    </ProducerAuditionPostFrame>
  );
}
