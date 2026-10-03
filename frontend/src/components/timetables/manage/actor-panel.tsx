"use client";

import { useId, useState } from "react";
import { FieldInput, FieldTextarea, PrimaryButton, SegmentButton, TextButton } from "@/components/ui/controls";
import type { BoardDraft } from "@/features/timetables/board-draft";
import { normalizePhone, parseContacts } from "@/features/timetables/contacts";
import { formatSlot, slotFromKey, slotKey } from "@/features/timetables/time";
import { TIMETABLE_LIMITS, type ActorContact, type TimetableBoard } from "@/features/timetables/types";
import { ActorChip } from "./actor-chip";

type Mode = "single" | "bulk";

/**
 * 합격 배우 등록(한 명씩 또는 여러 줄 붙여 넣기)과 배우 명단. 미배정 영역에 이름표를 놓으면 시간을 비운다.
 * 등록·삭제는 바로 저장되고, 시간 이동은 보드의 저장 버튼으로 저장한다.
 */
export function ActorPanel({
  board,
  draft,
  selectedActorId,
  problemActorIds,
  busy,
  onRegister,
  onRemove,
  onSelect,
  onPlace,
}: {
  readonly board: TimetableBoard;
  readonly draft: BoardDraft;
  readonly selectedActorId: number | null;
  readonly problemActorIds: ReadonlySet<number>;
  readonly busy: boolean;
  readonly onRegister: (contacts: readonly ActorContact[]) => Promise<boolean>;
  readonly onRemove: (actorId: number) => void;
  readonly onSelect: (actorId: number | null) => void;
  readonly onPlace: (actorId: number, key: string | null) => void;
}) {
  const id = useId();
  const [mode, setMode] = useState<Mode>("single");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const parsed = parseContacts(bulkText);
  const unassigned = board.actors.filter((actor) => !draft.slots[actor.id]);
  const remaining = TIMETABLE_LIMITS.maxActors - board.actors.length;

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
    <section aria-labelledby={`${id}-heading`} className="rounded-card border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <h2 id={`${id}-heading`} className="text-base font-bold">
          합격 배우 <span className="num text-muted">{board.actors.length}명</span>
        </h2>
        <div className="mt-3 inline-flex overflow-hidden rounded-control border border-border" role="group" aria-label="등록 방식">
          <SegmentButton pressed={mode === "single"} onClick={() => setMode("single")}>한 명씩</SegmentButton>
          <SegmentButton pressed={mode === "bulk"} onClick={() => setMode("bulk")}>여러 명 붙여넣기</SegmentButton>
        </div>

        {mode === "single" ? (
          <form onSubmit={submitSingle} noValidate className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-muted-strong">
                이름
                <FieldInput
                  value={name}
                  maxLength={TIMETABLE_LIMITS.actorNameLength}
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                  aria-invalid={singleError && !name.trim() ? true : undefined}
                  aria-describedby={singleError ? `${id}-single-error` : undefined}
                  className="mt-1"
                />
              </label>
              <label className="text-xs font-semibold text-muted-strong">
                휴대폰 (필수)
                <FieldInput
                  value={phone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="010-1234-5678"
                  onChange={(event) => setPhone(event.target.value)}
                  onBlur={() => setPhone((current) => normalizePhone(current) ?? current)}
                  aria-invalid={singleError && name.trim() ? true : undefined}
                  aria-describedby={singleError ? `${id}-single-error` : undefined}
                  className="mt-1"
                />
              </label>
            </div>
            {singleError ? <p id={`${id}-single-error`} role="alert" className="text-sm text-fail">{singleError}</p> : null}
            <PrimaryButton type="submit" disabled={busy || remaining <= 0} className="w-full">배우 추가</PrimaryButton>
          </form>
        ) : (
          <div className="mt-3 space-y-2">
            <label htmlFor={`${id}-bulk`} className="text-xs font-semibold text-muted-strong">한 줄에 한 명씩 이름과 번호</label>
            <FieldTextarea
              id={`${id}-bulk`}
              rows={5}
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              placeholder={"김배우 010-1111-2222\n이배우\t01033334444\n(엑셀에서 이름·번호 열을 복사해 붙여 넣어도 돼요)"}
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
              ) : <p className="text-muted">번호가 같은 줄은 한 번만 등록돼요.</p>}
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

      <div
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes("text/plain")) return;
          event.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          const actorId = Number(event.dataTransfer.getData("text/plain"));
          if (Number.isInteger(actorId) && board.actors.some((actor) => actor.id === actorId)) onPlace(actorId, null);
        }}
        className={`border-b border-border px-4 py-3 transition-colors ${dropActive ? "bg-brand-soft" : ""}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold">미배정 <span className="num text-muted">{unassigned.length}명</span></h3>
          {selectedActorId !== null && draft.slots[selectedActorId] ? (
            <TextButton onClick={() => onPlace(selectedActorId, null)} className="min-h-9 px-2 text-sm">
              선택한 배우 시간 비우기
            </TextButton>
          ) : null}
        </div>
        {unassigned.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {unassigned.map((actor) => (
              <ActorChip
                key={actor.id}
                actor={actor}
                selected={selectedActorId === actor.id}
                moved={actor.slot !== null}
                problem={problemActorIds.has(actor.id)}
                disabled={busy}
                onSelect={onSelect}
                onDragStart={() => undefined}
                onDragEnd={() => undefined}
                className="min-h-8 px-2 text-sm"
              />
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">{board.actors.length ? "모든 배우의 시간이 정해졌어요." : "배우를 등록하면 여기에 나타나요."}</p>
        )}
      </div>

      {board.actors.length > 0 ? (
        <ul aria-label="배우 명단" className="max-h-[420px] divide-y divide-border-soft overflow-y-auto">
          {board.actors.map((actor) => {
            const key = draft.slots[actor.id] ?? null;
            const serverKey = actor.slot ? slotKey(actor.slot) : null;
            return (
              <li key={actor.id} className={`flex items-center gap-2 px-4 py-2.5 ${selectedActorId === actor.id ? "bg-brand-soft" : ""}`}>
                <button
                  type="button"
                  onClick={() => onSelect(selectedActorId === actor.id ? null : actor.id)}
                  aria-pressed={selectedActorId === actor.id}
                  className="min-h-11 min-w-0 flex-1 rounded-control px-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="block truncate text-sm font-semibold">
                    {actor.name} <span className="num font-normal text-muted">{actor.phone}</span>
                  </span>
                  <span className={`block truncate text-xs ${problemActorIds.has(actor.id) ? "text-fail" : key !== serverKey ? "text-warn" : "text-muted-strong"}`}>
                    {key ? formatSlot(slotFromKey(key)) : "미배정"}
                    {key !== serverKey ? " · 저장 전" : ""}
                    {actor.invited ? " · 안내함" : ""}
                    {actor.actorChangedAt && key === serverKey ? " · ↻ 배우가 직접 바꿈" : ""}
                  </span>
                </button>
                <TextButton
                  onClick={() => onRemove(actor.id)}
                  disabled={busy}
                  aria-label={`${actor.name} 배우 명단에서 빼기`}
                  className="min-h-11 shrink-0 px-2 text-sm"
                >
                  빼기
                </TextButton>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
