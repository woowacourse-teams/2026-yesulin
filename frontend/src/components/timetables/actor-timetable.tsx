"use client";

import { useEffect, useId, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FieldTextarea, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { changeActorSlot, getActorTimetable, requestActorTime } from "@/features/timetables/api";
import { formatDate, formatInstant, sameSlot, toHm } from "@/features/timetables/time";
import { TIMETABLE_KEY_PATTERN, TIMETABLE_LIMITS, type ActorTimetable, type TimeSlotRange } from "@/features/timetables/types";
import { TimetableHeader } from "./timetable-header";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly timetable: ActorTimetable };

const errorMessage = (cause: unknown, fallback: string) => (cause instanceof AuditionRequestError ? cause.message : fallback);

/**
 * 배우가 문자로 받은 개인 링크로 여는 화면. 내 일정을 보고, 기획사가 정한 시간대 안의 빈 시간으로 바로 옮긴다.
 * 맞는 시간이 없을 때만 기획사에게 요청을 남긴다.
 */
export function ActorTimetableView({ accessKey }: { readonly accessKey: string }) {
  const validKey = TIMETABLE_KEY_PATTERN.test(accessKey);
  const [state, setState] = useState<LoadState>(() => (validKey ? { status: "loading" } : { status: "notFound" }));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!validKey) return;
    let active = true;
    getActorTimetable(accessKey)
      .then((timetable) => { if (active) setState({ status: "ready", timetable }); })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof AuditionRequestError && cause.status === 404) setState({ status: "notFound" });
        else setState({ status: "error", message: errorMessage(cause, "일정을 불러오지 못했어요.") });
      });
    return () => { active = false; };
  }, [accessKey, validKey, reloadToken]);

  return (
    <main className="min-h-dvh break-keep bg-surface pb-16 text-foreground wrap-break-word">
      <TimetableHeader width="narrow" />
      <div className="mx-auto max-w-[640px] px-4 py-6 md:px-8 md:py-10">
        {state.status === "loading" ? (
          <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">일정을 불러오는 중…</p>
        ) : null}
        {state.status === "notFound" ? (
          <div className="rounded-card border border-border bg-card px-5 py-14 text-center">
            <p className="text-lg font-bold">일정을 찾을 수 없어요</p>
            <p className="mt-2 text-sm text-muted-strong">문자로 받은 링크를 다시 확인해 주세요. 계속 열리지 않으면 오디션 담당자에게 문의해 주세요.</p>
          </div>
        ) : null}
        {state.status === "error" ? (
          <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} />
        ) : null}
        {state.status === "ready" ? (
          <ActorSchedule
            accessKey={accessKey}
            timetable={state.timetable}
            onChange={(timetable) => setState({ status: "ready", timetable })}
            onReload={() => setReloadToken((value) => value + 1)}
          />
        ) : null}
      </div>
    </main>
  );
}

function ActorSchedule({ accessKey, timetable, onChange, onReload }: {
  readonly accessKey: string;
  readonly timetable: ActorTimetable;
  readonly onChange: (timetable: ActorTimetable) => void;
  readonly onReload: () => void;
}) {
  const { slot } = timetable;
  return (
    <div className="space-y-5">
      <section aria-labelledby="actor-schedule-heading" className="overflow-hidden rounded-card border border-border bg-card">
        <div className="bg-foreground px-5 py-6 text-white md:px-6">
          <p className="text-sm font-semibold text-white/70">{timetable.organizerName} · {timetable.title}</p>
          <h1 id="actor-schedule-heading" className="mt-2 text-xl font-bold text-white">{timetable.actorName}님의 오디션 일정</h1>
          {slot ? (
            <p className="mt-4">
              <span className="block text-lg font-semibold">{formatDate(slot.date)}</span>
              <span className="num block text-[clamp(32px,9vw,44px)] font-bold leading-tight tracking-[-0.03em]">
                {toHm(slot.startTime)} ~ {toHm(slot.endTime)}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-lg font-semibold">아직 시간이 정해지지 않았어요.</p>
          )}
        </div>
        {timetable.location || timetable.guide ? (
          <dl className="space-y-4 px-5 py-5 text-sm md:px-6">
            {timetable.location ? (
              <div>
                <dt className="font-semibold text-muted-strong">장소</dt>
                <dd className="mt-1 text-base text-foreground">{timetable.location}</dd>
              </div>
            ) : null}
            {timetable.guide ? (
              <div>
                <dt className="font-semibold text-muted-strong">안내 사항</dt>
                <dd className="mt-1 whitespace-pre-line text-base text-foreground">{timetable.guide}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>

      <SelfChangeSection accessKey={accessKey} timetable={timetable} onChange={onChange} onReload={onReload} />
      <TimeRequestSection accessKey={accessKey} timetable={timetable} onChange={onChange} />
    </div>
  );
}

function SelfChangeSection({ accessKey, timetable, onChange, onReload }: {
  readonly accessKey: string;
  readonly timetable: ActorTimetable;
  readonly onChange: (timetable: ActorTimetable) => void;
  readonly onReload: () => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<TimeSlotRange | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { slot } = timetable;

  if (timetable.selfChange !== "OPEN" || !slot) {
    return (
      <section className="rounded-card border border-border bg-card px-5 py-4 text-sm text-muted-strong md:px-6">
        <h2 className="text-base font-bold text-foreground">시간 바꾸기</h2>
        <p className="mt-1">
          {timetable.selfChange === "LOCKED"
            ? "담당자가 일정 변경을 마감했어요. 꼭 바꿔야 한다면 아래에서 요청을 남겨 주세요."
            : `오디션 시작 ${timetable.selfChangeNoticeHours}시간 전이 지나 직접 바꿀 수 없어요. 꼭 바꿔야 한다면 아래에서 요청을 남겨 주세요.`}
        </p>
      </section>
    );
  }

  const dates = [...new Set(timetable.openSlots.map((open) => open.date))];
  const confirm = async () => {
    if (!choice) return;
    setSaving(true);
    try {
      const next = await changeActorSlot(accessKey, slot, choice);
      onChange(next);
      setOpen(false);
      setChoice(null);
      toast("시간을 바꿨어요. 담당자 화면에도 바로 반영돼요.", { type: "success" });
    } catch (cause) {
      if (cause instanceof AuditionRequestError && cause.status === 409) setConflict(true);
      toast(errorMessage(cause, "시간을 바꾸지 못했어요. 다시 시도해 주세요."), { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="self-change-heading" className="rounded-card border border-border bg-card px-5 py-5 md:px-6">
      <h2 id="self-change-heading" className="text-base font-bold">시간 바꾸기</h2>
      <p className="mt-1 text-sm text-muted-strong">
        담당자가 정한 시간대 안의 빈 시간으로 바로 바꿀 수 있어요. 따로 연락하지 않아도 돼요.
        {timetable.changeDeadline ? ` ${formatInstant(timetable.changeDeadline)}까지 바꿀 수 있어요.` : ""}
      </p>
      {conflict ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-2 rounded-control bg-warn-bg px-3 py-2 text-sm text-warn">
          그사이 일정이나 빈 시간이 바뀌었어요.
          <TextButton onClick={() => { setConflict(false); setChoice(null); onReload(); }} className="min-h-9 px-2">새로 불러오기</TextButton>
        </div>
      ) : null}
      {!open ? (
        <SecondaryButton onClick={() => setOpen(true)} className="mt-4 w-full" disabled={timetable.openSlots.length === 0}>
          {timetable.openSlots.length > 0 ? `다른 시간 보기 (빈 시간 ${timetable.openSlots.length}개)` : "지금 고를 수 있는 빈 시간이 없어요"}
        </SecondaryButton>
      ) : (
        <div className="mt-4 space-y-4">
          {dates.map((date) => (
            <fieldset key={date}>
              <legend className="text-sm font-bold">{formatDate(date)}</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {timetable.openSlots.filter((open) => open.date === date).map((open) => {
                  const selected = sameSlot(choice, open);
                  return (
                    <button
                      key={`${open.date}-${open.startTime}`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setChoice(selected ? null : open)}
                      className={`num min-h-11 rounded-control border text-sm font-semibold transition-colors ${
                        selected ? "border-foreground bg-foreground text-white" : "border-border bg-card text-foreground hover:border-brand-line hover:bg-brand-soft"
                      }`}
                    >
                      {toHm(open.startTime)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <div className="sticky bottom-0 -mx-5 border-t border-border bg-card px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:-mx-6 md:px-6">
            <p className="text-sm text-muted-strong" aria-live="polite">
              {choice ? <><strong className="text-foreground">{formatDate(choice.date)} {toHm(choice.startTime)}~{toHm(choice.endTime)}</strong>으로 바꿀까요?</> : "바꿀 시간을 골라 주세요."}
            </p>
            <div className="mt-2 flex gap-2">
              <SecondaryButton onClick={() => { setOpen(false); setChoice(null); }} disabled={saving} className="flex-1">닫기</SecondaryButton>
              <PrimaryButton onClick={confirm} disabled={!choice || saving} aria-busy={saving || undefined} className="flex-1">
                {saving ? "바꾸는 중…" : "이 시간으로 바꾸기"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function TimeRequestSection({ accessKey, timetable, onChange }: {
  readonly accessKey: string;
  readonly timetable: ActorTimetable;
  readonly onChange: (timetable: ActorTimetable) => void;
}) {
  const id = useId();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const { request } = timetable;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      onChange(await requestActorTime(accessKey, message));
      setEditing(false);
      setMessage("");
      toast("담당자에게 요청을 전달했어요. 시간이 바뀌면 문자로 알려 드려요.", { type: "success" });
    } catch (cause) {
      toast(errorMessage(cause, "요청을 보내지 못했어요. 다시 시도해 주세요."), { type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-card border border-border bg-card px-5 py-5 md:px-6">
      <h2 id={`${id}-heading`} className="text-base font-bold">맞는 시간이 없나요?</h2>
      {request && !editing ? (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-muted-strong">{formatInstant(request.createdAt)}에 담당자에게 요청을 보냈어요. 시간이 바뀌면 문자로 알려 드려요.</p>
          <p className="whitespace-pre-line rounded-control bg-surface px-3 py-2 text-foreground">{request.message}</p>
          <TextButton onClick={() => { setMessage(request.message); setEditing(true); }} className="min-h-9 px-2">요청 내용 고치기</TextButton>
        </div>
      ) : (
        <form onSubmit={send} className="mt-2 space-y-2">
          <label htmlFor={`${id}-message`} className="block text-sm text-muted-strong">
            가능한 날짜·시간이나 사정을 적어 주시면 담당자에게 전달해요.
          </label>
          <FieldTextarea
            id={`${id}-message`}
            rows={3}
            value={message}
            maxLength={TIMETABLE_LIMITS.requestLength}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="예: 10일은 공연이 있어서 11일 오후라면 가능해요."
            className="resize-y"
          />
          <div className="flex gap-2">
            {editing ? <SecondaryButton onClick={() => setEditing(false)} disabled={sending} className="flex-1">취소</SecondaryButton> : null}
            <PrimaryButton type="submit" disabled={sending || !message.trim()} className="flex-1">
              {sending ? "보내는 중…" : "담당자에게 요청하기"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </section>
  );
}
