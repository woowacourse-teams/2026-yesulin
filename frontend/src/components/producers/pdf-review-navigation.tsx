"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PdfReviewNavigation({ onNavigate }: { readonly onNavigate?: () => void }) {
  const active = usePathname().startsWith("/producers/pdf-reviews");
  return <nav aria-label="PDF 심사" className="border-b border-sidebar-line px-3 py-3">
    <Link href="/producers/pdf-reviews" onClick={onNavigate} aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center gap-3 rounded-control px-4 text-sm font-bold hover:bg-sidebar-hover ${active ? "bg-sidebar-hover text-white" : "text-sidebar-muted"}`}>
      <span aria-hidden="true">▤</span>PDF 지원자 심사
    </Link>
  </nav>;
}
