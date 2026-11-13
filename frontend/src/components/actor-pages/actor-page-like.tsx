"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/auditions/toast";
import { getActorPageLikes, likeActorPage, unlikeActorPage, type ActorPageLikes } from "@/features/actor-pages/like-api";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { errorMessage } from "@/features/auditions/use-audition-query";

const BASE = "inline-flex min-h-11 items-center gap-2 rounded-control border px-4 text-sm font-semibold";
const IDLE = "border-border bg-card text-foreground hover:border-brand-line";

/**
 * 배우 페이지의 좋아요. 공개 응답은 보는 사람과 무관하게 같으므로 수와 내 상태는 따로 읽는다. 읽지 못하면 잘못 그리지
 * 않도록 버튼을 숨긴다. 로그인하지 않았으면 로그인으로, 내 페이지와 배우가 아닌 계정은 수만 보인다.
 */
export function ActorPageLikeButton({ publicId, handle, name }: {
  readonly publicId: string;
  readonly handle: string;
  readonly name: string;
}) {
  const toast = useToast();
  const [likes, setLikes] = useState<ActorPageLikes | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;
    getActorPageLikes(publicId)
      .then((result) => { if (active) setLikes(result); })
      .catch((cause) => console.error("[배우 좋아요 조회 실패]", cause));
    return () => { active = false; };
  }, [publicId]);

  const toggle = useCallback(async () => {
    if (!likes || pending) return;
    const wasLiked = likes.me.liked;
    setPending(true);
    try {
      setLikes(await (wasLiked ? unlikeActorPage(publicId) : likeActorPage(publicId)));
    } catch (cause) {
      console.error("[배우 좋아요 실패]", cause);
      toast(errorMessage(cause, wasLiked ? "좋아요를 취소하지 못했어요." : "좋아요를 누르지 못했어요."), { type: "error" });
    } finally {
      setPending(false);
    }
  }, [likes, pending, publicId, toast]);

  if (!likes) return null;
  const { me } = likes;
  const count = <span className="num">{likes.count.toLocaleString("ko-KR")}</span>;

  if (me.canLike) {
    return (
      <button
        type="button"
        aria-pressed={me.liked}
        aria-label={`${name} 배우 좋아요 ${likes.count.toLocaleString("ko-KR")}`}
        disabled={pending}
        onClick={() => void toggle()}
        className={`${BASE} disabled:opacity-60 ${me.liked ? "border-brand bg-brand text-white hover:bg-brand-strong" : IDLE}`}
      >
        <span aria-hidden="true">{me.liked ? "♥" : "♡"}</span>좋아요 {count}
      </button>
    );
  }
  if (!me.loggedIn) {
    return (
      <Link
        href={`/login?returnTo=${encodeURIComponent(actorPageRoutes.detail(handle))}`}
        aria-label={`${name} 배우 좋아요 ${likes.count.toLocaleString("ko-KR")}, 로그인이 필요해요`}
        className={`${BASE} ${IDLE}`}
      >
        <span aria-hidden="true">♡</span>좋아요 {count}
      </Link>
    );
  }
  return (
    <p className={`${BASE} border-border-soft bg-surface text-muted-strong`}>
      <span aria-hidden="true">♡</span>{me.owner ? "받은 좋아요" : "좋아요"} {count}
    </p>
  );
}
