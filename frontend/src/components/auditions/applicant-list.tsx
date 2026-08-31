"use client";

import { useState } from "react";
import { activeDetailFilterCount, type StatusFilter } from "@/features/auditions/filters";
import { roleConditionText, ROUND_LABELS, STATUS_LABELS } from "@/features/auditions/labels";
import { openPrintWindow } from "@/features/auditions/print";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantCards } from "./applicant-cards";
import { ApplicantTable } from "./applicant-table";
import { useBoard } from "./board-context";
import { ScreenMessage } from "./screen-status";
import { VideoModal } from "./video-modal";
import { SecondaryButton, SegmentButton } from "@/components/ui/controls";
import { useToast } from "./toast";

const POPUP_BLOCKED = "팝업이 차단되어 인쇄 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.";
const RESULT_SCOPE_LABELS = {
  ALL: "검토 완료",
  PASS: "합격자",
  FAIL: "불합격자",
  ETC: "기타 처리자",
  PENDING: "검토 대기",
} as const satisfies Record<StatusFilter, string>;

export function ApplicantList() {
  const { board, filters, visible } = useBoard();
  const [video, setVideo] = useState<Applicant | null>(null);
  if (visible.length === 0) return <EmptyList />;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-card border border-brand-line bg-brand-soft px-4 py-2.5 text-sm">
        <span className="font-semibold text-brand">배역 조건</span>
        <span className="text-muted-strong">{roleConditionText(board.role)}</span>
      </div>
      <ListToolbar rows={visible} />
      {filters.view === "card" ? <ApplicantCards rows={visible} /> : <><div className="lg:hidden"><ApplicantCards rows={visible} /></div><div className="hidden lg:block"><ApplicantTable rows={visible} onPlayVideo={setVideo} /></div></>}
      {video ? <VideoModal key={video.id} applicant={video} onClose={() => setVideo(null)} /> : null}
    </>
  );
}

function ListToolbar({ rows }: { rows: readonly Applicant[] }) {
  const { board, filters, selected, setFilters, setSelection, openContacts } = useBoard();
  const toast = useToast();
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const roundName = board.rounds.find((round) => round.round === board.round)?.name ?? ROUND_LABELS[board.round];
  const hasListFilter = filters.query.trim().length > 0 || activeDetailFilterCount(filters) > 0 || filters.mismatchOnly;
  const scopeLabel = hasListFilter ? "현재 목록" : RESULT_SCOPE_LABELS[filters.status];

  const label =
    filters.work === "DONE" && filters.status !== "ALL"
      ? `${STATUS_LABELS[filters.status]} ${rows.length}명`
      : `${rows.length}명 표시 중`;

  const selectionControl = (
    <label className="-m-1.5 flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-dense font-medium transition-colors hover:bg-foreground/5">
      <input
        type="checkbox"
        checked={allSelected}
        onChange={(event) =>
          setSelection(
            rows.map((row) => row.id),
            event.target.checked,
          )
        }
        className="m-0 block h-[18px] w-[18px] cursor-pointer accent-brand"
      />
      {allSelected ? "전체 해제" : "전체 선택"}
    </label>
  );

  const completedActions = filters.work === "DONE" ? (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <SecondaryButton
        onClick={() => {
          if (!openPrintWindow(rows, board.performance, `${board.performance.title} ${roundName} ${scopeLabel}`)) {
            toast(POPUP_BLOCKED, { type: "error" });
          }
        }}
        className="min-h-9"
      >
        {scopeLabel} 전체 인쇄
      </SecondaryButton>
      <SecondaryButton
        onClick={() => openContacts(selectedRows.length > 0 ? selectedRows : rows)}
        className="min-h-9 bg-brand-soft text-brand"
      >
        {selectedRows.length > 0
          ? `선택한 ${selectedRows.length}명 연락처 모아보기`
          : `${scopeLabel} 전체 연락처 모아보기`}
      </SecondaryButton>
    </div>
  ) : null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3">
      {selectionControl}
      <div className="flex shrink-0 overflow-hidden rounded-control border border-border bg-card">
        {(["card", "table"] as const).map((view) => (
          <SegmentButton
            key={view}
            pressed={filters.view === view}
            onClick={() => setFilters((current) => ({ ...current, view }))}
            className="px-2.5"
          >
            {view === "table" ? "표" : "카드"}
          </SegmentButton>
        ))}
      </div>
      <span className="text-xs text-muted">{label}</span>
      {selectedRows.length > 0 ? <span className="text-xs font-semibold text-brand">{selectedRows.length}명 선택됨</span> : null}
      {completedActions}
    </div>
  );
}

function EmptyList() {
  const { board, filters, setFilters, clearSelection } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;

  if (filters.query.trim()) {
    return <ScreenMessage title="검색 결과가 없습니다">이름, 학교 또는 연락처를 다시 확인해 보세요.</ScreenMessage>;
  }

  if (counts?.all === 0) {
    return <ScreenMessage title="아직 배우가 없습니다">지원서가 접수되면 이 목록에서 바로 확인할 수 있습니다.</ScreenMessage>;
  }

  if (filters.work === "PENDING") {
    return (
      <ScreenMessage title="검토를 모두 마쳤습니다">
        {counts && counts.pass > 0 ? (
          <>
            합격 {counts.pass}명을 확인할 차례입니다.
            <SecondaryButton
              onClick={() => {
                clearSelection();
                setFilters((current) => ({ ...current, work: "DONE", status: "PASS" }));
              }}
              className="ml-2 min-h-9 bg-brand-soft text-brand"
            >
              합격자 보기
            </SecondaryButton>
          </>
        ) : (
          "검토 완료 탭에서 결과를 확인하세요."
        )}
      </ScreenMessage>
    );
  }

  const title =
    filters.status !== "ALL" && (counts?.done ?? 0) > 0
      ? `${STATUS_LABELS[filters.status]} 배우가 없습니다`
      : "조건에 맞는 배우가 없습니다";

  return <ScreenMessage title={title}>다른 상태를 선택하거나 필터를 줄여 보세요.</ScreenMessage>;
}
