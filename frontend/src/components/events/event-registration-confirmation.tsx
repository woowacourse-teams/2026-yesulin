"use client";

import { DialogFooter, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { useState } from "react";
import { accountNumberToCopy } from "@/features/events/bank-account";
import type { EventBankAccount } from "@/features/events/types";

export function EventRegistrationConfirmation({ open, message, bankAccount, busy, onClose, onConfirm }: {
  readonly open: boolean;
  readonly message: string;
  readonly bankAccount?: EventBankAccount | null;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <ModalShell open={open} onClose={() => { if (!busy) onClose(); }} labelledBy="event-confirmation-title"
      className="public-theme flex max-h-[calc(100dvh-40px)] w-[min(520px,calc(100vw-32px))] flex-col overflow-hidden rounded-modal border border-border bg-card shadow-[var(--shadow-modal)]">
      <header className="border-b border-border-soft px-5 py-5 sm:px-6">
        <h2 id="event-confirmation-title" className="text-xl font-bold">신청 전 확인해 주세요</h2>
        <p className="mt-2 text-sm text-muted-strong">안내를 확인한 뒤 신청을 완료해 주세요.</p>
      </header>
      <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-6">
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{message}</p>
        {bankAccount ? <BankAccountDetails key={`${bankAccount.bankName}:${bankAccount.accountNumber}:${bankAccount.accountHolder}`} account={bankAccount} /> : null}
      </div>
      <DialogFooter>
        <SecondaryButton disabled={busy} onClick={onClose}>돌아가기</SecondaryButton>
        <PrimaryButton disabled={busy} onClick={onConfirm}>{busy ? "보내는 중…" : "확인하고 신청하기"}</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}

function BankAccountDetails({ account }: { readonly account: EventBankAccount }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumberToCopy(account));
      setCopyState("copied");
    } catch { setCopyState("error"); }
  };
  return <section aria-label="입금 계좌" className="mt-5 rounded-control border border-brand-line bg-brand-soft p-4">
    <h3 className="text-sm font-bold">입금 계좌</h3>
    <p className="mt-3 text-sm font-semibold">{account.bankName}</p>
    <p className="num mt-1 select-all break-all text-lg font-bold">{account.accountNumber}</p>
    <p className="mt-2 break-words text-sm text-muted-strong">예금주: {account.accountHolder}</p>
    <SecondaryButton onClick={() => void copy()} className="mt-4 w-full">{copyState === "copied" ? "계좌번호 복사됨" : "계좌번호 복사"}</SecondaryButton>
    {copyState === "copied" ? <p role="status" className="mt-2 text-xs leading-6 text-brand">계좌번호를 복사했어요. 은행 앱에 붙여 넣어 주세요.</p> : copyState === "error" ? <p role="alert" className="mt-2 text-xs leading-6 text-fail">복사하지 못했어요. 위 계좌번호를 길게 누르거나 선택해 직접 복사해 주세요.</p> : null}
  </section>;
}
