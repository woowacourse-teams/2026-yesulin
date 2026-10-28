"use client";

import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { useToast } from "@/components/auditions/toast";
import { getActorBookmarkIds, removeActorBookmark, saveActorBookmark } from "@/features/actor-pages/bookmark-api";
import { errorMessage } from "@/features/auditions/use-audition-query";

type ActorBookmarks = {
  /** 이메일 인증을 마친 공연사에게만 저장 버튼을 보인다. */
  readonly enabled: boolean;
  readonly isSaved: (publicId: string) => boolean;
  readonly isPending: (publicId: string) => boolean;
  readonly toggle: (publicId: string, name: string) => Promise<void>;
};

const DISABLED: ActorBookmarks = {
  enabled: false,
  isSaved: () => false,
  isPending: () => false,
  toggle: async () => {},
};

const ActorBookmarksContext = createContext<ActorBookmarks>(DISABLED);

/**
 * 공개 응답은 누가 보든 같으므로, 저장 버튼 상태는 공연사 전용 API로 저장한 페이지 ID를 한 번 받아 화면에서 그린다.
 * 목록 카드마다 따로 묻지 않도록 배우 목록·배우 페이지·관심 배우 화면을 이 Provider로 감싼다.
 */
export function ActorBookmarksProvider({ children }: { readonly children: ReactNode }) {
  const { session } = useAuthSession();
  const toast = useToast();
  const producer = session?.role === "PRODUCER" && session.producerStatus === "ACTIVE";
  const [saved, setSaved] = useState<ReadonlySet<string> | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!producer) return;
    let active = true;
    getActorBookmarkIds()
      .then((result) => { if (active) setSaved(new Set(result.publicIds)); })
      .catch((cause) => {
        // 버튼 상태를 모르면 잘못 그리지 않도록 버튼을 숨긴다.
        console.error("[관심 배우 저장 목록 조회 실패]", cause);
      });
    return () => { active = false; };
  }, [producer]);

  const toggle = useCallback(async (publicId: string, name: string) => {
    if (!saved || pending.has(publicId)) return;
    const wasSaved = saved.has(publicId);
    setPending((current) => new Set(current).add(publicId));
    try {
      if (wasSaved) await removeActorBookmark(publicId);
      else await saveActorBookmark(publicId);
      setSaved((current) => {
        const next = new Set(current);
        if (wasSaved) next.delete(publicId);
        else next.add(publicId);
        return next;
      });
      toast(wasSaved ? `${name} 배우를 관심 배우에서 뺐어요.` : `${name} 배우를 관심 배우에 저장했어요.`, { type: "success" });
    } catch (cause) {
      console.error("[관심 배우 저장 실패]", cause);
      toast(errorMessage(cause, wasSaved ? "관심 배우에서 빼지 못했어요." : "관심 배우에 저장하지 못했어요."), { type: "error" });
    } finally {
      setPending((current) => {
        const next = new Set(current);
        next.delete(publicId);
        return next;
      });
    }
  }, [pending, saved, toast]);

  const value = useMemo<ActorBookmarks>(() => producer && saved ? {
    enabled: true,
    isSaved: (publicId) => saved.has(publicId),
    isPending: (publicId) => pending.has(publicId),
    toggle,
  } : DISABLED, [pending, producer, saved, toggle]);

  return <ActorBookmarksContext value={value}>{children}</ActorBookmarksContext>;
}

export function useActorBookmarks() {
  return use(ActorBookmarksContext);
}

/** 공연사에게만 보인다. `overlay`는 목록 카드의 사진 위에 얹는 작은 버튼이다. */
export function ActorBookmarkButton({
  publicId,
  name,
  variant = "default",
}: {
  readonly publicId: string;
  readonly name: string;
  readonly variant?: "default" | "overlay";
}) {
  const bookmarks = useActorBookmarks();
  if (!bookmarks.enabled) return null;
  const saved = bookmarks.isSaved(publicId);
  const pending = bookmarks.isPending(publicId);
  const tone = saved ? "border-brand bg-brand text-white hover:bg-brand-strong" : "border-border bg-card text-foreground hover:border-brand-line";
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={variant === "overlay" ? `${name} 관심 배우 저장` : "관심 배우 저장"}
      disabled={pending}
      onClick={() => void bookmarks.toggle(publicId, name)}
      className={variant === "overlay"
        ? `inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-xs font-semibold shadow-[var(--shadow-1)] disabled:opacity-60 ${tone}`
        : `inline-flex min-h-11 items-center gap-1 rounded-control border px-4 text-sm font-semibold disabled:opacity-60 ${tone}`}
    >
      {saved ? <>관심 배우<span aria-hidden="true">✓</span></> : "관심 배우 저장"}
    </button>
  );
}
