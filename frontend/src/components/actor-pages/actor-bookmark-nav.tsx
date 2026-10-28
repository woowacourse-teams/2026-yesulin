"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { actorBookmarkRoutes } from "@/features/actor-pages/bookmark-api";

/** 공연사 사이드바의 관심 배우 메뉴. */
export function ActorBookmarkNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname.startsWith(actorBookmarkRoutes.list());
  return (
    <nav aria-label="관심 배우" className="border-b border-sidebar-line px-2 pb-4 pt-2">
      <div className="flex items-center gap-0.5">
        <span aria-hidden="true" className="h-11 w-11 shrink-0 lg:h-[30px] lg:w-[26px]" />
        <Link
          href={actorBookmarkRoutes.list()}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-dense ${active ? "text-brand-line" : "text-sidebar-muted hover:text-white"}`}
        >
          관심 배우
        </Link>
      </div>
    </nav>
  );
}
