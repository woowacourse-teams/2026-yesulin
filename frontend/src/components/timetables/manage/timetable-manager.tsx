"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { DarkButton, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
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
  draftFrom,
  isAdditional,
  moveActor,
  noticesOnSave,
  occupancy,
  problemsOf,
  rebaseDraft,
  type BoardDraft,
} from "@/features/timetables/board-draft";
import { formatShortDate, slotFromKey, slotKey } from "@/features/timetables/time";
import {
  TIMETABLE_KEY_PATTERN,
  TIMETABLE_LIMITS,
  type ActorContact,
  type TimetableActor,
  type TimetableBoard,
  type TimetableProfile,
} from "@/features/timetables/types";
import { TimetableHeader } from "../timetable-header";
import { ActorDialog } from "./actor-dialog";
import type { ChipState } from "./actor-chip";
import { AssignDialog } from "./assign-dialog";
import { copyManageLink, ManageLinkNotice } from "./manage-link-card";
import { MoreMenu } from "./more-menu";
import { ProfileDialog } from "./profile-dialog";
import { RegisterActorsForm } from "./register-actors-form";
import { RegisterDialog } from "./register-dialog";
import { RequestsDialog } from "./requests-dialog";
import { RosterPanel } from "./roster-panel";
import { ScheduleSheet } from "./schedule-sheet";
import { SettingDialog } from "./setting-dialog";
import { StatusSteps } from "./status-steps";

type LoadState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string; readonly notFound: boolean }
  | { readonly status: "ready"; readonly board: TimetableBoard; readonly draft: BoardDraft };

type Dialog =
  | "setting"
  | "profile"
  | "publish"
  | "save"
  | "register"
  | "requests"
  | { readonly assignKey: string }
  | { readonly actorId: number }
  | { readonly removeActorId: number }
  | null;

const errorMessage = (cause: unknown, fallback: string) => (cause instanceof AuditionRequestError ? cause.message : fallback);

/**
 * 기획사가 관리 링크로 여는 일정표 보드. 위에서 지금 할 일을 단계로 보여 주고, 왼쪽 명단과 오른쪽 타임테이블에서
 * 빈 칸 누르기·이름 누르기·끌어다 놓기로 배정한다. 배정은 편집본에서 고친 뒤 한 번에 저장하고,
 * 배우 등록·삭제·확정·정보 수정은 바로 저장한다. 확정 뒤에는 저장할 때 바뀐 배우에게만 문자가 간다.
 */
export function TimetableManager({ manageKey }: { readonly manageKey: string }) {
  const toast = useToast();
  const justCreated = useSearchParams().get("created") === "1";
  const validKey = TIMETABLE_KEY_PATTERN.test(manageKey);
  const [state, setState] = useState<LoadState>(() => (validKey
    ? { status: "loading" }
    : { status: "error", message: "관리 링크가 올바르지 않아요. 문자로 받은 링크를 다시 확인해 주세요.", notFound: true }));
  const [movingActorId, setMovingActorId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [linkNoticeOpen, setLinkNoticeOpen] = useState(justCreated);

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
    if (movingActorId === null) return;
    const cancel = (event: KeyboardEvent) => { if (event.key === "Escape") setMovingActorId(null); };
    window.addEventListener("keydown", cancel);
    return () => window.removeEventListener("keydown", cancel);
  }, [movingActorId]);

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
  const additionalCount = board.actors.filter((actor) => isAdditional(board, actor)).length;
  const movingActor = board.actors.find((actor) => actor.id === movingActorId) ?? null;
  const serverKeys = new Map(board.actors.map((actor) => [actor.id, actor.slot ? slotKey(actor.slot) : null]));

  const chipState = (actor: TimetableActor): ChipState => {
    const key = draft.slots[actor.id] ?? null;
    const unsaved = serverKeys.get(actor.id) !== key;
    return {
      additional: isAdditional(board, actor),
      unsaved,
      problem: problemActorIds.has(actor.id),
      changedByActor: actor.actorChangedAt !== null && !unsaved,
      moving: movingActorId === actor.id,
    };
  };

  const run = async (action: () => Promise<TimetableBoard>, success: string, keepDraft: boolean) => {
    setBusy(true);
    try {
      const next = await action();
      setState((current) => (current.status !== "ready" ? current : {
        status: "ready",
        board: next,
        draft: keepDraft ? rebaseDraft(current.board, next, current.draft) : draftFrom(next),
      }));
      toast(success, { type: "success" });
      return true;
    } catch (cause) {
      toast(errorMessage(cause, "요청을 처리하지 못했어요. 다시 시도해 주세요."), { type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** 칸에 배우를 넣는다. 정원 1명 칸이 차 있으면 두 배우의 시간을 맞바꾼다. */
  const place = (actorId: number, key: string | null) => {
    setMovingActorId(null);
    const current = draft.slots[actorId] ?? null;
    if (current === key) return;
    if (key) {
      const others = (occupancy(board, draft).get(key) ?? []).filter((id) => id !== actorId);
      if (others.length >= draft.setting.slotCapacity) {
        if (draft.setting.slotCapacity !== 1) {
          toast(`이 칸은 ${draft.setting.slotCapacity}명이 다 찼어요.`, { type: "error" });
          return;
        }
        setDraft((_, base) => moveActor(moveActor(base, others[0], current), actorId, key));
        return;
      }
    }
    if (!key && published && board.actors.find((actor) => actor.id === actorId)?.invited) {
      toast("안내를 받은 배우는 미배정으로 둘 수 없어요. 다른 시간으로 옮겨 주세요.", { type: "error" });
      return;
    }
    setDraft((_, base) => moveActor(base, actorId, key));
  };

  const startMoving = (actorId: number) => {
    setDialog(null);
    setMovingActorId(actorId);
  };

  const runAutoAssign = () => {
    const result = autoAssign(board, draft);
    setDraft(() => result.draft);
    toast(
      result.placed === 0
        ? "남은 빈 칸이 없어요. 시간을 늘려 주세요."
        : result.unplaced > 0
          ? `${result.placed}명을 배정했어요. 칸이 모자라 ${result.unplaced}명은 남겨 뒀어요.`
          : `${result.placed}명을 빈 칸에 배정했어요.`,
      { type: result.placed === 0 ? "error" : "success" },
    );
  };

  /** 등록은 바로 저장하고, 방금 등록한 배우만 빈 칸에 미리 배정한다(저장 전). 기존 배우는 그대로 둔다. */
  const register = async (contacts: readonly ActorContact[]) => {
    setBusy(true);
    try {
      const next = await registerTimetableActors(manageKey, contacts);
      const known = new Set(board.actors.map((actor) => actor.id));
      const added = next.actors.filter((actor) => !known.has(actor.id)).map((actor) => actor.id);
      const result = autoAssign(next, rebaseDraft(board, next, draft), added);
      setState({ status: "ready", board: next, draft: result.draft });
      toast(
        result.unplaced > 0
          ? `${contacts.length}명을 등록했어요. 칸이 모자라 ${result.unplaced}명은 미배정이에요.`
          : `${contacts.length}명을 등록하고 빈 칸에 넣었어요. 확인 후 저장해 주세요.`,
        { type: result.unplaced > 0 ? "info" : "success" },
      );
      return true;
    } catch (cause) {
      toast(errorMessage(cause, "배우를 등록하지 못했어요. 다시 시도해 주세요."), { type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setDialog(null);
    const notices = noticesOnSave(board, draft);
    const sent = notices.changed.length + notices.invited.length;
    return run(
      () => saveTimetableBoard(manageKey, draft.setting, assignmentsOf(board, draft)),
      sent > 0 ? `저장했어요. 배우 ${sent}명에게 문자가 발송됩니다.` : "저장했어요.",
      false,
    );
  };

  const requestSave = () => {
    if (problems.length > 0) {
      toast(problems[0].message, { type: "error" });
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
    await run(() => publishTimetable(manageKey), `일정을 확정했어요. 배우 ${board.actors.length}명에게 문자가 발송됩니다.`, false);
  };

  const canPublish = board.actors.length > 0 && unassignedCount === 0 && problems.length === 0;
  const saveNotices = noticesOnSave(board, draft);
  const activeActor = dialog && typeof dialog === "object" && "actorId" in dialog
    ? board.actors.find((actor) => actor.id === dialog.actorId) ?? null
    : null;
  const removingActor = dialog && typeof dialog === "object" && "removeActorId" in dialog
    ? board.actors.find((actor) => actor.id === dialog.removeActorId) ?? null
    : null;
  const assignKey = dialog && typeof dialog === "object" && "assignKey" in dialog ? dialog.assignKey : null;

  const menuItems = [
    { label: "정보 수정", onSelect: () => setDialog("profile") },
    { label: "시간 늘리기", onSelect: () => setDialog("setting") },
    {
      label: "관리 링크 복사",
      onSelect: () => void copyManageLink(manageKey).then(
        () => toast("관리 링크를 복사했어요.", { type: "success" }),
        () => toast("주소창에서 복사해 주세요.", { type: "error" }),
      ),
    },
    ...(published
      ? [{
        label: board.selfChangeLocked ? "배우 직접 변경 열기" : "배우 직접 변경 막기",
        onSelect: () => void run(
          () => changeSelfChangeLock(manageKey, !board.selfChangeLocked),
          board.selfChangeLocked ? "배우가 다시 직접 바꿀 수 있어요." : "이제 배우가 직접 바꿀 수 없어요.",
          true,
        ),
      }]
      : []),
  ];

  return (
    <Screen wide>
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-[-0.025em]">{board.title}</h1>
          <p className="mt-0.5 truncate text-sm text-muted">
            {board.organizerName} · {draft.setting.slotMinutes}분씩 · 한 칸 {draft.setting.slotCapacity}명
          </p>
        </div>
        <MoreMenu items={menuItems} />
        {published ? null : (
          <PrimaryButton onClick={() => setDialog("publish")} disabled={busy || !canPublish} className="shrink-0">
            일정 확정
          </PrimaryButton>
        )}
      </header>

      <div className="mt-4 space-y-3">
        <StatusSteps
          board={board}
          unassignedCount={unassignedCount}
          additionalCount={additionalCount}
          onOpenRequests={() => setDialog("requests")}
        />
        {linkNoticeOpen ? <ManageLinkNotice manageKey={manageKey} onDismiss={() => setLinkNoticeOpen(false)} /> : null}
      </div>

      {board.actors.length === 0 ? (
        <section aria-labelledby="first-actors-heading" className="mx-auto mt-6 max-w-[640px] rounded-card border border-brand-line bg-card px-5 py-6 md:px-6">
          <h2 id="first-actors-heading" className="text-lg font-bold">합격자 등록</h2>
          <div className="mt-4">
            <RegisterActorsForm busy={busy} remaining={TIMETABLE_LIMITS.maxActors} defaultMode="bulk" bulkRows={8} onRegister={register} />
          </div>
        </section>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start">
          {/* 모바일은 시간표를 먼저 보여 주고 명단을 아래에 둔다. */}
          <div className="order-2 lg:sticky lg:top-20 lg:order-1">
            <RosterPanel
              board={board}
              draft={draft}
              chipState={chipState}
              busy={busy}
              onAdd={() => setDialog("register")}
              onAutoAssign={runAutoAssign}
              onActorClick={(actorId) => setDialog({ actorId })}
              onUnassign={(actorId) => place(actorId, null)}
            />
          </div>

          <section aria-label="타임테이블" className="order-1 min-w-0 space-y-3 lg:order-2">
            {movingActor ? (
              <div role="status" className="sticky top-16 z-20 flex items-center gap-3 rounded-control bg-foreground px-4 py-3 text-sm text-white shadow-[var(--shadow-2)]">
                <span className="min-w-0 flex-1"><strong>{movingActor.name}</strong> 님을 넣을 칸을 누르세요</span>
                <button type="button" onClick={() => setMovingActorId(null)} className="min-h-9 shrink-0 rounded-control px-3 font-semibold text-white/80 hover:bg-white/10 hover:text-white">
                  취소
                </button>
              </div>
            ) : (
              <ul aria-label="이름표 색" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-strong">
                <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-sm bg-brand" />최초 합격</li>
                {additionalCount > 0 ? <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-sm bg-etc" />추가 합격</li> : null}
                <li className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-3 rounded-sm border border-dashed border-warn" />저장 전</li>
                {published ? <li className="inline-flex items-center gap-1.5"><span aria-hidden="true">↻</span>배우가 바꿈</li> : null}

              </ul>
            )}
            <ScheduleSheet
              board={board}
              draft={draft}
              chipState={chipState}
              movingActorId={movingActorId}
              disabled={busy}
              onEmptySlot={(key) => setDialog({ assignKey: key })}
              onActorClick={(actorId) => setDialog({ actorId })}
              onPlace={place}
            />
          </section>
        </div>
      )}

      {pendingChanges > 0 ? (
        <div className="sticky bottom-0 z-30 -mx-4 mt-6 border-t border-border bg-card/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold" aria-live="polite">
              저장 전 변경 <span className="num text-warn">{pendingChanges}</span>건
            </p>
            <div className="ml-auto flex gap-2">
              <SecondaryButton onClick={() => setDraft((base) => draftFrom(base))} disabled={busy}>되돌리기</SecondaryButton>
              <DarkButton onClick={requestSave} disabled={busy}>{busy ? "저장 중…" : "저장"}</DarkButton>
            </div>
          </div>
        </div>
      ) : null}

      {assignKey ? (
        <AssignDialog
          slotLabel={`${formatShortDate(slotFromKey(assignKey).date)} ${slotFromKey(assignKey).startTime}`}
          board={board}
          draft={draft}
          chipState={chipState}
          onClose={() => setDialog(null)}
          onPick={(actorId) => {
            setDialog(null);
            place(actorId, assignKey);
          }}
        />
      ) : null}
      {activeActor ? (
        <ActorDialog
          actor={activeActor}
          state={chipState(activeActor)}
          slot={draft.slots[activeActor.id] ? slotFromKey(draft.slots[activeActor.id] as string) : null}
          canUnassign={!(published && activeActor.invited)}
          onClose={() => setDialog(null)}
          onMove={() => startMoving(activeActor.id)}
          onUnassign={() => {
            setDialog(null);
            place(activeActor.id, null);
          }}
          onRemove={() => setDialog({ removeActorId: activeActor.id })}
        />
      ) : null}
      {dialog === "register" ? (
        <RegisterDialog actorCount={board.actors.length} busy={busy} onRegister={register} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "requests" ? (
        <RequestsDialog
          requests={board.requests}
          busy={busy}
          onClose={() => setDialog(null)}
          onMove={startMoving}
          onResolve={(requestId) => void run(() => resolveTimetableRequest(manageKey, requestId), "요청을 처리 완료로 닫았어요.", true)}
        />
      ) : null}
      {dialog === "setting" ? (
        <SettingDialog
          setting={draft.setting}
          saved={draftFrom(board).setting}
          onClose={() => setDialog(null)}
          onApply={(setting) => {
            setDraft((_, base) => ({ ...base, setting }));
            setDialog(null);
            toast("시간을 늘렸어요. 저장해야 반영돼요.", { type: "info" });
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
          confirmLabel="확정하고 문자 보내기"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void publish()}
          description={(
            <div className="space-y-3">
              <p>배우 <strong className="num">{board.actors.length}</strong>명에게 이 문자가 발송돼요.</p>
              <p className="rounded-control bg-surface px-3 py-2 text-sm text-foreground">
                안녕하세요 예술인입니다. {board.organizerName} 오디션 합격입니다. 해당 링크에서 일정을 확인하세요.
              </p>
            </div>
          )}
        />
      ) : null}
      {dialog === "save" ? (
        <ConfirmDialog
          title="저장하고 문자를 보낼까요?"
          confirmLabel="저장"
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void save()}
          description={(
            <ul className="list-disc space-y-1 pl-5">
              {saveNotices.invited.length > 0 ? <li>합격 안내: {saveNotices.invited.join(", ")}</li> : null}
              {saveNotices.changed.length > 0 ? <li>일정 변경 안내: {saveNotices.changed.join(", ")}</li> : null}
            </ul>
          )}
        />
      ) : null}
      {removingActor ? (
        <ConfirmDialog
          title={`${removingActor.name} 님을 명단에서 삭제할까요?`}
          confirmLabel="삭제"
          destructive
          busy={busy}
          onClose={() => setDialog(null)}
          onConfirm={() => void run(
            () => removeTimetableActor(manageKey, removingActor.id),
            `${removingActor.name} 님을 삭제했어요.`,
            true,
          ).then(() => setDialog(null))}
          description={removingActor.invited ? "이미 보낸 문자는 취소되지 않아요. 배우의 일정 링크는 더 이상 열리지 않아요." : "아직 보내지 않은 문자도 함께 지워져요."}
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
