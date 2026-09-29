"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useToast } from "@/components/auditions/toast";
import { FieldTextarea, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { formatShowDateTime } from "@/features/shows/format";
import { phoneNumbersText } from "@/features/shows/reservation-export";
import { EXPORTED_BOOKER_DATA_DELETE_DAYS } from "@/features/shows/types";
import { useModalClose } from "../use-modal-close";

const TITLE_ID = "phone-numbers-dialog-title";
const LIST_ID = "phone-numbers-dialog-list";
const MAX_VISIBLE_ROWS = 8;

/**
 * 복사할 번호를 먼저 보여 주고 복사한다. 복사한 번호도 개인정보라 파기 기한을 함께 알린다.
 * 브라우저가 클립보드 쓰기를 막으면 목록에서 직접 선택해 복사할 수 있다.
 */
export function PhoneNumbersDialog({ phones, sessionStartsAt, selectedOnly, onClose }: {
  readonly phones: readonly string[];
  readonly sessionStartsAt: string;
  readonly selectedOnly: boolean;
  readonly onClose: () => void;
}) {
  const toast = useToast();
  const [copyFailed, setCopyFailed] = useState(false);
  const close = useModalClose(onClose, false);
  const text = phoneNumbersText(phones);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`전화번호 ${phones.length}개를 복사했어요. 한 줄에 번호 하나씩 들어 있어요.`, { type: "success" });
      onClose();
    } catch (cause) {
      console.error("[예매 관객 전화번호 복사 실패]", cause);
      setCopyFailed(true);
    }
  };

  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden break-keep rounded-t-modal wrap-break-word border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(480px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader
        id={TITLE_ID}
        title="전화번호 복사"
        subtitle={`${formatShowDateTime(sessionStartsAt)} 회차 · ${selectedOnly ? "선택한" : "확정"} 예매 관객 번호 ${phones.length}개`}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
        <label htmlFor={LIST_ID} className="mb-2 block text-sm font-semibold text-muted-strong">한 줄에 번호 하나씩 복사돼요</label>
        <FieldTextarea
          id={LIST_ID}
          readOnly
          rows={Math.max(1, Math.min(phones.length, MAX_VISIBLE_ROWS))}
          value={text}
          onFocus={(event) => event.currentTarget.select()}
          className="num resize-none leading-7"
        />
        <p className="mt-4 rounded-control border border-warn/30 bg-warn-bg px-4 py-3 text-sm leading-6 text-foreground">
          복사한 번호와 내려받은 명단은 관람 회차 종료 후 {EXPORTED_BOOKER_DATA_DELETE_DAYS}일 이내에 지워 주세요.
        </p>
        {copyFailed ? (
          <p role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">
            복사하지 못했어요. 위 목록을 길게 누르거나 전체 선택해서 직접 복사해 주세요.
          </p>
        ) : null}
      </div>
      <DialogFooter>
        <SecondaryButton onClick={close}>닫기</SecondaryButton>
        <PrimaryButton data-autofocus="true" onClick={() => void copy()}>
          <span className="num">{phones.length}</span>개 번호 복사
        </PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
