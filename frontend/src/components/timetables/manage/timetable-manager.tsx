"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { DarkButton, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import {
  changeSelfChangeLock,
  getTimetableBoard,
  publishTimetable,
  registerTimetableActors,
  removeTimetableActor,
  resolveTimetableRequest,
  saveTimetableBoard,
  updateTimetableProfile,
} from "@/features/timetables/api";
import {
  assignmentsOf,
  autoAssign,
  changeCount,
  changeSetting,
  draftFrom,
  moveActor,
  noticesOnSave,
  occupancy,
  problemsOf,
  rebaseDraft,
  type BoardDraft,
} from "@/features/timetables/board-draft";
import { formatInstant, formatSlot, slotFromKey, slotsOf } from "@/features/timetables/time";
import { TIMETABLE_KEY_PATTERN, type ActorContact, type TimetableBoard, type TimetableProfile } from "@/features/timetables/types";
import { TimetableHeader } from "../timetable-header";
import { ActorPanel } from "./actor-panel";
import { ManageLinkCard } from "./manage-link-card";
import { ProfileDialog } from "./profile-dialog";
import { RequestsPanel } from "./requests-panel";
import { ScheduleGrid } from "./schedule-grid";
import { SettingDialog } from "./setting-dialog";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string; readonly notFound: boolean }
  | { readonly status: "ready"; readonly board: TimetableBoard; readonly draft: BoardDraft };

type Dialog = "setting" | "profile" | "publish" | "save" | { readonly removeActorId: number } | null;

const errorMessage = (cause: unknown, fallback: string) => (cause instanceof AuditionRequestError ? cause.message : fallback);

/**
 * 기획사가 관리 링크로 여는 일정표 보드. 배정·시간대는 편집본에서 고친 뒤 한 번에 저장하고,
 * 배우 등록·삭제·확정·정보 수정은 바로 저장한다. 확정 뒤에는 저장할 때 바뀐 배우에게 문자가 간다.
 */
export function TimetableManager({ manageKey }: { readonly manageKey: string }) {
  const toast = useToast();
  const justCreated = useSearchParams().get("created") === "1";
  const validKey = TIMETABLE_KEY_PATTERN.test(manageKey);
  const [state, setState] = useState<LoadState>(() => (validKey
    ? { status: "loading" }
    : { status: "error", message: "관리 링크가 올바르지 않아요. 문자로 받은 링크를 다시 확인해 주세요.", notFound: true }));
  const [selectedActorId, setSelectedActorId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!validKey) return;
    let active = true;
    getTimetableBoard(manageKey)
      .then((board) => { if (active) setState({ status: "ready", board, draft: draftFrom(board) }); })
      .catch((cause) => {
        if (!active) return;
        const notFound = cause instanceof AuditionRequestError && cause.status === 404;
        setState({ status: "error", message: errorMessage(cause, "일정표를 불러오지 못했어요."), notFound });
      });
    return () => { active = false; };
  }, [manageKey, validKey, reloadToken]);

  const dirty = state.status === "ready" && changeCount(state.board, state.draft) > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (selectedActorId === null) return;
    const clear = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedActorId(null); };
    window.addEventListener("keydown", clear);
    return () => window.removeEventListener("keydown", clear);
  }, [selectedActorId]);

  const setDraft = useCallback((update: (board: TimetableBoard, draft: BoardDraft) => BoardDraft) => {
    setState((current) => (current.status === "ready" ? { ...current, draft: update(current.board, current.draft) } : current));
  }, []);

  if (state.status === "loading") {
    return (
      <Screen>
        <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">일정표를 불러오는 중…</p>
      </Screen>
    );
  }
  if (state.status === "error") {
    return (
      <Screen>
        {state.notFound ? (
          <div className="rounded-card border border-border bg-card px-5 py-14 text-center">
            <p className="text-lg font-bold">일정표를 찾을 수 없어요</p>
            <p className="mt-2 text-sm text-muted-strong">{state.message}</p>
          </div>
        ) : (
          <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} />
        )}
      </Screen>
    );
  }

  const { board, draft } = state;
  const published = board.status === "PUBLISHED";
  const problems = problemsOf(board, draft);
  const problemActorIds = new Set(problems.flatMap((problem) => problem.actorIds));
  const pendingChanges = changeCount(board, draft);
  const unassignedCount = board.actors.filter((actor) => !draft.slots[actor.id]).length;
  const selectedActor = board.actors.find((actor) => actor.id === selectedActorId) ?? null;
  const capacityLeft = slotsOf(draft.setting).length * draft.setting.slotCapacity - (board.actors.length - unassignedCount);

  /** 서버가 돌려준 새 보드를 반영한다. 편집 중이면 기획사가 옮긴 값만 남기고 나머지는 새 값으로 맞춘다. */
  const applyBoard = (next: TimetableBoard, keepDraft: boolean) => {
    setState((current) => {
      if (current.status !== "ready") return current;
      return { status: "ready", board: next, draft: keepDraft ? rebaseDraft(current.board, next, current.draft) : draftFrom(next) };
    });
    setSelectedActorId((current) => (current !== null && next.actors.some((actor) => actor.id === current) ? current : null));
  };

  const run = async (action: () => Promise<TimetableBoard>, success: string, keepDraft: boolean) => {
    setBusy(true);
    try {
      applyBoard(await action(), keepDraft);
      toast(success, { type: "success" });
      return true;
    } catch (cause) {
      toast(errorMessage(cause, "요청을 처리하지 못했어요. 다시 시도해 주세요."), { type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const place = (actorId: number, key: string | null) => {
    setSelectedActorId(null);
    const current = draft.slots[actorId] ?? null;
    if (current === key) return;
    if (key) {
      const others = (occupancy(board, draft).get(key) ?? []).filter((id) => id !== actorId);
      if (others.length >= draft.setting.slotCapacity) {
        if (draft.setting.slotCapacity !== 1) {
          toast(`이 칸은 정원 ${draft.setting.slotCapacity}명이 찼어요. 다른 칸을 골라 주세요.`, { type: "error" });
          return;
        }
        // 1인 칸이면 두 배우의 시간을 맞바꾼다.
        setDraft((_, base) => moveActor(moveActor(base, others[0], current), actorId, key));
        return;
      }
    }
    setDraft((_, base) => moveActor(base, actorId, key));
  };

  const runAutoAssign = () => {
    const result = autoAssign(board, draft);
    setDraft(() => result.draft);
    if (result.placed === 0) {
      toast("남은 빈 칸이 없어요. 시간대를 늘리거나 정원을 바꿔 주세요.", { type: "error" });
      return;
    }
    toast(
      result.unplaced > 0
        ? `${result.placed}명을 배정했어요. 칸이 모자라 ${result.unplaced}명은 비워 뒀어요. 저장해야 반영돼요.`
        : `${result.placed}명을 빈 칸에 배정했어요. 확인 후 저장해 주세요.`,
      { type: result.unplaced > 0 ? "info" : "success" },
    );
  };

  const save = async () => {
    setDialog(null);
    const notices = noticesOnSave(board, draft);
    const sent = notices.changed.length + notices.invited.length;
    return run(
      () => saveTimetableBoard(manageKey, draft.setting, assignmentsOf(board, draft)),
      sent > 0 ? `저장했어요. 배우 ${sent}명에게 안내 문자가 발송됩니다.` : "저장했어요.",
      false,
    );
  };

  const requestSave = () => {
    if (problems.length > 0) {
      toast("저장할 수 없는 배정이 있어요. 빨간 표시를 먼저 고쳐 주세요.", { type: "error" });
      return;
    }
    const notices = noticesOnSave(board, draft);
    if (notices.changed.length + notices.invited.length > 0) {
      setDialog("save");
      return;
    }
    void save();
  };

  const publish = async () => {
    setDialog(null);
    if (pendingChanges > 0 && !(await save())) return;
    await run(() => publishTimetable(manageKey), `일정을 확정했어요. 배우 ${board.actors.length}명에게 안내 문자가 발송됩니다.`, false);
  };

  const publishBlocker = board.actors.length === 0
    ? "배우를 한 명 이상 등록해 주세요."
    : unassignedCount > 0
      ? `시간이 정해지지 않은 배우가 ${unassignedCount}명 있어요.`
      : problems.length > 0 ? "저장할 수 없는 배정을 먼저 고쳐 주세요." : null;

  const register = (contacts: readonly ActorContact[]) => run(
    () => registerTimetableActors(manageKey, contacts),
    `${contacts.length}명을 등록했어요.${published ? " 시간을 배정해 저장하면 안내 문자가 발송됩니다." : ""}`,
    true,
  );

  const removingActor = dialog && typeof dialog === "object"
    ? board.actors.find((actor) => actor.id === dialog.removeActorId) ?? null
    : null;
  const saveNotices = noticesOnSave(board, draft);

  return (
    <Screen wide>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold ${published ? "bg-pass-bg text-pass" : "bg-pending-bg text-muted-strong"}`}>
              {published ? "확정됨" : "작성 중"}
            </span>
            {published && board.publishedAt ? <span className="text-xs text-muted">{formatInstant(board.publishedAt)} 확정 · 배우에게 안내 문자 발송</span> : null}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{board.title}</h1>
          <p className="mt-1 text-sm text-muted-strong">
            {board.organizerName}
            {board.location ? ` · ${board.location}` : ""}
            {` · ${draft.setting.slotMinutes}분 간격 · 칸당 ${draft.setting.slotCapacity}명`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
          <SecondaryButton onClick={() => setDialog("profile")} disabled={busy}>정보 수정</SecondaryButton>
          <SecondaryButton onClick={() => setDialog("setting")} disabled={busy}>시간대 설정</SecondaryButton>
          <SecondaryButton onClick={runAutoAssign} disabled={busy || unassignedCount === 0}>
            자동 배정{unassignedCount > 0 ? ` (${unassignedCount}명)` : ""}
          </SecondaryButton>
          {published ? (
            <SecondaryButton
              onClick={() => void run(
                () => changeSelfChangeLock(manageKey, !board.selfChangeLocked),
                board.selfChangeLocked ? "배우가 다시 직접 바꿀 수 있어요." : "이제 배우가 직접 바꿀 수 없어요.",
                true,
              )}
              disabled={busy}
              aria-pressed={board.selfChangeLocked}
            >
              {board.selfChangeLocked ? "배우 변경 다시 열기" : "배우 변경 막기"}
            </SecondaryButton>
          ) : (
            <PrimaryButton
              onClick={() => setDialog("publish")}
              disabled={busy || publishBlocker !== null}
              aria-describedby="timetable-publish-help"
            >
              {pendingChanges > 0 ? "저장하고 일정 확정" : "일정 확정"}
            </PrimaryButton>
          )}
        </div>
      </header>
      <p id="timetable-publish-help" className="mt-3 text-sm text-muted-strong">
        {published
          ? board.selfChangeLocked
            ? "배우 직접 변경을 막았어요. 시간 조정 요청은 계속 받을 수 있어요."
            : `배우는 시작 ${board.selfChangeNoticeHours}시간 전까지 시간대 안의 빈 칸으로 직접 옮길 수 있어요. 옮기면 보드에 ↻로 표시돼요.`
          : publishBlocker ?? "확정하면 모든 배우에게 합격·일정 확인 문자가 자동으로 발송돼요."}
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <ManageLinkCard manageKey={manageKey} organizerPhone={board.organizerPhone} justCreated={justCreated && board.actors.length === 0} />
          <RequestsPanel
            requests={board.requests}
            busy={busy}
            onFocusActor={setSelectedActorId}
            onResolve={(requestId) => void run(() => resolveTimetableRequest(manageKey, requestId), "요청을 처리 완료로 닫았어요.", true)}
          />
          <ActorPanel
            board={board}
            draft={draft}
            selectedActorId={selectedActorId}
            problemActorIds={problemActorIds}
            busy={busy}
            onRegister={register}
            onRemove={(actorId) => setDialog({ removeActorId: actorId })}
            onSelect={setSelectedActorId}
            onPlace={place}
          />
        </aside>

        <section aria-label="시간표" className="min-w-0 space-y-3">
          <div aria-live="polite" className="min-h-11 rounded-control border border-border bg-card px-4 py-2.5 text-sm">
            {selectedActor ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  <strong>{selectedActor.name}</strong> 선택됨 ·{" "}
                  {draft.slots[selectedActor.id] ? formatSlot(slotFromKey(draft.slots[selectedActor.id] as string)) : "미배정"}
                </span>
                <span className="text-muted">옮길 칸을 누르세요. Esc로 취소해요.</span>
                <TextButton onClick={() => setSelectedActorId(null)} className="ml-auto min-h-9 px-2">선택 취소</TextButton>
              </div>
            ) : (
              <span className="text-muted-strong">
                이름표를 끌어다 다른 칸에 놓거나, 눌러서 고른 뒤 옮길 칸을 누르세요. 1인 칸에 놓으면 두 배우의 시간이 바뀌어요.
                {board.actors.length > 0 ? ` 남은 자리 ${Math.max(0, capacityLeft)}명.` : ""}
              </span>
            )}
          </div>
          {problems.length > 0 ? (
            <ul role="alert" className="space-y-1 rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
              {problems.map((problem) => <li key={problem.key}>{problem.message}</li>)}
            </ul>
          ) : null}
          <ScheduleGrid
            board={board}
            draft={draft}
            selectedActorId={selectedActorId}
            problemActorIds={problemActorIds}
            onSelect={setSelectedActorId}
            onPlace={place}
            disabled={busy}
          />
          <ul aria-label="이름표 표시" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-strong">
            <li><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm border border-brand-line bg-brand-soft" />저장된 시간</li>
            <li><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm border border-dashed border-warn bg-warn-bg" />저장 전 이동</li>
            <li><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm border border-etc/40 bg-etc-bg" />↻ 배우가 직접 바꿈</li>
            <li><span aria-hidden="true" className="mr-1 inline-block size-2.5 rounded-sm border border-fail bg-fail-bg" />저장 불가</li>
          </ul>
        </section>
      </div>

      {pendingChanges > 0 ? (
        <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-border bg-card/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold" aria-live="polite">
              저장하지 않은 변경 <span className="num text-warn">{pendingChanges}</span>건
              {problems.length > 0 ? <span className="ml-2 font-normal text-fail">· 고칠 배정 {problems.length}건</span> : null}
            </p>
            <div className="ml-auto flex gap-2">
              <SecondaryButton onClick={() => setDraft((base) => draftFrom(base))} disabled={busy}>되돌리기</SecondaryButton>
              <DarkButton onClick={requestSave} disabled={busy || problems.length > 0}>{busy ? "저장 중…" : "저장"}</DarkButton>
            </div>
          </div>
        </div>
      ) : null}

      {dialog === "setting" ? (
        <SettingDialog
          setting={draft.setting}
          published={published}
          onClose={() => setDialog(null)}
          onApply={(setting) => {
            const result = changeSetting(board, draft, setting);
            setDraft(() => result.draft);
            setDialog(null);
            toast(
              result.released > 0
                ? `시간대를 바꿨어요. 새 시간대에 맞지 않는 ${result.released}명은 미배정으로 돌렸어요. 저장해야 반영돼요.`
                : "시간대를 바꿨어요. 저장해야 반영돼요.",
              { type: "info" },
            );
          }}
        />
      ) : null}
      {dialog === "profile" ? (
        <ProfileDialog
          profile={profileOf(board)}
          onClose={() => setDialog(null)}
          onSave={(profile) => run(() => updateTimetableProfile(manageKey, profile), "일정표 정보를 저장했어요.", true)}
        />
      ) : null}
      {dialog === "publish" ? (
        <ConfirmDialog
          title="일정을 확정할까요?"
          confirmLabel="확정하고 안내 보내기"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void publish()}
          description={(
            <div className="space-y-3">
              <p>배우 <strong className="num">{board.actors.length}</strong>명에게 아래 문자가 자동으로 발송돼요.</p>
              <p className="rounded-control bg-surface px-3 py-2 text-sm text-foreground">
                안녕하세요 예술인입니다. {board.organizerName} 오디션 합격입니다. 해당 링크에서 일정을 확인하세요.
              </p>
              <p className="text-sm">확정 뒤에도 시간을 옮길 수 있고, 옮긴 배우에게는 변경 안내가 가요. 배우는 시간대 안의 빈 칸으로 직접 옮길 수 있어요.</p>
            </div>
          )}
        />
      ) : null}
      {dialog === "save" ? (
        <ConfirmDialog
          title="저장하고 안내 문자를 보낼까요?"
          confirmLabel="저장"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void save()}
          description={(
            <ul className="list-disc space-y-1 pl-5">
              {saveNotices.changed.length > 0 ? <li>일정 변경 안내: {saveNotices.changed.join(", ")}</li> : null}
              {saveNotices.invited.length > 0 ? <li>합격·일정 안내: {saveNotices.invited.join(", ")}</li> : null}
            </ul>
          )}
        />
      ) : null}
      {removingActor ? (
        <ConfirmDialog
          title={`${removingActor.name} 배우를 명단에서 뺄까요?`}
          confirmLabel="명단에서 빼기"
          destructive
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void run(
            () => removeTimetableActor(manageKey, removingActor.id),
            `${removingActor.name} 배우를 뺐어요.`,
            true,
          ).then(() => setDialog(null))}
          description={removingActor.invited
            ? "배우의 개인 링크가 더 이상 열리지 않아요. 이미 보낸 문자는 취소되지 않으니 필요하면 배우에게 따로 알려 주세요."
            : "등록 정보와 아직 보내지 않은 문자가 함께 지워져요."}
        />
      ) : null}
    </Screen>
  );
}

function profileOf(board: TimetableBoard): TimetableProfile {
  return {
    title: board.title,
    organizerName: board.organizerName,
    organizerPhone: board.organizerPhone,
    location: board.location,
    guide: board.guide,
  };
}

function Screen({ children, wide = false }: { readonly children: React.ReactNode; readonly wide?: boolean }) {
  return (
    <main className="min-h-dvh break-keep bg-surface text-foreground wrap-break-word">
      <TimetableHeader width={wide ? "wide" : "regular"} />
      <div className={`mx-auto px-4 pb-10 pt-6 md:px-8 ${wide ? "max-w-[1600px]" : "max-w-[720px]"}`}>{children}</div>
    </main>
  );
}
