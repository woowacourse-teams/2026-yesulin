import Image from "next/image";
import Link from "next/link";
import { PHASE_LABELS } from "@/features/screening/labels";
import { screeningRoutes } from "@/features/screening/routes";
import { POSTING_PHASES } from "@/features/screening/types";
import { PhaseTag } from "@/components/screening/status-badge";
import { ScreeningTreeNav } from "./screening-tree";
import { SidebarResizer } from "./sidebar-resizer";

export function ProducerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <a
        href="#producer-main"
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden flex-col overflow-y-auto overflow-x-hidden border-r border-border bg-card lg:flex lg:w-[var(--sidebar-width)]">
        <Link
          href={screeningRoutes.performances}
          aria-label="예술in 공연 관리 홈"
          className="flex px-4 pb-3 pt-3"
        >
          <span className="relative block h-14 w-[118px] shrink-0 overflow-hidden">
            <Image
              src="/images/yesulin-logo-transparent.png"
              alt="예술in"
              fill
              sizes="118px"
              className="object-cover object-center"
            />
          </span>
        </Link>

        <ScreeningTreeNav />

        <div className="mt-auto flex flex-col gap-1.5 border-t border-border-soft px-4 py-[11px] text-[10.5px] text-muted">
          <div className="flex flex-wrap gap-1.5">
            {POSTING_PHASES.map((phase) => (
              <PhaseTag key={phase} phase={phase} />
            ))}
          </div>
          <span>지난 시즌 공고도 계속 열람할 수 있습니다</span>
          <span className="sr-only">
            {POSTING_PHASES.map((phase) => PHASE_LABELS[phase]).join(", ")}
          </span>
        </div>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/images/ninejin-group-logo.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-full border border-border bg-white object-contain"
            />
            <div className="min-w-0 text-[11.5px] leading-tight">
              <div className="truncate font-semibold">나인진엔터테인먼트</div>
              <div className="text-muted">캐스팅 담당</div>
            </div>
          </div>
        </div>
      </aside>

      <SidebarResizer />

      <div className="min-w-0 lg:ml-[var(--sidebar-width)]">
        <main id="producer-main" className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
