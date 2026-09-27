"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { showRoutes } from "@/features/shows/types";

/** 기획사 사이드바의 무료 공연 메뉴. 공연 목록은 관리 화면에서 보여 준다. */
export function ShowManagementNav({ onNavigate }: { readonly onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname.startsWith(showRoutes.manageList);
  return (
    <nav aria-label="무료 공연" className="border-b border-sidebar-line px-2 pb-4 pt-2">
      <div className="flex items-center gap-0.5">
        <span aria-hidden="true" className="h-11 w-11 shrink-0 lg:h-[30px] lg:w-[26px]" />
        <Link
          href={showRoutes.manageList}
          onClick={onNavigate}
          aria-current={pathname === showRoutes.manageList ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-dense ${active ? "text-brand-line" : "text-sidebar-muted hover:text-white"}`}
        >
          무료 공연 관리
        </Link>
        <Link
          href={`${showRoutes.manageList}?create=1`}
          onClick={onNavigate}
          aria-label="무료 공연 등록"
          title="무료 공연 등록"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[30px]"
        >
          +
        </Link>
      </div>
    </nav>
  );
}
