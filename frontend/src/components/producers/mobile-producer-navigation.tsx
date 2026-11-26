"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { ModalShell } from "@/components/auditions/modal-shell";
import { ProducerAccountPanel } from "./producer-account-panel";
import { ProducerSidebarHeader } from "./producer-sidebar-header";
import { ProducerSidebarMenu } from "./producer-sidebar-menu";
import { useRouteDisclosure } from "./use-route-disclosure";
import { ProducerDashboardLink } from "./producer-dashboard-link";

const TITLE_ID = "mobile-producer-navigation-title";

export function MobileProducerNavigation() {
  const pathname = usePathname();
  const { open, openDisclosure, closeDisclosure } = useRouteDisclosure(pathname);

  return (
    <>
      <header className="glass-surface sticky top-0 z-30 flex min-h-16 items-center gap-2 border-b border-border px-4 lg:hidden">
        <button
          type="button"
          aria-label="관리 메뉴 열기"
          aria-expanded={open}
          aria-controls="mobile-producer-navigation"
          onClick={openDisclosure}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-control border border-brand-line bg-brand-soft text-xl leading-none text-brand transition-[background-color,transform] duration-150 hover:bg-brand-soft-strong active:scale-95"
        >
          <span aria-hidden="true" className="grid gap-1">
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
            <span className="block h-0.5 w-5 rounded-full bg-current" />
          </span>
        </button>
        <Link
          href="/"
          aria-label="예술in 홈"
          className="flex min-h-11 min-w-0 items-center rounded-control px-1"
        >
          <span className="relative block h-10 w-[70px] shrink-0">
            <Image
              src="/images/yesulin-logo.png"
              alt="예술in"
              fill
              sizes="70px"
              priority
              className="object-contain"
            />
          </span>
        </Link>
        <ProducerDashboardLink />
        <div className="ml-auto shrink-0">
          <LogoutButton className="min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-brand-soft hover:text-brand" />
        </div>
      </header>

      <ModalShell
        open={open}
        onClose={closeDisclosure}
        labelledBy={TITLE_ID}
        placement="left"
        scrimClassName="bg-sidebar/65"
        className="flex h-dvh w-[min(360px,88vw)] flex-col overflow-hidden rounded-r-modal border-r border-sidebar-line bg-sidebar text-sidebar-text shadow-[var(--shadow-modal)] lg:hidden"
      >
        <div id="mobile-producer-navigation" className="flex min-h-0 flex-1 flex-col">
          <ProducerSidebarHeader titleId={TITLE_ID} closeLabel="관리 메뉴 닫기" autoFocus onClose={closeDisclosure} />
          <ProducerSidebarMenu onNavigate={closeDisclosure} reviewSlot="mobile" />
          <ProducerAccountPanel />
        </div>
      </ModalShell>
    </>
  );
}
