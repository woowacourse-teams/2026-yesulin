"use client";

import { useState } from "react";
import { ROUND_LABELS, STATUS_LABELS } from "@/features/screening/labels";
import type { Applicant } from "@/features/screening/types";
import { ApplicantCards } from "./applicant-cards";
import { ApplicantTable } from "./applicant-table";
import { useBoard } from "./board-context";
import { ScreenMessage } from "./screen-status";
import { VideoModal } from "./video-modal";

export function ApplicantList() {
  const { board, filters, visible } = useBoard();
  const [video, setVideo] = useState<Applicant | null>(null);
  const roundState = board.rounds.find((state) => state.round === board.round);

  if (roundState && !roundState.open) {
    return (
      <ScreenMessage title="아직 열리지 않은 차수입니다">
        {ROUND_LABELS[(board.round - 1) as 1 | 2]}를 마감하면 합격자가 넘어옵니다.
      </ScreenMessage>
    );
  }

  if (visible.length === 0) return <EmptyList />;

  return (
    <>
      <ListToolbar rows={visible} />
      {filters.view === "card" ? (
        <ApplicantCards rows={visible} />
      ) : (
        <ApplicantTable rows={visible} onPlayVideo={setVideo} />
      )}
      {video ? <VideoModal key={video.id} applicant={video} onClose={() => setVideo(null)} /> : null}
    </>
  );
}

function ListToolbar({ rows }: { rows: readonly Applicant[] }) {
  const { filters, selected, setSelection, openContacts } = useBoard();
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const label =
    filters.work === "DONE" && filters.status !== "ALL"
      ? `${STATUS_LABELS[filters.status]} ${rows.length}명`
      : `${rows.length}명 표시 중`;

  return (
    <div className="mb-[11px] flex flex-wrap items-center gap-3 rounded-control border border-border bg-card px-[13px] py-[9px]">
      <label className="-m-1.5 flex cursor-pointer items-center gap-[9px] rounded-lg p-1.5 text-[13px] font-medium transition-colors hover:bg-foreground/5">
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

      <span className="text-[12.5px] text-muted">{label}</span>
      {selectedRows.length > 0 ? (
        <span className="text-[12.5px] font-semibold text-brand">{selectedRows.length}명 선택됨</span>
      ) : null}

      {filters.work === "DONE" ? (
        <button
          type="button"
          onClick={() => openContacts(selectedRows.length > 0 ? selectedRows : rows)}
          className="ml-auto rounded-control border border-brand-line bg-brand-soft px-3 py-[5px] text-[12.5px] font-semibold text-brand hover:bg-brand-soft-strong"
        >
          {selectedRows.length > 0
            ? `선택한 ${selectedRows.length}명 연락처 모아보기`
            : `${label.split(" ")[0]} 전체 연락처 모아보기`}
        </button>
      ) : null}
    </div>
  );
}

function EmptyList() {
  const { board, filters, setFilters, clearSelection } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;

  if (filters.work === "PENDING") {
    return (
      <ScreenMessage title="검토를 모두 마쳤습니다">
        {counts && counts.pass > 0 ? (
          <>
            합격 {counts.pass}명을 확인할 차례입니다.
            <button
              type="button"
              onClick={() => {
                clearSelection();
                setFilters((current) => ({ ...current, work: "DONE", status: "PASS" }));
              }}
              className="ml-1.5 rounded-control border border-brand-line bg-brand-soft px-3 py-[5px] text-[12.5px] font-semibold text-brand hover:bg-brand-soft-strong"
            >
              합격자 보기
            </button>
          </>
        ) : (
          "검토 완료 탭에서 결과를 확인하세요."
        )}
      </ScreenMessage>
    );
  }

  const title =
    filters.status !== "ALL" && (counts?.done ?? 0) > 0
      ? `${STATUS_LABELS[filters.status]} 지원자가 없습니다`
      : "조건에 맞는 지원자가 없습니다";

  return <ScreenMessage title={title}>다른 상태를 선택하거나 필터를 줄여 보세요.</ScreenMessage>;
}
