"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { closeRound, saveReview } from "@/features/auditions/api";
import { activeDetailFilterCount, applyFilters, initialFilters, type AuditionFilters } from "@/features/auditions/filters";
import { STATUS_LABELS } from "@/features/auditions/labels";
import type {
  Applicant,
  SubmissionId,
  ReviewStatus,
  RoundNumber,
  AuditionBoardResponse,
} from "@/features/auditions/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { auditionRoutes } from "@/features/auditions/routes";
import { BoardProvider, type BoardContextValue } from "./board-context";
import { ActionBar } from "./action-bar";
import { ApplicantList } from "./applicant-list";
import { AuditionFilterSheet } from "./audition-filter-sheet";
import { ContactsModal } from "./contacts-modal";
import { DesktopBoardToolbar } from "./desktop-board-toolbar";
import { FilterBar } from "./filter-bar";
import { RoundStepper } from "./round-stepper";
import { useToast } from "./toast";
import { WorkSplit } from "./work-split";

export function BoardWorkspace({
  board,
  onBoardChange,
  onRoundChange,
}: {
  board: AuditionBoardResponse;
  onBoardChange: (next: AuditionBoardResponse) => void;
  onRoundChange: (round: RoundNumber) => void;
}) {
  const roundClosed = board.rounds.find((state) => state.round === board.round)?.closed ?? false;
  const [filters, setFilters] = useState<AuditionFilters>(() =>
    initialFilters(roundClosed ? "DONE" : "PENDING"),
  );
  const [selected, setSelected] = useState<ReadonlySet<SubmissionId>>(new Set());
  const [contactList, setContactList] = useState<readonly Applicant[] | null>(null);
  const [closePrompt, setClosePrompt] = useState<"auto" | "manual" | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memoRequest, setMemoRequest] = useState<{ readonly kind: "BULK" | "CURRENT"; readonly ids: readonly SubmissionId[]; readonly previousIndex?: number } | null>(null);
  const toast = useToast();
  const router = useRouter();

  const visible = useMemo(() => applyFilters(board.applicants, filters), [board.applicants, filters]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const toggleSelected = useCallback((id: SubmissionId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelection = useCallback((ids: readonly SubmissionId[], on: boolean) => {
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
    async (action: () => Promise<AuditionBoardResponse>, fallback: string) => {
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
      submissionIds: readonly SubmissionId[],
      patch: { status?: ReviewStatus; memo?: string; note?: string },
      fallback: string,
    ) =>
      run(
        () => saveReview({ roleId: board.role.id, round: board.round, submissionIds, ...patch }),
        fallback,
      ),
    [board.role.id, board.round, run],
  );

  /** 검토를 다 끝낸 순간 "다음 차수로 넘어갈까요?"를 한 번 물어본다. */
  const promptCloseIfDone = useCallback((next: AuditionBoardResponse) => {
    const state = next.rounds.find((candidate) => candidate.round === next.round);
    if (state && !state.closed && state.counts.all > 0 && state.counts.pending === 0) {
      setClosePrompt("auto");
    }
  }, []);

  const applyBulkStatus = useCallback(
    async (ids: readonly SubmissionId[], status: ReviewStatus, memo?: string) => {
      const next = await submitReview(ids, { status, ...(memo ? { memo } : {}) }, "심사 결과를 저장하지 못했습니다.");
      if (!next) return;
      clearSelection();
      toast(`${ids.length}명을 ${STATUS_LABELS[status]} 처리했습니다`, { type: "success" });
      promptCloseIfDone(next);
    },
    [clearSelection, promptCloseIfDone, submitReview, toast],
  );

  const setStatus = useCallback(async (ids: readonly SubmissionId[], status: ReviewStatus) => {
    if (ids.length === 0) return;
    if (status === "ETC") { setMemoRequest({ kind: "BULK", ids }); return; }
    await applyBulkStatus(ids, status);
  }, [applyBulkStatus]);

  /**
   * 검토 대기 모드에서 결과를 남기면 그 배우는 목록에서 빠진다.
   * 같은 자리에 밀려 올라온 다음 배우로 자동으로 넘어가 흐름이 끊기지 않게 한다.
   */
  const applyCurrentStatus = useCallback(
    async (id: SubmissionId, status: ReviewStatus, previousIndex: number, memo?: string) => {
      const next = await submitReview([id], { status, ...(memo ? { memo } : {}) }, "심사 결과를 저장하지 못했습니다.");
      if (!next) return;
      if (filters.work !== "PENDING" || status === "PENDING") return;

      const remaining = applyFilters(next.applicants, filters);
      if (remaining.length === 0) {
        setFilters((current) => ({ ...current, work: "DONE", status: "ALL" }));
        const counts = next.rounds.find((state) => state.round === next.round)?.counts;
        toast(counts && counts.pass > 0 ? `검토를 마쳤습니다 · 합격 ${counts.pass}명` : "검토를 마쳤습니다", {
          type: "success",
        });
        promptCloseIfDone(next);
        return;
      }

      const target = remaining[Math.min(Math.max(previousIndex, 0), remaining.length - 1)];
      if (target) router.push(auditionRoutes.applicantReview(board.role.id, target.id, board.round));
    },
    [board.role.id, board.round, filters, promptCloseIfDone, router, submitReview, toast],
  );

  const reviewCurrent = useCallback(async (id: SubmissionId, status: ReviewStatus) => {
    const previousIndex = visible.findIndex((applicant) => applicant.id === id);
    if (status === "ETC") { setMemoRequest({ kind: "CURRENT", ids: [id], previousIndex }); return; }
    await applyCurrentStatus(id, status, previousIndex);
  }, [applyCurrentStatus, visible]);

  const patchReview = useCallback(
    async (id: SubmissionId, patch: { readonly memo?: string; readonly note?: string }) => {
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
    openApplicant: (id) => {
      if (id !== null) router.push(auditionRoutes.applicantReview(board.role.id, id, board.round));
    },
    openedApplicantId: null,
    contactList,
    openContacts: setContactList,
    closeContacts: () => setContactList(null),
  };

  return (
    <BoardProvider value={value}>
      <RoundStepper />
      <div className="glass-surface sticky top-16 z-20 border-b border-border lg:top-0 lg:border-b-0">
        <WorkSplit />
        <FilterBar sheetOpen={filterSheetOpen} onOpenSheet={() => setFilterSheetOpen(true)} />
        <DesktopBoardToolbar onOpenFilter={() => setFilterSheetOpen(true)} />
      </div>
      <div className="px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-4 md:px-6 lg:pb-8 xl:px-8">
        <ApplicantList />
      </div>
      <ActionBar />
      <ContactsModal />
      <AuditionFilterSheet open={filterSheetOpen} activeCount={activeDetailFilterCount(filters)} onClose={() => setFilterSheetOpen(false)} />
      <ReviewMemoDialog key={memoRequest ? `${memoRequest.kind}-${memoRequest.ids.join("-")}` : "closed"} open={memoRequest !== null} saving={saving} onClose={() => setMemoRequest(null)} onSubmit={async (memo) => {
        const request = memoRequest;
        if (!request) return;
        if (request.kind === "BULK") await applyBulkStatus(request.ids, "ETC", memo);
        else if (request.ids[0]) await applyCurrentStatus(request.ids[0], "ETC", request.previousIndex ?? 0, memo);
        setMemoRequest(null);
      }} />
    </BoardProvider>
  );
}

function ReviewMemoDialog({ open, saving, onClose, onSubmit }: { readonly open: boolean; readonly saving: boolean; readonly onClose: () => void; readonly onSubmit: (memo: string) => Promise<void> }) {
  const [memo, setMemo] = useState("");
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="review-memo-title" className="w-full max-w-md rounded-modal border border-border bg-card p-5 shadow-[var(--shadow-modal)]"><h2 id="review-memo-title" className="text-lg font-bold">기타 사유 입력</h2><p className="mt-2 text-sm leading-6 text-muted">선택한 배우의 심사 상태에 표시할 사유를 입력해 주세요.</p><form onSubmit={(event) => { event.preventDefault(); const value = memo.trim(); if (value) void onSubmit(value); }}><label className="mt-4 block text-sm font-semibold">기타 사유<input autoFocus required maxLength={255} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="예: 다른 배역으로 검토" className="mt-2 min-h-11 w-full rounded-control border border-border bg-card px-3 outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="min-h-11 rounded-control border border-border px-4 text-sm font-semibold">취소</button><button type="submit" disabled={saving || !memo.trim()} className="min-h-11 rounded-control bg-brand px-4 text-sm font-semibold text-white disabled:bg-border disabled:text-muted">{saving ? "저장 중…" : "기타로 저장"}</button></div></form></section></div>;
}
