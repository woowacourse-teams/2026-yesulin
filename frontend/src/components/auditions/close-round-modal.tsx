"use client";

import { useBoard } from "./board-context";
import { DialogFooter, DialogHeader, ModalShell } from "./modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "close-round-title";

export function CloseRoundModal({
  auto,
  onClose,
}: {
  /** 검토를 막 끝냈을 때 자동으로 뜬 경우. 문구가 '넘어가시겠습니까?'로 바뀐다. */
  auto: boolean;
  onClose: () => void;
}) {
  const { board, saving, closeCurrentRound } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;
  if (!counts) return null;

  const round = board.round;
  const currentIndex = board.rounds.findIndex((state) => state.round === round);
  const currentName = board.rounds[currentIndex]?.name ?? `${round}차 전형`;
  const nextName = board.rounds[currentIndex + 1]?.name;
  const isFinal = !nextName;
  const nextLabel = isFinal ? "전형 종료하기" : `${nextName}로 넘어가기`;

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      className="flex max-h-[88vh] w-[min(560px,93vw)] flex-col rounded-modal bg-card shadow-[var(--shadow-modal)]"
    >
      <DialogHeader
        id={TITLE_ID}
        title={`${board.role.name} · ${currentName} ${auto ? "검토 완료" : "마감"}`}
        subtitle={
          auto
            ? isFinal
              ? "전형을 종료하시겠습니까?"
              : `${nextName}로 넘어가시겠습니까?`
            : `${counts.all}명 심사 완료`
        }
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
            {counts.pass}명 {isFinal ? "→ 최종 합격" : `→ ${nextName}로 이동`}
          </dd>
          <dt className="text-muted">불합격</dt>
          <dd className="num">{counts.fail}명</dd>
          {counts.absent > 0 ? (
            <>
              <dt className="text-muted">불참</dt>
              <dd className="num">{counts.absent}명</dd>
            </>
          ) : null}
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
          {isFinal ? "종료하면" : "넘어가면"} {currentName} 결과를 더 이상 변경할 수 없습니다. 다른
          배역 전형에는 영향이 없습니다.
        </p>
      </div>

      <DialogFooter>
        <SecondaryButton onClick={onClose}>
          {auto ? "나중에 하기" : "닫기"}
        </SecondaryButton>
        <PrimaryButton
          disabled={saving}
          onClick={() => {
            void closeCurrentRound().then(onClose);
          }}
        >
          {auto ? (isFinal ? "예, 종료합니다" : `예, ${nextLabel}`) : nextLabel}
        </PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
