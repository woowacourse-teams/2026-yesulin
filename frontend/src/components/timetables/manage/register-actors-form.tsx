"use client";

import { useId, useState } from "react";
import { FieldInput, FieldTextarea, PrimaryButton, SegmentButton } from "@/components/ui/controls";
import { formatPhoneInput, normalizePhone, parseContacts } from "@/features/timetables/contacts";
import { TIMETABLE_LIMITS, type ActorContact } from "@/features/timetables/types";

type Mode = "single" | "bulk";

/**
 * 합격 배우를 한 명씩 또는 여러 줄 붙여 넣어 등록한다. 등록은 바로 저장되고, 보드가 방금 등록한 배우를 빈 칸에 배정한다.
 * 보드가 비어 있을 때는 붙여넣기를 기본으로 크게 보여 준다.
 */
export function RegisterActorsForm({ busy, remaining, defaultMode = "single", bulkRows = 5, onRegister }: {
  readonly busy: boolean;
  readonly remaining: number;
  readonly defaultMode?: Mode;
  readonly bulkRows?: number;
  readonly onRegister: (contacts: readonly ActorContact[]) => Promise<boolean>;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const parsed = parseContacts(bulkText);

  const submitSingle = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = normalizePhone(phone);
    if (!name.trim()) {
      setSingleError("이름을 입력해 주세요.");
      return;
    }
    if (!normalized) {
      setSingleError("휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요.");
      return;
    }
    setSingleError(null);
    if (await onRegister([{ name: name.trim(), phone: normalized }])) {
      setName("");
      setPhone("");
    }
  };

  const submitBulk = async () => {
    if (parsed.contacts.length === 0 || parsed.errors.length > 0) return;
    if (await onRegister(parsed.contacts)) setBulkText("");
  };

  return (
    <div>
      <div className="inline-flex overflow-hidden rounded-control border border-border" role="group" aria-label="등록 방식">
        <SegmentButton pressed={mode === "bulk"} onClick={() => setMode("bulk")}>여러 명 붙여넣기</SegmentButton>
        <SegmentButton pressed={mode === "single"} onClick={() => setMode("single")}>한 명씩</SegmentButton>
      </div>

      {mode === "single" ? (
        <form onSubmit={submitSingle} noValidate className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <FieldInput
              value={name}
              maxLength={TIMETABLE_LIMITS.actorNameLength}
              autoComplete="off"
              placeholder="이름"
              aria-label="이름"
              onChange={(event) => setName(event.target.value)}
              aria-invalid={singleError && !name.trim() ? true : undefined}
              aria-describedby={singleError ? `${id}-single-error` : undefined}
              className="aria-invalid:border-fail"
            />
            <FieldInput
              value={phone}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              maxLength={13}
              placeholder="010-1234-5678"
              aria-label="휴대폰"
              onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
              aria-invalid={singleError && name.trim() ? true : undefined}
              aria-describedby={singleError ? `${id}-single-error` : undefined}
              className="aria-invalid:border-fail"
            />
          </div>
          {singleError ? <p id={`${id}-single-error`} role="alert" className="text-sm text-fail">{singleError}</p> : null}
          <PrimaryButton type="submit" disabled={busy || remaining <= 0} className="w-full">배우 추가</PrimaryButton>
        </form>
      ) : (
        <div className="mt-3 space-y-2">
          <FieldTextarea
            rows={bulkRows}
            value={bulkText}
            aria-label="한 줄에 한 명씩 이름과 휴대폰 번호"
            onChange={(event) => setBulkText(event.target.value)}
            placeholder={"이름과 번호를 한 줄에 한 명씩 붙여 넣어 주세요\n김배우 010-1111-2222\n이배우\t01033334444"}
            aria-describedby={`${id}-bulk-summary`}
            className="resize-y font-mono text-sm"
          />
          <div id={`${id}-bulk-summary`} aria-live="polite" className="text-sm">
            {bulkText.trim() ? (
              <>
                <p className="text-muted-strong"><strong className="num text-foreground">{parsed.contacts.length}</strong>명 인식했어요.</p>
                {parsed.errors.length > 0 ? (
                  <ul className="mt-1 space-y-0.5 text-fail">
                    {parsed.errors.slice(0, 5).map((error) => (
                      <li key={error.line}><span className="num">{error.line}</span>번째 줄 “{error.text}”: {error.message}</li>
                    ))}
                    {parsed.errors.length > 5 ? <li>그 밖에 {parsed.errors.length - 5}줄도 확인해 주세요.</li> : null}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
          <PrimaryButton
            onClick={submitBulk}
            disabled={busy || parsed.contacts.length === 0 || parsed.errors.length > 0 || parsed.contacts.length > remaining}
            className="w-full"
          >
            {parsed.contacts.length > 0 ? `${parsed.contacts.length}명 등록` : "등록"}
          </PrimaryButton>
          {parsed.contacts.length > remaining ? (
            <p className="text-sm text-fail">한 일정표에는 {TIMETABLE_LIMITS.maxActors}명까지 등록할 수 있어요. 지금 {remaining}명 더 등록할 수 있어요.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
