"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";
import { AuditionTreeNav } from "./audition-tree";
import { SidebarResizer } from "./sidebar-resizer";
import { MobileProducerNavigation } from "./mobile-producer-navigation";
import { ProducerAccountPanel } from "./producer-account-panel";
import { ProducerNavigationProvider } from "./producer-navigation-context";
import { ProducerSidebarHeader } from "./producer-sidebar-header";

const DESKTOP_NAVIGATION_TITLE = "focused-producer-navigation-title";
const REVIEW_PATH = /^\/producers\/roles\/[^/]+\/submissions\/[^/]+$/;

export function ProducerShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <ProducerShellFrame key={pathname} focusMode={REVIEW_PATH.test(pathname)}>{children}</ProducerShellFrame>;
}

function ProducerShellFrame({ children, focusMode }: { readonly children: React.ReactNode; readonly focusMode: boolean }) {
  const [navigationOpen, setNavigationOpen] = useState(!focusMode);

  return (
    <ProducerNavigationProvider value={{ focusMode, sidebarOpen: navigationOpen, openSidebar: () => setNavigationOpen(true) }}>
      <div className="min-h-screen">
        <a
          href="#producer-main"
          className="fixed left-4 top-4 z-50 flex min-h-11 -translate-y-24 items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white focus:translate-y-0"
        >
          본문으로 바로가기
        </a>

        {!focusMode && navigationOpen ? (
          <>
            <aside className="fixed bottom-0 left-0 top-0 z-30 hidden flex-col overflow-hidden rounded-r-modal border-r border-sidebar-line bg-sidebar text-sidebar-text lg:flex lg:w-[var(--sidebar-width)]">
              <ProducerSidebarHeader onClose={() => setNavigationOpen(false)} />
              <div className="min-h-0 flex-1 overflow-y-auto py-2">
                <AuditionTreeNav />
              </div>
              <ProducerAccountPanel />
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
          <ProducerSidebarHeader titleId={DESKTOP_NAVIGATION_TITLE} autoFocus onClose={() => setNavigationOpen(false)} />
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <AuditionTreeNav onNavigate={() => setNavigationOpen(false)} />
          </div>
          <ProducerAccountPanel />
        </ModalShell>

        <div className={`min-w-0 ${focusMode || !navigationOpen ? "" : "lg:ml-[var(--sidebar-width)]"}`}>
          <MobileProducerNavigation />
          <main id="producer-main" className="min-h-screen">
            {children}
          </main>
        </div>
      </div>
    </ProducerNavigationProvider>
  );
}
