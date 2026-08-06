"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ModalShell } from "@/components/screening/modal-shell";
import { screeningRoutes } from "@/features/screening/routes";
import { ScreeningTreeNav } from "./screening-tree";

const TITLE_ID = "mobile-producer-navigation-title";

export function MobileProducerNavigation() {
  const pathname = usePathname();

  return <MobileProducerNavigationPanel key={pathname} />;
}

function MobileProducerNavigationPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="glass-surface sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border px-4 lg:hidden">
        <button
          type="button"
          aria-label="공연 관리 메뉴 열기"
          aria-expanded={open}
          aria-controls="mobile-producer-navigation"
          onClick={() => setOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-brand-line bg-brand-soft text-xl leading-none text-brand transition-[background-color,transform] duration-150 hover:bg-brand-soft-strong active:scale-95"
        >
          <span aria-hidden="true" className="grid gap-1">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
        <Link
          href={screeningRoutes.performances}
          className="flex min-h-11 min-w-0 items-center rounded-control px-1"
        >
          <span className="relative block h-9 w-[76px] shrink-0 overflow-hidden">
            <Image
              src="/images/yesulin-logo-transparent.png"
              alt="예술in"
              fill
              sizes="76px"
              priority
              className="object-cover object-center"
            />
          </span>
          <span className="ml-2 truncate text-base font-semibold">공연 관리</span>
        </Link>
      </header>

      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        labelledBy={TITLE_ID}
        placement="left"
        scrimClassName="bg-sidebar/65"
        className="flex h-dvh w-[min(360px,88vw)] flex-col overflow-hidden rounded-r-modal bg-sidebar text-sidebar-text shadow-[var(--shadow-modal)] lg:hidden"
      >
        <div id="mobile-producer-navigation" className="flex min-h-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center gap-3 border-b border-sidebar-line px-4">
            <h2 id={TITLE_ID} className="text-lg font-bold text-white">
              공연 관리
            </h2>
            <button
              type="button"
              aria-label="공연 관리 메뉴 닫기"
              onClick={() => setOpen(false)}
              className="ml-auto min-h-11 rounded-control px-3 text-base text-sidebar-muted transition-[background-color,color,transform] duration-150 hover:bg-sidebar-hover hover:text-white active:scale-[0.97]"
            >
              닫기
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2">
            <ScreeningTreeNav onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </ModalShell>
    </>
  );
}
