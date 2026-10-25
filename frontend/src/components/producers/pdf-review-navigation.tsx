"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PdfReviewNavigation({ onNavigate }: { readonly onNavigate?: () => void }) {
  const active = usePathname().startsWith("/producers/pdf-reviews");
  return <nav aria-label="PDF 심사" className="border-b border-sidebar-line px-3 py-3"><div className="flex items-center gap-0.5">
    <Link href="/producers/pdf-reviews" onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={`flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-control px-4 text-sm font-bold hover:bg-sidebar-hover ${active ? "bg-sidebar-hover text-white" : "text-sidebar-muted"}`}>
      <span aria-hidden="true">▤</span>PDF 지원자 심사
    </Link>
    <Link href="/producers/pdf-reviews?create=1" onClick={onNavigate} aria-label="심사함 추가하기" title="심사함 추가하기"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[30px]">+</Link>
    </div>
  </nav>;
}
