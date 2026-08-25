"use client";

import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

const TITLE_ID = "application-submit-confirmation-title";

export function PublicApplicationSubmitDialog({
  open,
  onClose,
  onConfirm,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(480px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={TITLE_ID} title="지원서를 제출할까요?" subtitle="제출 전 마지막으로 확인해 주세요." />
      <div className="px-5 py-6 md:px-6">
        <strong className="block rounded-control border border-warn/20 bg-warn-bg px-4 py-3 text-sm leading-6 text-warn">
          지원서 제출 후에는 내용을 수정할 수 없습니다.
        </strong>
        <p className="mt-4 text-base leading-7 text-muted-strong md:text-sm md:leading-6">
          입력한 정보와 첨부한 사진·영상을 다시 확인해 주세요. 제출된 내용은 내 지원서에서 읽기
          전용으로 확인할 수 있습니다.
        </p>
      </div>
      <DialogFooter>
        <SecondaryButton type="button" data-autofocus="true" onClick={onClose}>
          취소
        </SecondaryButton>
        <PrimaryButton type="button" onClick={onConfirm}>
          지원서 제출
        </PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
