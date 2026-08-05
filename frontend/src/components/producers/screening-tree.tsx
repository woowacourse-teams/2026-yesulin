"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getScreeningTree } from "@/features/screening/api";
import { PHASE_LABELS } from "@/features/screening/labels";
import { postingEntryHref, screeningRoutes } from "@/features/screening/routes";
import { SCREENING_TREE_CHANGED } from "@/features/screening/events";
import type { ScreeningTree, ScreeningTreeNode } from "@/features/screening/types";
import { PhaseTag } from "@/components/screening/status-badge";

/** 현재 경로에서 트리가 가리켜야 할 위치를 되짚는다. */
function locate(tree: ScreeningTree | null, pathname: string) {
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

export function ScreeningTreeNav() {
  const pathname = usePathname();
  const [tree, setTree] = useState<ScreeningTree | null>(null);
  const [rootOpen, setRootOpen] = useState(true);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = () => {
      getScreeningTree().then((response) => {
        if (active) setTree(response);
      });
    };
    load();
    window.addEventListener(SCREENING_TREE_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(SCREENING_TREE_CHANGED, load);
    };
  }, []);

  const { performanceId, postingId } = locate(tree, pathname);
  const atRoot = pathname === screeningRoutes.performances;

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
          className="flex h-[26px] w-[22px] shrink-0 items-center justify-center rounded-[5px] text-muted-soft transition-colors hover:bg-border-soft hover:text-muted"
        >
          <Caret open={rootOpen} />
        </button>
        <Link
          href={screeningRoutes.performances}
          className={`flex-1 whitespace-nowrap rounded-md py-2 pl-0.5 pr-1.5 text-left text-[13px] font-bold uppercase tracking-[0.03em] transition-colors hover:bg-border-soft ${
            atRoot ? "text-brand" : "text-muted hover:text-muted-strong"
          }`}
        >
          공연 관리
        </Link>
      </div>

      {rootOpen && tree ? (
        <div className="ml-3.5 border-l border-border-soft pl-[15px]" role="tree">
          {tree.performances.map((performance) => (
            <TreeBranch
              key={performance.id}
              performance={performance}
              open={!collapsed.has(performance.id)}
              activePerformance={performanceId === performance.id}
              activePostingId={postingId}
              onToggle={() => toggle(performance.id)}
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
}: {
  performance: ScreeningTreeNode;
  open: boolean;
  activePerformance: boolean;
  activePostingId: string | null;
  onToggle: () => void;
}) {
  return (
    <>
      <div className="relative flex items-center gap-0.5 before:absolute before:-left-[15px] before:top-4 before:h-px before:w-[11px] before:bg-border-soft">
        <button
          type="button"
          aria-label={`${performance.title} 공고 펼치기/접기`}
          aria-expanded={open}
          onClick={onToggle}
          className="flex h-[26px] w-[22px] shrink-0 items-center justify-center rounded-[5px] text-muted-soft transition-colors hover:bg-border-soft hover:text-muted"
        >
          <Caret open={open} small />
        </button>
        <Link
          href={screeningRoutes.performance(performance.id)}
          aria-current={activePerformance && !activePostingId ? "page" : undefined}
          className={`flex flex-1 items-center whitespace-nowrap rounded-md px-2 py-[7px] text-left text-[13px] font-semibold transition-colors ${
            activePerformance && !activePostingId
              ? "bg-brand-soft text-brand"
              : "text-foreground hover:bg-border-soft"
          }`}
        >
          <span className="flex-1 truncate">{performance.title}</span>
        </Link>
      </div>

      {open ? (
        <div className="ml-[9px] border-l border-border-soft pb-1 pl-[15px] pt-0.5" role="group">
          {performance.postings.map((posting) => {
            const active = activePostingId === posting.id;
            /* 아직 시작 전인 공고는 지원자가 없으므로 공고 선택 화면에 머무르게 한다 */
            const upcoming = posting.phase === "UPCOMING";

            return (
              <Link
                key={posting.id}
                href={upcoming ? screeningRoutes.performance(performance.id) : postingEntryHref(posting)}
                aria-current={active ? "page" : undefined}
                title={upcoming ? `${posting.title} — ${PHASE_LABELS.UPCOMING}` : posting.title}
                className={`relative flex w-full items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[7px] text-[12.5px] leading-tight transition-colors before:absolute before:-left-[15px] before:top-4 before:h-px before:w-[11px] before:bg-border-soft ${
                  active ? "bg-brand-soft font-semibold text-brand" : "text-muted-strong hover:bg-border-soft hover:text-foreground"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{posting.title}</span>
                <PhaseTag phase={posting.phase} />
                <span className={`num shrink-0 text-[10.5px] ${active ? "text-brand/75" : "text-muted"}`}>
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
