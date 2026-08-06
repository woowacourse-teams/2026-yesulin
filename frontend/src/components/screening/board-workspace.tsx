"use client";

import { useCallback, useMemo, useState } from "react";
import { closeRound, saveReview } from "@/features/screening/api";
import { applyFilters, initialFilters, type ScreeningFilters } from "@/features/screening/filters";
import { STATUS_LABELS } from "@/features/screening/labels";
import type {
  Applicant,
  ApplicationId,
  ReviewStatus,
  RoundNumber,
  ScreeningBoardResponse,
} from "@/features/screening/types";
import { errorMessage } from "@/features/screening/use-screening-query";
import { BoardProvider, type BoardContextValue } from "./board-context";
import { ActionBar } from "./action-bar";
import { ApplicantDetail } from "./applicant-detail";
import { ApplicantList } from "./applicant-list";
import { ContactsModal } from "./contacts-modal";
import { FilterBar } from "./filter-bar";
import { RoundStepper } from "./round-stepper";
import { useToast } from "./toast";
import { WorkSplit } from "./work-split";

export function BoardWorkspace({
  board,
  onBoardChange,
  onRoundChange,
}: {
  board: ScreeningBoardResponse;
  onBoardChange: (next: ScreeningBoardResponse) => void;
  onRoundChange: (round: RoundNumber) => void;
}) {
  const roundClosed = board.rounds.find((state) => state.round === board.round)?.closed ?? false;
  const [filters, setFilters] = useState<ScreeningFilters>(() =>
    initialFilters(roundClosed ? "DONE" : "PENDING"),
  );
  const [selected, setSelected] = useState<ReadonlySet<ApplicationId>>(new Set());
  const [openedApplicantId, setOpenedApplicantId] = useState<ApplicationId | null>(null);
  const [contactList, setContactList] = useState<readonly Applicant[] | null>(null);
  const [closePrompt, setClosePrompt] = useState<"auto" | "manual" | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const visible = useMemo(() => applyFilters(board.applicants, filters), [board.applicants, filters]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleSelected = useCallback((id: ApplicationId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelection = useCallback((ids: readonly ApplicationId[], on: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  /** 실패해도 화면이 조용히 어긋나지 않도록 토스트로 알리고 갱신된 보드를 돌려준다. */
  const run = useCallback(
    async (action: () => Promise<ScreeningBoardResponse>, fallback: string) => {
      setSaving(true);
      try {
        const next = await action();
        onBoardChange(next);
        return next;
      } catch (cause: unknown) {
        toast(errorMessage(cause, fallback), { type: "error" });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [onBoardChange, toast],
  );

  const submitReview = useCallback(
    (
      applicationIds: readonly ApplicationId[],
      patch: { status?: ReviewStatus; memo?: string; note?: string },
      fallback: string,
    ) =>
      run(
        () => saveReview({ roleId: board.role.id, round: board.round, applicationIds, ...patch }),
        fallback,
      ),
    [board.role.id, board.round, run],
  );

  /** 검토를 다 끝낸 순간 "다음 차수로 넘어갈까요?"를 한 번 물어본다. */
  const promptCloseIfDone = useCallback((next: ScreeningBoardResponse) => {
    const state = next.rounds.find((candidate) => candidate.round === next.round);
    if (state && !state.closed && state.counts.all > 0 && state.counts.pending === 0) {
      setClosePrompt("auto");
    }
  }, []);

  const setStatus = useCallback(
    async (ids: readonly ApplicationId[], status: ReviewStatus) => {
      if (ids.length === 0) return;
      const next = await submitReview(ids, { status }, "심사 결과를 저장하지 못했습니다.");
      if (!next) return;
      clearSelection();
      toast(`${ids.length}명을 ${STATUS_LABELS[status]} 처리했습니다`, { type: "success" });
      promptCloseIfDone(next);
    },
    [clearSelection, promptCloseIfDone, submitReview, toast],
  );

  /**
   * 검토 대기 모드에서 결과를 남기면 그 지원자는 목록에서 빠진다.
   * 같은 자리에 밀려 올라온 다음 지원자로 자동으로 넘어가 흐름이 끊기지 않게 한다.
   */
  const reviewCurrent = useCallback(
    async (id: ApplicationId, status: ReviewStatus) => {
      const previousIndex = visible.findIndex((applicant) => applicant.id === id);
      const next = await submitReview([id], { status }, "심사 결과를 저장하지 못했습니다.");
      if (!next) return;
      if (filters.work !== "PENDING" || status === "PENDING") return;

      const remaining = applyFilters(next.applicants, filters);
      if (remaining.length === 0) {
        setOpenedApplicantId(null);
        setFilters((current) => ({ ...current, work: "DONE", status: "PASS" }));
        const counts = next.rounds.find((state) => state.round === next.round)?.counts;
        toast(counts && counts.pass > 0 ? `검토를 마쳤습니다 · 합격 ${counts.pass}명` : "검토를 마쳤습니다", {
          type: "success",
        });
        promptCloseIfDone(next);
        return;
      }

      const target = remaining[Math.min(Math.max(previousIndex, 0), remaining.length - 1)];
      setOpenedApplicantId(target?.id ?? null);
    },
    [filters, promptCloseIfDone, submitReview, toast, visible],
  );

  const patchReview = useCallback(
    async (id: ApplicationId, patch: { readonly memo?: string; readonly note?: string }) => {
      await submitReview([id], patch, "메모를 저장하지 못했습니다.");
    },
    [submitReview],
  );

  const closeCurrentRound = useCallback(async () => {
    const currentIndex = board.rounds.findIndex((state) => state.round === board.round);
    const nextState = board.rounds[currentIndex + 1];
    const finishing = !nextState;
    const next = await run(
      () => closeRound({ roleId: board.role.id, round: board.round }),
      "차수를 마감하지 못했습니다.",
    );
    if (!next) return;
    toast(finishing ? "전형이 종료되었습니다" : `${nextState.name}가 시작되었습니다`, {
      type: "success",
    });
  }, [board.role.id, board.round, board.rounds, run, toast]);

  const value: BoardContextValue = {
    board,
    filters,
    visible,
    selected,
    saving,
    roundClosed,
    setFilters,
    goToRound: onRoundChange,
    toggleSelected,
    setSelection,
    clearSelection,
    setStatus,
    reviewCurrent,
    patchReview,
    closeCurrentRound,
    closePrompt,
    setClosePrompt,
    openApplicant: setOpenedApplicantId,
    openedApplicantId,
    contactList,
    openContacts: setContactList,
    closeContacts: () => setContactList(null),
  };

  return (
    <BoardProvider value={value}>
      <RoundStepper />
      <div className="glass-surface sticky top-16 z-20 border-b border-border lg:top-0">
        <WorkSplit />
        <FilterBar />
      </div>
      <div className="px-4 pb-32 pt-4 md:px-6 xl:px-8">
        <ApplicantList />
      </div>
      <ActionBar />
      <ApplicantDetail />
      <ContactsModal />
    </BoardProvider>
  );
}
