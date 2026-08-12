"use client";

import { useState } from "react";
import { ROUND_LABELS, STATUS_LABELS } from "@/features/auditions/labels";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantCards } from "./applicant-cards";
import { ApplicantTable } from "./applicant-table";
import { useBoard } from "./board-context";
import { ScreenMessage } from "./screen-status";
import { VideoModal } from "./video-modal";
import { SecondaryButton } from "@/components/ui/controls";

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
      {filters.view === "card" ? <ApplicantCards rows={visible} /> : <><div className="lg:hidden"><ApplicantCards rows={visible} /></div><div className="hidden lg:block"><ApplicantTable rows={visible} onPlayVideo={setVideo} /></div></>}
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

  const contacts = filters.work === "DONE" ? (
    <SecondaryButton
      onClick={() => openContacts(selectedRows.length > 0 ? selectedRows : rows)}
      className="ml-auto min-h-9 bg-brand-soft text-brand"
    >
      {selectedRows.length > 0
        ? `선택한 ${selectedRows.length}명 연락처 모아보기`
        : `${label.split(" ")[0]} 전체 연락처 모아보기`}
    </SecondaryButton>
  ) : null;

  return <>
    <div className={`mb-3 flex flex-wrap items-center gap-3 rounded-card border border-border bg-card px-4 py-3 ${filters.view === "table" ? "lg:hidden" : ""}`}>
      {selectionControl}
      <span className="text-xs text-muted">{label}</span>
      {selectedRows.length > 0 ? <span className="text-xs font-semibold text-brand">{selectedRows.length}명 선택됨</span> : null}
      {contacts}
    </div>

    {filters.view === "table" ? (
      <div className="mb-2 hidden min-h-9 items-center gap-3 px-1 lg:flex">
        <span className="text-dense font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted">행을 선택하면 상세 내용을 확인할 수 있습니다</span>
        {selectedRows.length > 0 ? <span className="text-xs font-semibold text-brand">{selectedRows.length}명 선택됨</span> : null}
        {contacts}
      </div>
    ) : null}
  </>;
}

function EmptyList() {
  const { board, filters, setFilters, clearSelection } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;

  if (filters.query.trim()) {
    return <ScreenMessage title="검색 결과가 없습니다">이름, 학교 또는 연락처를 다시 확인해 보세요.</ScreenMessage>;
  }

  if (counts?.all === 0) {
    return <ScreenMessage title="아직 지원자가 없습니다">지원서가 접수되면 이 목록에서 바로 확인할 수 있습니다.</ScreenMessage>;
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
      ? `${STATUS_LABELS[filters.status]} 지원자가 없습니다`
      : "조건에 맞는 지원자가 없습니다";

  return <ScreenMessage title={title}>다른 상태를 선택하거나 필터를 줄여 보세요.</ScreenMessage>;
}
