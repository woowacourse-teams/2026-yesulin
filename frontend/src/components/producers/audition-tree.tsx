"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, use, useEffect, useEffectEvent, useState } from "react";
import { getAuditionTree } from "@/features/auditions/api";
import { PHASE_LABELS } from "@/features/auditions/labels";
import { postingEntryHref, auditionRoutes } from "@/features/auditions/routes";
import { AUDITION_TREE_CHANGED } from "@/features/auditions/events";
import type { AuditionTree, AuditionTreeNode, PerformanceId } from "@/features/auditions/types";
import { PhaseTag } from "@/components/auditions/status-badge";

/** 현재 경로에서 트리가 가리켜야 할 위치를 되짚는다. */
function locate(tree: AuditionTree | null, pathname: string) {
  const [, , section, id] = pathname.split("/");
  if (!tree || !id) return { performanceId: null, postingId: null };

  if (section === "performances") {
    const performance = tree.performances.find((item) => item.id === id);
    return { performanceId: performance?.id ?? null, postingId: null };
  }

  for (const performance of tree.performances) {
    for (const posting of performance.postings) {
      const hit =
        (section === "postings" && posting.id === id) ||
        (section === "roles" && posting.roleIds.some((roleId) => roleId === id));
      if (hit) return { performanceId: performance.id, postingId: posting.id };
    }
  }

  return { performanceId: null, postingId: null };
}

type AuditionTreeState = {
  readonly tree: AuditionTree | null;
  readonly collapsed: ReadonlySet<PerformanceId>;
  readonly collapsedAtPath: ReadonlyMap<PerformanceId, string>;
};

type AuditionTreeContextValue = AuditionTreeState & {
  readonly rootOpen: boolean;
  readonly toggleRoot: () => void;
  readonly togglePerformance: (id: PerformanceId, open: boolean) => void;
};

const AuditionTreeContext = createContext<AuditionTreeContextValue | null>(null);

/** 경로별 화면이 바뀌어도 트리 조회 결과와 사용자의 펼침 상태를 유지한다. */
export function AuditionTreeProvider({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<AuditionTreeState>({
    tree: null,
    collapsed: new Set(),
    collapsedAtPath: new Map(),
  });
  const [rootOpen, setRootOpen] = useState(true);

  const applyTree = useEffectEvent((tree: AuditionTree) => {
    const activePerformanceId = locate(tree, pathname).performanceId;

    setState((current) => {
      if (!current.tree) {
        return {
          tree,
          collapsed: new Set(
            tree.performances
              .filter((performance) => performance.id !== activePerformanceId)
              .map((performance) => performance.id),
          ),
          collapsedAtPath: new Map(),
        };
      }

      const previousIds = new Set(current.tree.performances.map((performance) => performance.id));
      const nextIds = new Set(tree.performances.map((performance) => performance.id));
      const collapsed = new Set([...current.collapsed].filter((id) => nextIds.has(id)));
      const collapsedAtPath = new Map(
        [...current.collapsedAtPath].filter(([id]) => nextIds.has(id)),
      );

      for (const performance of tree.performances) {
        if (!previousIds.has(performance.id) && performance.id !== activePerformanceId) {
          collapsed.add(performance.id);
        }
      }

      return { tree, collapsed, collapsedAtPath };
    });
  });

  useEffect(() => {
    let active = true;
    const load = () => {
      getAuditionTree()
        .then((response) => {
          if (active) applyTree(response);
        })
        .catch((cause: unknown) => {
          console.error("[공연 내비게이션 트리 조회 실패]", cause);
        });
    };

    load();
    window.addEventListener(AUDITION_TREE_CHANGED, load);
    return () => {
      active = false;
      window.removeEventListener(AUDITION_TREE_CHANGED, load);
    };
  }, []);

  const togglePerformance = (id: PerformanceId, open: boolean) => {
    setState((current) => {
      const collapsed = new Set(current.collapsed);
      const collapsedAtPath = new Map(current.collapsedAtPath);

      if (open) {
        collapsed.add(id);
        collapsedAtPath.set(id, pathname);
      } else {
        collapsed.delete(id);
        collapsedAtPath.delete(id);
      }

      return { ...current, collapsed, collapsedAtPath };
    });
  };

  return (
    <AuditionTreeContext.Provider
      value={{
        ...state,
        rootOpen,
        toggleRoot: () => setRootOpen((open) => !open),
        togglePerformance,
      }}
    >
      {children}
    </AuditionTreeContext.Provider>
  );
}

function useAuditionTree() {
  const context = use(AuditionTreeContext);
  if (!context) throw new Error("AuditionTreeProvider 안에서 사용해야 합니다.");
  return context;
}

export function AuditionTreeNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { tree, rootOpen, collapsed, collapsedAtPath, toggleRoot, togglePerformance } = useAuditionTree();

  const { performanceId, postingId } = locate(tree, pathname);
  const atRoot = pathname === auditionRoutes.performances;

  return (
    <div className="px-2 pb-4 pt-1">
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="공연 목록 펼치기/접기"
          aria-expanded={rootOpen}
          onClick={toggleRoot}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white lg:h-[30px] lg:w-[26px]"
        >
          <Caret open={rootOpen} />
        </button>
        <Link
          href={auditionRoutes.performances}
          onClick={onNavigate}
          className={`flex min-h-11 flex-1 items-center whitespace-nowrap rounded-control py-2 pl-0.5 pr-1.5 text-left text-base font-bold tracking-[0.01em] transition-colors hover:bg-sidebar-hover lg:min-h-0 lg:text-dense lg:uppercase lg:tracking-[0.03em] ${
            atRoot ? "bg-sidebar-hover text-brand-line" : "text-sidebar-muted hover:text-white"
          }`}
        >
          공연 관리
        </Link>
      </div>

      {rootOpen && tree ? (
        <div className="ml-3.5 border-l border-sidebar-line pl-4" role="tree">
          {tree.performances.map((performance) => {
            const activePerformance = performanceId === performance.id;
            const collapsedOnCurrentPath = collapsedAtPath.get(performance.id) === pathname;
            const open = !collapsed.has(performance.id) || (activePerformance && !collapsedOnCurrentPath);

            return (
              <TreeBranch
                key={performance.id}
                performance={performance}
                open={open}
                activePerformance={activePerformance}
                activePostingId={postingId}
                onToggle={() => togglePerformance(performance.id, open)}
                onNavigate={onNavigate}
              />
            );
          })}
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
      <div className="relative flex items-center gap-0.5 before:absolute before:-left-4 before:top-4 before:h-px before:w-[11px] before:bg-sidebar-line">
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
          className={`flex min-h-11 flex-1 items-center whitespace-nowrap rounded-control px-2 py-2 text-left text-base font-semibold transition-colors lg:min-h-0 lg:text-dense ${
            activePerformance && !activePostingId
              ? "bg-brand text-white"
              : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
          }`}
        >
          <span className="flex-1 truncate">{performance.title}</span>
        </Link>
      </div>

      {open ? (
        <div className="ml-2 border-l border-sidebar-line pb-1 pl-4 pt-0.5" role="group">
          {performance.postings.map((posting) => {
            const active = activePostingId === posting.id;
            /* 미게시·시작 전 공고는 배우가 없으므로 공고 선택 화면에 머무르게 한다 */
            const unavailable = posting.phase === "DRAFT" || posting.phase === "UPCOMING";

            return (
              <Link
                key={posting.id}
                href={unavailable ? auditionRoutes.performance(performance.id) : postingEntryHref(posting)}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={unavailable ? `${posting.title} — ${PHASE_LABELS[posting.phase]}` : posting.title}
                className={`relative flex min-h-11 w-full items-center gap-1.5 whitespace-nowrap rounded-control px-2 py-2 text-base leading-tight transition-colors before:absolute before:-left-4 before:top-4 before:h-px before:w-[11px] before:bg-sidebar-line lg:min-h-0 lg:text-xs ${
                  active ? "bg-brand font-semibold text-white" : "text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{posting.title}</span>
                <PhaseTag phase={posting.phase} variant={active ? "sidebarActive" : "sidebar"} />
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
