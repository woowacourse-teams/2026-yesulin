"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuditionTree } from "@/features/auditions/api";
import { PHASE_LABELS } from "@/features/auditions/labels";
import { postingEntryHref, auditionRoutes } from "@/features/auditions/routes";
import { AUDITION_TREE_CHANGED } from "@/features/auditions/events";
import type { AuditionTree, AuditionTreeNode } from "@/features/auditions/types";
import { PhaseTag } from "@/components/auditions/status-badge";

/** 현재 경로에서 트리가 가리켜야 할 위치를 되짚는다. */
function locate(tree: AuditionTree | null, pathname: string) {
  const [, , section, id] = pathname.split("/");
  if (!tree || !id) return { performanceId: null, postingId: null };

  if (section === "performances") return { performanceId: id, postingId: null };

  for (const performance of tree.performances) {
    for (const posting of performance.postings) {
      const hit =
        (section === "postings" && posting.id === id) ||
        (section === "roles" && posting.roleIds.some((roleId) => roleId === id));
      if (hit) return { performanceId: performance.id as string, postingId: posting.id as string };
    }
  }

  return { performanceId: null, postingId: null };
}

export function AuditionTreeNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [tree, setTree] = useState<AuditionTree | null>(null);
  const [rootOpen, setRootOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = () => {
      getAuditionTree().then((response) => {
        if (active) setTree(response);
      });
    };
    load();
    window.addEventListener(AUDITION_TREE_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(AUDITION_TREE_CHANGED, load);
    };
  }, []);

  const { performanceId, postingId } = locate(tree, pathname);
  const atRoot = pathname === auditionRoutes.performances;

  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="px-2 pb-4 pt-1">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="공연 목록 펼치기/접기"
          aria-expanded={rootOpen}
          onClick={() => setRootOpen((open) => !open)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[26px]"
        >
          <Caret open={rootOpen} />
        </button>
        <Link
          href={auditionRoutes.performances}
          onClick={onNavigate}
          className={`flex min-h-11 flex-1 items-center whitespace-nowrap rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold tracking-[0.01em] transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-[13px] lg:uppercase lg:tracking-[0.03em] ${
            atRoot ? "bg-sidebar-hover text-brand-line" : "text-sidebar-muted hover:text-white"
          }`}
        >
          공연 관리
        </Link>
      </div>

      {rootOpen && tree ? (
        <div className="ml-3.5 border-l border-sidebar-line pl-[15px]" role="tree">
          {tree.performances.map((performance) => (
            <TreeBranch
              key={performance.id}
              performance={performance}
              open={!collapsed.has(performance.id)}
              activePerformance={performanceId === performance.id}
              activePostingId={postingId}
              onToggle={() => toggle(performance.id)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TreeBranch({
  performance,
  open,
  activePerformance,
  activePostingId,
  onToggle,
  onNavigate,
}: {
  performance: AuditionTreeNode;
  open: boolean;
  activePerformance: boolean;
  activePostingId: string | null;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="relative flex items-center gap-0.5 before:absolute before:-left-[15px] before:top-4 before:h-px before:w-[11px] before:bg-sidebar-line">
        <button
          type="button"
          aria-label={`${performance.title} 공고 펼치기/접기`}
          aria-expanded={open}
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[26px]"
        >
          <Caret open={open} small />
        </button>
        <Link
          href={auditionRoutes.performance(performance.id)}
          onClick={onNavigate}
          aria-current={activePerformance && !activePostingId ? "page" : undefined}
          className={`flex min-h-11 flex-1 items-center whitespace-nowrap rounded-control px-2 py-[7px] text-left text-base font-semibold transition-colors lg:min-h-0 lg:text-[13px] ${
            activePerformance && !activePostingId
              ? "bg-brand text-white"
              : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
          }`}
        >
          <span className="flex-1 truncate">{performance.title}</span>
        </Link>
      </div>

      {open ? (
        <div className="ml-[9px] border-l border-sidebar-line pb-1 pl-[15px] pt-0.5" role="group">
          {performance.postings.map((posting) => {
            const active = activePostingId === posting.id;
            /* 아직 시작 전인 공고는 지원자가 없으므로 공고 선택 화면에 머무르게 한다 */
            const upcoming = posting.phase === "UPCOMING";

            return (
              <Link
                key={posting.id}
                href={upcoming ? auditionRoutes.performance(performance.id) : postingEntryHref(posting)}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={upcoming ? `${posting.title} — ${PHASE_LABELS.UPCOMING}` : posting.title}
                className={`relative flex min-h-11 w-full items-center gap-1.5 whitespace-nowrap rounded-control px-2 py-[7px] text-base leading-tight transition-colors before:absolute before:-left-[15px] before:top-4 before:h-px before:w-[11px] before:bg-sidebar-line lg:min-h-0 lg:text-[12.5px] ${
                  active ? "bg-brand font-semibold text-white" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{posting.title}</span>
                <PhaseTag phase={posting.phase} variant={active ? "sidebarActive" : "sidebar"} />
                <span className={`num shrink-0 text-[10.5px] ${active ? "text-white/75" : "text-sidebar-muted"}`}>
                  {posting.applicantCount}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

function Caret({ open, small = false }: { open: boolean; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-0 w-0 border-y-transparent border-l-current transition-transform ${small ? "border-y-[3px] border-l-[5px]" : "border-y-4 border-l-[6px]"} ${
        open ? "rotate-90" : ""
      }`}
    />
  );
}
