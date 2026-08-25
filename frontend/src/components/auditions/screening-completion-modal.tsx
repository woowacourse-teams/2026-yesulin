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

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      className="flex max-h-[88vh] w-[min(560px,93vw)] flex-col rounded-modal bg-card shadow-[var(--shadow-modal)]"
    >
      <DialogHeader
        id={TITLE_ID}
        title={`${board.role.name} · 전형 종료`}
        subtitle={auto ? `${currentName} 검토를 모두 마쳤습니다.` : "전형을 종료하시겠습니까?"}
      />

      <div className="flex-1 overflow-y-auto px-6 py-[17px]">
        {auto ? (
          <p className="mb-3 rounded-control bg-pass-bg px-3 py-2 text-xs text-pass">
            {counts.all}명 검토를 모두 마쳤습니다.
          </p>
        ) : null}

        <dl className="mb-3.5 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-dense">
          <dt className="text-muted">합격</dt>
          <dd className="num">
            {counts.pass}명 → 최종 합격
          </dd>
          <dt className="text-muted">불합격</dt>
          <dd className="num">{counts.fail}명</dd>
          {counts.etc > 0 ? (
            <>
              <dt className="text-muted">기타</dt>
              <dd className="num">{counts.etc}명</dd>
            </>
          ) : null}
        </dl>

        <p className="mb-3.5 rounded-control border border-border bg-surface px-3 py-2.5 text-xs leading-relaxed text-muted-strong">
          결과 연락은 서비스가 보내지 않습니다. 검토 완료 탭에서 연락처를 복사해 직접 연락해 주세요.
        </p>
        <p className="rounded-control bg-warn-bg px-3 py-2 text-xs text-warn">
          종료하면 모든 차수의 결과를 더 이상 변경할 수 없습니다. 다른 배역 전형에는 영향이 없습니다.
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
          전형 종료하기
        </PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
