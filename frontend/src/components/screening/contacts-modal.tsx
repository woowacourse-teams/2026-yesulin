"use client";

import { useState } from "react";
import { ROUND_LABELS, STATUS_LABELS } from "@/features/screening/labels";
import type { Applicant } from "@/features/screening/types";
import { useBoard } from "./board-context";
import { DialogFooter, DialogHeader, ModalShell, dialogButton } from "./modal-shell";
import { useToast } from "./toast";

const TITLE_ID = "contacts-modal-title";

/** 서비스가 연락을 대신 보내지 않는다. 명단을 한 덩어리로 만들어 줄 뿐이다. */
const FORMATS = {
  line: { label: "이름 + 번호", build: (l: readonly Applicant[]) => l.map((a) => `${a.name} ${a.phone}`).join("\n") },
  phone: { label: "번호만", build: (l: readonly Applicant[]) => l.map((a) => a.phone).join("\n") },
  comma: { label: "쉼표로", build: (l: readonly Applicant[]) => l.map((a) => a.phone).join(", ") },
  email: { label: "이메일", build: (l: readonly Applicant[]) => l.map((a) => a.email).join(", ") },
} as const;

type FormatKey = keyof typeof FORMATS;

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (cause: unknown) {
    if (cause instanceof Error) return false;
    throw cause;
  }
}

export function ContactsModal() {
  const { board, contactList, closeContacts } = useBoard();
  const [format, setFormat] = useState<FormatKey>("line");
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  if (!contactList || contactList.length === 0) return null;

  const statuses = [...new Set(contactList.map((applicant) => applicant.review.status))];
  const statusLabel = statuses.length === 1 && statuses[0] ? STATUS_LABELS[statuses[0]] : "선택";
  const text = FORMATS[format].build(contactList);

  return (
    <ModalShell
      open
      onClose={closeContacts}
      labelledBy={TITLE_ID}
      className="flex max-h-[88vh] w-[min(560px,93vw)] flex-col rounded-[10px] bg-card shadow-[0_16px_48px_rgba(0,0,0,0.2)]"
    >
      <DialogHeader
        id={TITLE_ID}
        title={`${board.role.name} · ${ROUND_LABELS[board.round]} ${statusLabel} ${contactList.length}명`}
        subtitle="연락처를 복사해 기존 방식대로 연락하세요"
      />

      <div className="flex-1 overflow-y-auto px-[22px] py-[17px]">
        <p className="mb-3.5 rounded-control border border-border bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-strong">
          예술in은 결과를 대신 발송하지 않습니다. 아래 연락처를 복사해 단체 채팅방·문자·전화 등 쓰시던
          방법으로 연락해 주세요.
        </p>

        <div className="mb-2.5 flex gap-[5px]">
          {(Object.keys(FORMATS) as readonly FormatKey[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={format === key}
              onClick={() => setFormat(key)}
              className={`rounded-full border px-[11px] py-1 text-[12.5px] ${
                format === key
                  ? "border-foreground bg-foreground font-medium text-white"
                  : "border-border bg-card text-muted-strong"
              }`}
            >
              {FORMATS[key].label}
            </button>
          ))}
        </div>

        <div className="relative mb-1.5">
          <label className="sr-only" htmlFor="contact-text">
            연락처 목록
          </label>
          <textarea
            id="contact-text"
            readOnly
            value={text}
            className="min-h-[180px] w-full resize-y rounded-control border border-border bg-surface px-[13px] py-3 text-[13px] leading-[1.75]"
          />
          <button
            type="button"
            onClick={() => {
              void copyToClipboard(text).then((ok) => {
                setCopied(ok);
                toast(
                  ok
                    ? `${contactList.length}명 연락처를 복사했습니다`
                    : "복사에 실패했습니다. 직접 선택해 복사해 주세요.",
                );
                if (ok) setTimeout(() => setCopied(false), 1600);
              });
            }}
            className={`absolute right-2 top-2 rounded-full border px-3 py-[5px] text-xs font-medium ${
              copied ? "border-pass bg-pass-bg text-pass" : "border-border bg-card hover:border-muted-soft"
            }`}
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>

        <p className="text-xs text-muted">
          {contactList.map((applicant) => applicant.name).join(" · ")}
        </p>
      </div>

      <DialogFooter>
        <button type="button" className={dialogButton} onClick={closeContacts}>
          닫기
        </button>
      </DialogFooter>
    </ModalShell>
  );
}
