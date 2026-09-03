"use client";

import { useBoard } from "./board-context";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "complete-screening-title";

export function ScreeningCompletionModal({
  auto,
  onClose,
}: {
  auto: boolean;
  onClose: () => void;
}) {
  const { board, saving, completeCurrentScreening } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;
  if (!counts) return null;

  const round = board.round;
  const currentIndex = board.rounds.findIndex((state) => state.round === round);
  const currentName = board.rounds[currentIndex]?.name ?? `${round}차 전형`;
  const nextRound = board.rounds[currentIndex + 1];

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      className="flex max-h-[88vh] w-[min(560px,93vw)] flex-col rounded-modal bg-card shadow-[var(--shadow-modal)]"
    >
      <DialogHeader
        id={TITLE_ID}
        title={`${board.role.name} · ${currentName} 마감`}
        subtitle={auto ? `${currentName} 검토를 모두 마쳤습니다. 마감하시겠습니까?` : "선택한 합격자를 기준으로 현재 차수를 마감하시겠습니까?"}
      />

      <div className="flex-1 overflow-y-auto px-6 py-[17px]">
        {auto ? (
          <p className="mb-3 rounded-control bg-pass-bg px-3 py-2 text-xs text-pass">
            {counts.all}명 검토를 모두 마쳤습니다. 미선택 지원자가 있어도 마감할 수 있습니다.
          </p>
        ) : null}

        <dl className="mb-3.5 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-dense">
          <dt className="text-muted">합격</dt>
          <dd className="num">
            {counts.pass}명{nextRound ? ` → ${nextRound.name} 검토 대기` : " → 최종 합격"}
          </dd>
          <dt className="text-muted">미선택</dt>
          <dd className="num">{counts.pending}명</dd>
          <dt className="text-muted">다음 차수 승격</dt>
          <dd className="num">{nextRound ? `${counts.pass}명` : "없음"}</dd>
        </dl>

        <p className="mb-3.5 rounded-control border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted-strong">
          미선택 지원자는 불합격으로 자동 변경되지 않으며, 다음 차수에는 합격자만 포함됩니다.
        </p>
        <p className="rounded-control bg-warn-bg px-3 py-2 text-xs text-warn">
          마감한 차수의 결과는 다시 변경할 수 없습니다. 다른 배역 전형에는 영향이 없습니다.
        </p>
      </div>

      <DialogFooter>
        <SecondaryButton onClick={onClose}>
          {auto ? "나중에 하기" : "닫기"}
        </SecondaryButton>
        <PrimaryButton
          disabled={saving}
          onClick={() => {
            void completeCurrentScreening().then((completed) => {
              if (completed) onClose();
            });
          }}
        >
          {currentName} 마감하기
        </PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
