"use client";

import { useId, useState } from "react";
import { FieldTextarea, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { INVITATION_PLACEHOLDERS, previewValues, renderInvitation } from "@/features/timetables/invitation-template";
import { TIMETABLE_LIMITS, type TimetableBoard } from "@/features/timetables/types";
import { SheetDialog } from "./sheet-dialog";

export function InvitationDialog({ board, onSave, onClose }: {
  readonly board: TimetableBoard;
  readonly onSave: (template: string) => Promise<boolean>;
  readonly onClose: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(board.invitationTemplate);
  const [saving, setSaving] = useState(false);
  const isDefault = text.trim() === board.defaultInvitationTemplate;
  const sample = previewValues(board);

  const insert = (token: string) => {
    const field = document.getElementById(`${id}-text`) as HTMLTextAreaElement | null;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const save = async () => {
    setSaving(true);
    const saved = await onSave(isDefault ? "" : text);
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <SheetDialog
      title="합격 문자 문구"
      subtitle="버튼을 누르면 배우마다 달라지는 값이 들어갈 자리를 넣어요."
      busy={saving}
      onClose={onClose}
      footer={(
        <>
          <SecondaryButton data-autofocus="true" onClick={onClose} disabled={saving}>닫기</SecondaryButton>
          <PrimaryButton onClick={() => void save()} disabled={saving || !text.trim()} aria-busy={saving || undefined}>
            {saving ? "저장 중…" : "저장"}
          </PrimaryButton>
        </>
      )}
    >
      <div role="group" aria-label="자동으로 채울 값" className="flex flex-wrap gap-1.5">
        {INVITATION_PLACEHOLDERS.map((placeholder) => (
          <button
            key={placeholder.token}
            type="button"
            onClick={() => insert(placeholder.token)}
            className="min-h-11 rounded-full border border-brand-line bg-brand-soft px-3 text-sm font-semibold text-brand hover:bg-brand-soft-strong"
          >
            + {placeholder.label}
          </button>
        ))}
      </div>
      <label htmlFor={`${id}-text`} className="sr-only">합격 문자 문구</label>
      <FieldTextarea
        id={`${id}-text`}
        rows={7}
        value={text}
        maxLength={TIMETABLE_LIMITS.invitationTemplateLength}
        onChange={(event) => setText(event.target.value)}
        className="mt-3 resize-y"
      />
      <div className="mt-1 flex min-h-11 items-center justify-between text-xs text-muted">
        <span className="num">{text.length}/{TIMETABLE_LIMITS.invitationTemplateLength}</span>
        {isDefault ? <span>기본 문구</span> : (
          <TextButton onClick={() => setText(board.defaultInvitationTemplate)} className="min-h-11 px-2">기본 문구로 되돌리기</TextButton>
        )}
      </div>

      <p className="mt-4 text-sm font-semibold">미리보기 <span className="font-normal text-muted">· {sample.actorName}님에게 가는 문자</span></p>
      <div className="mt-2 whitespace-pre-line rounded-control bg-surface px-3 py-3 text-sm text-foreground">
        <span className="text-muted">[예술인] 오디션 합격 안내</span>
        {"\n\n"}
        {renderInvitation(text, sample)}
        {"\n\n"}
        <span className="text-muted">
          {"▶ 내 오디션 일정\n(배우마다 다른 링크)\n\n[주의] 본인만 쓰는 링크입니다. 다른 사람에게 보내지 마세요."}
        </span>
      </div>
      <p className="mt-2 text-xs text-muted">링크와 주의 문구는 자동으로 붙어요. 아직 보내지 않은 문자에도 바로 반영돼요.</p>
    </SheetDialog>
  );
}
