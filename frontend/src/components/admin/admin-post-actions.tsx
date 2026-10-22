"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PiDotsThree } from "react-icons/pi";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminAuditionPost } from "@/features/admin/types";

/** 수정 작업을 접어 두고, 열면 링크·버튼을 Tab으로 이동한다. Esc는 더보기 버튼으로 초점을 돌린다. */
export function AdminPostActions({ post, importing, onCompany, onImport }: {
  readonly post: AdminAuditionPost;
  readonly importing: string | null;
  readonly onCompany: () => void;
  readonly onImport: (otrId: string) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const itemClass = "flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-foreground hover:bg-surface disabled:text-muted";

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${post.title} 더보기`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-control border border-border bg-card text-muted-strong hover:bg-surface hover:text-foreground"
      >
        <PiDotsThree aria-hidden="true" size={24} />
      </button>
      {open ? (
        <div id={id} role="group" aria-label="공고 작업" className="absolute right-0 top-[calc(100%+8px)] z-30 w-56 max-w-[calc(100vw-4rem)] rounded-card border border-border bg-card p-2 shadow-[var(--shadow-2)]">
          <Link href={adminAuditionPostRoutes.edit(post.id)} onClick={() => setOpen(false)} className={itemClass}>공고 수정</Link>
          <button type="button" onClick={() => { setOpen(false); onCompany(); }} className={itemClass}>
            {post.companyId === null ? "공연사 정보 쓰기" : "공연사 정보 수정"}
          </button>
          {post.sourceUrl ? <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={itemClass}>원문 보기<span className="sr-only"> (새 창)</span></a> : null}
          {post.sourceUrl && post.externalId ? (
            <button type="button" disabled={importing !== null} onClick={() => { setOpen(false); if (post.externalId) onImport(post.externalId); }} className={itemClass}>
              {importing === post.externalId ? "다시 가져오는 중…" : "원문으로 다시 가져오기"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
