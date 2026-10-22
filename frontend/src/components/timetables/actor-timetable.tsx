"use client";

import { useEffect, useId, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FieldTextarea, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { answerAttendance, getActorTimetable, requestActorTime } from "@/features/timetables/api";
import { formatDate, formatInstant, toHm } from "@/features/timetables/time";
import { TIMETABLE_KEY_PATTERN, TIMETABLE_LIMITS, type ActorTimetable, type Attendance } from "@/features/timetables/types";
import { TimetableHeader } from "./timetable-header";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "notFound" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly timetable: ActorTimetable };

const errorMessage = (cause: unknown, fallback: string) => (cause instanceof AuditionRequestError ? cause.message : fallback);

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
          />
        ) : null}
      </div>
    </main>
  );
}

function ActorSchedule({ accessKey, timetable, onChange }: {
  readonly accessKey: string;
  readonly timetable: ActorTimetable;
  readonly onChange: (timetable: ActorTimetable) => void;
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

      {slot ? <AttendanceSection accessKey={accessKey} timetable={timetable} onChange={onChange} /> : null}
      <TimeRequestSection accessKey={accessKey} timetable={timetable} onChange={onChange} />
    </div>
  );
}

const ATTENDANCE_CHOICES: readonly { readonly value: Attendance; readonly label: string; readonly selected: string }[] = [
  { value: "ATTENDING", label: "참석", selected: "border-pass bg-pass text-white" },
  { value: "ABSENT", label: "불참", selected: "border-fail bg-fail text-white" },
];

function AttendanceSection({ accessKey, timetable, onChange }: {
  readonly accessKey: string;
  readonly timetable: ActorTimetable;
  readonly onChange: (timetable: ActorTimetable) => void;
}) {
  const id = useId();
  const toast = useToast();
  const [saving, setSaving] = useState<Attendance | null>(null);

  const answer = async (attendance: Attendance) => {
    setSaving(attendance);
    try {
      onChange(await answerAttendance(accessKey, attendance));
      toast(attendance === "ATTENDING" ? "참석으로 알렸어요." : "불참으로 알렸어요. 담당자 화면에 바로 표시돼요.", { type: "success" });
    } catch (cause) {
      toast(errorMessage(cause, "참석 여부를 알리지 못했어요. 다시 시도해 주세요."), { type: "error" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-card border border-border bg-card px-5 py-5 md:px-6">
      <h2 id={`${id}-heading`} className="text-base font-bold">참석하시나요?</h2>
      <p className="mt-1 text-sm text-muted-strong">
        {timetable.attendance === "UNANSWERED"
          ? "참석 여부를 알려 주시면 담당자에게 바로 전달돼요."
          : `${timetable.attendance === "ATTENDING" ? "참석" : "불참"}으로 알렸어요. 바뀌면 다시 골라 주세요.`}
      </p>
      <div role="group" aria-labelledby={`${id}-heading`} className="mt-4 grid grid-cols-2 gap-2">
        {ATTENDANCE_CHOICES.map((choice) => {
          const selected = timetable.attendance === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={selected}
              disabled={saving !== null}
              onClick={() => void answer(choice.value)}
              className={`min-h-12 rounded-control border text-base font-bold transition-colors disabled:opacity-60 ${
                selected ? choice.selected : "border-border bg-card text-foreground hover:bg-surface"
              }`}
            >
              {saving === choice.value ? "알리는 중…" : choice.label}
            </button>
          );
        })}
      </div>
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
      toast("담당자에게 문의를 전달했어요. 시간이 바뀌면 문자로 알려 드려요.", { type: "success" });
    } catch (cause) {
      toast(errorMessage(cause, "문의를 보내지 못했어요. 다시 시도해 주세요."), { type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="rounded-card border border-border bg-card px-5 py-5 md:px-6">
      <h2 id={`${id}-heading`} className="text-base font-bold">시간 변경이 필요하신가요?</h2>
      {request && !editing ? (
        <div className="mt-2 space-y-2 text-sm">
          <p className="text-muted-strong">{formatInstant(request.createdAt)}에 담당자에게 문의를 보냈어요. 시간이 바뀌면 문자로 알려 드려요.</p>
          <p className="whitespace-pre-line rounded-control bg-surface px-3 py-2 text-foreground">{request.message}</p>
          <TextButton onClick={() => { setMessage(request.message); setEditing(true); }} className="min-h-11 px-2">문의 내용 고치기</TextButton>
        </div>
      ) : (
        <form onSubmit={send} className="mt-2 space-y-2">
          <label htmlFor={`${id}-message`} className="block text-sm text-muted-strong">
            시간은 담당자가 정해요. 가능한 날짜·시간이나 사정을 적어 주시면 담당자에게 전달해요.
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
              {sending ? "보내는 중…" : "담당자에게 문의하기"}
            </PrimaryButton>
          </div>
        </form>
      )}
    </section>
  );
}
