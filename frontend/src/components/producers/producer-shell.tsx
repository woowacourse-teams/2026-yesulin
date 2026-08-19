import Image from "next/image";
import Link from "next/link";
import { auditionRoutes } from "@/features/auditions/routes";
import { AuditionTreeNav } from "./audition-tree";
import { SidebarResizer } from "./sidebar-resizer";
import { MobileProducerNavigation } from "./mobile-producer-navigation";
import { ProducerAccountPanel } from "./producer-account-panel";

export function ProducerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#producer-main"
        className="fixed left-4 top-4 z-50 flex min-h-11 -translate-y-24 items-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden flex-col overflow-y-auto overflow-x-hidden border-r border-sidebar-line bg-sidebar text-sidebar-text lg:flex lg:w-[var(--sidebar-width)]">
        <Link
          href={auditionRoutes.performances}
          aria-label="예술in 공연 관리 홈"
          className="flex px-4 pb-3 pt-3"
        >
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

        <AuditionTreeNav />

        <div className="mt-auto"><ProducerAccountPanel /></div>
      </aside>

      <SidebarResizer />

      <div className="min-w-0 lg:ml-[var(--sidebar-width)]">
        <MobileProducerNavigation />
        <main id="producer-main" className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
