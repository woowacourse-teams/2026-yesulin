"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { auditionRoutes } from "@/features/auditions/routes";
import { AuditionTreeNav } from "./audition-tree";
import { SidebarResizer } from "./sidebar-resizer";
import { MobileProducerNavigation } from "./mobile-producer-navigation";
import { ProducerAccountPanel } from "./producer-account-panel";
import { ProducerNavigationProvider } from "./producer-navigation-context";

const DESKTOP_NAVIGATION_TITLE = "focused-producer-navigation-title";
const REVIEW_PATH = /^\/producers\/roles\/[^/]+\/applications\/[^/]+$/;

export function ProducerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <ProducerShellFrame key={pathname} focusMode={REVIEW_PATH.test(pathname)}>{children}</ProducerShellFrame>;
}

function ProducerShellFrame({ children, focusMode }: { readonly children: React.ReactNode; readonly focusMode: boolean }) {
  const [navigationOpen, setNavigationOpen] = useState(false);

  return (
    <ProducerNavigationProvider value={{ focusMode, openSidebar: () => setNavigationOpen(true) }}>
      <div className="min-h-screen">
        <a
          href="#producer-main"
          className="fixed left-4 top-4 z-50 flex min-h-11 -translate-y-24 items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white focus:translate-y-0"
        >
          본문으로 바로가기
        </a>

        {!focusMode ? (
          <>
            <aside className="fixed bottom-0 left-0 top-0 z-30 hidden flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-line bg-sidebar text-sidebar-text lg:flex lg:w-[var(--sidebar-width)]">
              <SidebarLogo />
              <AuditionTreeNav />
              <div className="mt-auto"><ProducerAccountPanel /></div>
            </aside>
            <SidebarResizer />
          </>
        ) : null}

        <ModalShell
          open={focusMode && navigationOpen}
          onClose={() => setNavigationOpen(false)}
          labelledBy={DESKTOP_NAVIGATION_TITLE}
          placement="left"
          scrimClassName="bg-sidebar/55"
          className="hidden h-dvh w-[300px] flex-col overflow-hidden rounded-r-modal border-r border-sidebar-line bg-sidebar text-sidebar-text shadow-[var(--shadow-modal)] lg:flex"
        >
          <header className="flex min-h-16 items-center gap-3 border-b border-sidebar-line px-4">
            <h2 id={DESKTOP_NAVIGATION_TITLE} className="text-base font-bold text-white">공연 관리</h2>
            <button
              type="button"
              data-autofocus="true"
              onClick={() => setNavigationOpen(false)}
              className="ml-auto min-h-11 rounded-control px-3 text-sm font-semibold text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
            >
              닫기
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <AuditionTreeNav onNavigate={() => setNavigationOpen(false)} />
          </div>
          <ProducerAccountPanel />
        </ModalShell>

        <div className={`min-w-0 ${focusMode ? "" : "lg:ml-[var(--sidebar-width)]"}`}>
          <MobileProducerNavigation />
          <main id="producer-main" className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </ProducerNavigationProvider>
  );
}

function SidebarLogo() {
  return (
    <Link href={auditionRoutes.performances} aria-label="예술in 공연 관리 홈" className="flex px-4 pb-3 pt-3">
      <span className="relative block h-14 w-24 shrink-0">
        <Image
          src="/images/yesulin-logo-transparent.png"
          alt="예술in"
          fill
          sizes="96px"
          priority
          className="object-contain brightness-0 invert"
        />
      </span>
    </Link>
  );
}
