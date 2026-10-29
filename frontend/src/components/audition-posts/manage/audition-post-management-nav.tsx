"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";

/** 직접 올리거나 관리자가 연결한 공고를 보는 기획사 기본 메뉴. */
export function AuditionPostManagementNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname.startsWith(producerAuditionPostRoutes.list);
  return (
    <nav aria-label="내 오디션 공고" className="border-b border-sidebar-line px-2 pb-4 pt-2">
      <div className="flex items-center gap-0.5">
        <span aria-hidden="true" className="h-11 w-11 shrink-0 lg:h-[30px] lg:w-[26px]" />
        <Link
          href={producerAuditionPostRoutes.list}
          onClick={onNavigate}
          aria-current={pathname === producerAuditionPostRoutes.list ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-dense ${active ? "text-brand-line" : "text-sidebar-muted hover:text-white"}`}
        >
          내 오디션 공고
        </Link>
        <Link
          href={producerAuditionPostRoutes.create}
          onClick={onNavigate}
          aria-label="공고 올리기"
          title="공고 올리기"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[30px]"
        >
          +
        </Link>
      </div>
    </nav>
  );
}
