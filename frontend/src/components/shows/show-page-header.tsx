import Image from "next/image";
import Link from "next/link";
import { showRoutes } from "@/features/shows/types";

/** 관객 화면 머리말. 오디션 메뉴와 로그인 버튼 없이 공연 목록으로만 돌아간다. */
export function ShowPageHeader() {
  return (
    <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-16 max-w-[880px] items-center gap-2 px-5 md:px-8 min-[1200px]:max-w-[1200px]">
        <Link
          href={showRoutes.list}
          aria-label="예술in 공연 예매 목록"
          className="inline-flex min-h-11 items-center gap-3 rounded-control px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Image src="/images/yesulin-logo.png" alt="" width={84} height={49} priority className="h-auto w-[84px] object-contain" />
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <span className="text-sm font-semibold text-foreground">공연 예매</span>
        </Link>
      </div>
    </header>
  );
}
