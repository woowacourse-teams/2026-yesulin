"use client";

import { Fragment, useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PickerScreen } from "@/components/auditions/picker-card";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FieldInput, PrimaryButton, SecondaryButton, SecondaryLink, TextButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import {
  formatShowDate,
  formatShowTime,
  fromKstDateTimeInput,
  toKstDateTimeInput,
} from "@/features/shows/format";
import type { ShowManagementApi } from "@/features/shows/management-api";
import { showRoutes, type ProducerShow, type ProducerShowSession, type SaveShow, type SaveShowSession } from "@/features/shows/types";
import { ManagementGenreBadge, ManagementStatusBadge } from "../show-status";
import { ConfirmDialog } from "./confirm-dialog";
import { CopyShowLinkButton } from "./copy-show-link-button";
import { SessionReservations } from "./session-reservations";
import { ShowFormModal } from "./show-form-modal";
import { useShowManagementApi } from "./show-management-api-context";

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly show: ProducerShow };

type PendingAction = "close" | "delete" | null;

/**
 * 공연 한 건의 회차·공개·예매자를 관리한다. 운영 대시보드도 운영자 API로 감싸 외부 링크 공연 관리에 같은 화면을 쓴다.
 * 외부 링크 공연은 예술in 예매가 없으므로 예매자 명단 대신 외부 예매 주소를 보여 준다.
 */
export function ProducerShowDetail({ showId }: { readonly showId: string }) {
  const api = useShowManagementApi();
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<DetailState>({ status: "loading" });
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  // 회차 시작 여부를 판단한 시각. 공개하기를 누를 때 다시 잰다.
  const [checkedAt, setCheckedAt] = useState(() => Date.now());

  /** 예매 취소처럼 다른 패널이 바꾼 매수를 다시 읽는다. */
  const refresh = useCallback(() => {
    api.getShow(showId)
      .then((show) => setState({ status: "ready", show }))
      .catch((cause) => console.error("[무료 공연 다시 조회 실패]", cause));
  }, [api, showId]);

  useEffect(() => {
    let active = true;
    api.getShow(showId)
      .then((show) => { if (active) setState({ status: "ready", show }); })
      .catch((cause) => {
        console.error("[무료 공연 조회 실패]", cause);
        if (active) setState({ status: "error", message: cause instanceof Error ? cause.message : "공연을 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, [api, showId]);

  const run = async (action: () => Promise<ProducerShow>, success: string) => {
    setBusy(true);
    try {
      setState({ status: "ready", show: await action() });
      toast(success, { type: "success" });
      return true;
    } catch (cause) {
      toast(cause instanceof AuditionRequestError ? cause.message : "요청을 처리하지 못했습니다. 다시 시도해 주세요.", { type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // 운영 대시보드는 자체 틀(AdminShell)이 여백을 주므로 기획사 화면의 바깥 여백을 쓰지 않는다.
  const Screen = api.kind === "admin" ? Fragment : PickerScreen;
  if (state.status === "loading") {
    return <Screen><p role="status" className="mx-auto max-w-[1120px] rounded-card border border-border bg-card px-5 py-14 text-center text-muted">공연을 불러오는 중…</p></Screen>;
  }
  if (state.status === "error") {
    return <Screen><div className="mx-auto max-w-[1120px] break-keep wrap-break-word"><BackLink api={api} /><ScreenError message={state.message} /></div></Screen>;
  }

  const { show } = state;
  const external = show.externalReservationUrl !== "";
  // 서버는 시작 전 회차가 하나 이상 있어야 공개를 허용한다.
  const openable = hasUpcomingSession(show, checkedAt);
  // 따로 고르지 않았으면 앞으로 열릴 첫 회차의 예매자를 보여 준다.
  const selectedSession = show.sessions.find((session) => session.id === selectedSessionId)
    ?? show.sessions.find((session) => Date.parse(session.startsAt) > checkedAt)
    ?? show.sessions.at(-1)
    ?? null;

  /** 화면을 오래 열어 둔 사이 마지막 회차가 시작됐을 수 있어 누르는 시각으로 다시 확인한다. */
  const publish = () => {
    const now = Date.now();
    setCheckedAt(now);
    if (!hasUpcomingSession(show, now)) return;
    void run(() => api.openShow(show.id), "공연을 공개했어요. 이제 관객이 예매할 수 있어요.");
  };

  const removeShow = async () => {
    setBusy(true);
    try {
      await api.deleteShow(show.id);
      toast("공연을 삭제했어요.", { type: "success" });
      router.push(api.listHref);
    } catch (cause) {
      toast(cause instanceof AuditionRequestError ? cause.message : "공연을 삭제하지 못했습니다.", { type: "error" });
      setBusy(false);
      setPendingAction(null);
    }
  };

  return (
    <Screen>
      <div className="mx-auto w-full max-w-[1120px] break-keep wrap-break-word">
        <BackLink api={api} />
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ManagementStatusBadge status={show.status} />
              <ManagementGenreBadge genre={show.genre} />
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{show.title}</h1>
            <p id="show-status-guide" className="mt-2 text-sm text-muted-strong">{statusGuide(show, openable)}</p>
            {show.status !== "DRAFT" ? <CopyShowLinkButton showId={show.id} variant="inline" /> : null}
          </div>
          {/* 모바일에서 버튼이 한 줄에 안 들어가면 남은 폭을 채워 한 개만 덩그러니 내려가 보이지 않게 한다. */}
          <div className="flex flex-wrap gap-2 [&>*]:grow sm:[&>*]:grow-0">
            {show.status !== "DRAFT" ? (
              <SecondaryLink href={showRoutes.detail(show.id)} target="_blank">예매 페이지 보기</SecondaryLink>
            ) : null}
            {show.status === "OPEN" ? (
              <SecondaryButton onClick={() => setPendingAction("close")} disabled={busy}>예매 마감</SecondaryButton>
            ) : (
              <PrimaryButton
                onClick={publish}
                disabled={busy || !openable}
                aria-describedby={openable ? undefined : "show-status-guide"}
              >
                {show.status === "DRAFT" ? "공개하기" : "다시 공개"}
              </PrimaryButton>
            )}
            <SecondaryButton onClick={() => setEditing(true)} disabled={busy}>정보 수정</SecondaryButton>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <SessionManager
              show={show}
              selectedSessionId={selectedSession?.id ?? null}
              onSelect={setSelectedSessionId}
              onRun={run}
              busy={busy}
            />
            {external ? <ExternalReservationNotice url={show.externalReservationUrl} visits={show.externalReservationVisits} />
              : selectedSession ? <SessionReservations key={selectedSession.id} showId={show.id} showTitle={show.title} session={selectedSession} onChanged={refresh} /> : null}
          </div>
          <ShowSummary
            show={show}
            onDelete={() => setPendingAction("delete")}
            onToggleRemainingSeats={() => void run(
              () => api.updateShow(show.id, showInputWithRemainingSeats(show, !show.remainingSeatsVisible)),
              show.remainingSeatsVisible ? "관객에게 잔여석을 숨겼어요." : "관객에게 잔여석을 공개했어요.",
            )}
            busy={busy}
          />
        </div>
      </div>

      {editing ? (
        <ShowFormModal
          show={show}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setEditing(false);
            setState({ status: "ready", show: saved });
            toast("공연 정보를 수정했어요.", { type: "success" });
          }}
        />
      ) : null}
      {pendingAction === "close" ? (
        <ConfirmDialog
          title="예매를 마감할까요?"
          confirmLabel="예매 마감"
          busy={busy}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void run(() => api.closeShow(show.id), "예매를 마감했어요.").then(() => setPendingAction(null))}
          description={external
            ? "관객 목록에서 공연이 빠지고 공연 페이지의 예매하기 버튼이 닫혀요. 외부 예매 페이지는 그 서비스에서 따로 마감해 주세요. 언제든 다시 공개할 수 있어요."
            : "관객 목록에서 공연이 빠지고 새 예매를 받지 않아요. 이미 받은 예매와 공연 페이지 링크는 그대로 유지되고, 언제든 다시 공개할 수 있어요."}
        />
      ) : null}
      {pendingAction === "delete" ? (
        <ConfirmDialog
          title="공연을 삭제할까요?"
          destructive
          confirmLabel="공연 삭제"
          busy={busy}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void removeShow()}
          description="공연 정보와 회차가 모두 삭제되고 되돌릴 수 없어요."
        />
      ) : null}
    </Screen>
  );
}

function BackLink({ api }: { readonly api: ShowManagementApi }) {
  return (
    <Link href={api.listHref} className="mb-4 inline-flex min-h-11 items-center rounded-control text-sm font-semibold text-muted-strong hover:text-brand">
      ← {api.listLabel}
    </Link>
  );
}

function hasUpcomingSession(show: ProducerShow, now: number) {
  return show.sessions.some((session) => Date.parse(session.startsAt) > now);
}

function statusGuide(show: ProducerShow, openable: boolean) {
  if (show.status === "OPEN") {
    return show.externalReservationUrl ? "관객이 공연 페이지에서 외부 예매 페이지로 이동해 예매하고 있어요." : "관객이 공연 페이지에서 예매하고 있어요.";
  }
  if (!openable) {
    const prefix = show.status === "CLOSED" ? "예매를 마감했어요. " : "";
    return `${prefix}${show.sessions.length ? "시작 전인 회차가 있어야 공개할 수 있어요. 회차를 추가해 주세요." : "회차를 추가한 뒤 공개해 주세요."}`;
  }
  if (show.status === "CLOSED") return "예매를 마감했어요. 다시 공개하면 남은 회차를 예매할 수 있어요.";
  return "공개하기를 누르면 관객이 예매할 수 있어요.";
}

type RunAction = (action: () => Promise<ProducerShow>, success: string) => Promise<boolean>;

const SESSION_RULES_ID = "session-manager-rules";

function SessionManager({ show, selectedSessionId, onSelect, onRun, busy }: {
  readonly show: ProducerShow;
  readonly selectedSessionId: number | null;
  readonly onSelect: (sessionId: number) => void;
  readonly onRun: RunAction;
  readonly busy: boolean;
}) {
  const api = useShowManagementApi();
  const external = show.externalReservationUrl !== "";
  const [editingId, setEditingId] = useState<number | "new" | null>(show.sessions.length ? null : "new");
  // 지난 회차 표시에만 쓰므로 화면을 연 시각 기준이면 충분하다.
  const [now] = useState(() => Date.now());
  const [deleteTarget, setDeleteTarget] = useState<ProducerShowSession | null>(null);

  return (
    <section aria-labelledby="session-manager-title" className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border-soft px-5 py-4">
        <h2 id="session-manager-title" className="text-base font-bold">회차</h2>
        {editingId !== "new" ? <SecondaryButton onClick={() => setEditingId("new")} disabled={busy}>회차 추가</SecondaryButton> : null}
      </div>
      {external ? (
        <p className="border-b border-border-soft px-5 py-3 text-xs leading-5 text-muted">
          외부 링크로 예매받는 공연이라 정원 없이 회차 일정만 관객에게 보여요.
        </p>
      ) : null}
      <ul className="divide-y divide-border-soft">
        {show.sessions.map((session) => editingId === session.id ? (
          <li key={session.id} className="px-5 py-4">
            <SessionForm
              initial={session}
              external={external}
              busy={busy}
              onCancel={() => setEditingId(null)}
              onSubmit={async (input) => {
                const saved = await onRun(() => api.updateSession(show.id, session.id, input), "회차를 수정했어요.");
                if (saved) setEditingId(null);
                return saved;
              }}
            />
          </li>
        ) : (
          <SessionRow
            key={session.id}
            session={session}
            external={external}
            now={now}
            selected={session.id === selectedSessionId}
            busy={busy}
            onSelect={() => onSelect(session.id)}
            onEdit={() => setEditingId(session.id)}
            onDelete={() => setDeleteTarget(session)}
          />
        ))}
        {editingId === "new" ? (
          <li className="px-5 py-4">
            {/* 여러 회차를 연달아 넣을 수 있게 추가한 뒤에도 폼을 열어 두고 정원은 그대로 둔다. */}
            <SessionForm
              external={external}
              busy={busy}
              onCancel={show.sessions.length ? () => setEditingId(null) : undefined}
              onSubmit={(input) => onRun(() => api.createSession(show.id, input), "회차를 추가했어요. 다음 회차를 이어서 입력할 수 있어요.")}
            />
          </li>
        ) : null}
      </ul>
      {show.sessions.some((session) => session.hasReservations || Date.parse(session.startsAt) <= now) ? (
        <p id={SESSION_RULES_ID} className="border-t border-border-soft px-5 py-3 text-xs leading-5 text-muted">
          예매가 있는 회차는 삭제할 수 없고, 지난 회차는 수정할 수 없어요.
        </p>
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title="회차를 삭제할까요?"
          destructive
          confirmLabel="회차 삭제"
          busy={busy}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void onRun(() => api.deleteSession(show.id, deleteTarget.id), "회차를 삭제했어요.").then(() => setDeleteTarget(null))}
          description={<span className="num">{formatShowDate(deleteTarget.startsAt)} {formatShowTime(deleteTarget.startsAt)} 회차를 삭제합니다.</span>}
        />
      ) : null}
    </section>
  );
}

function SessionRow({ session, external, now, selected, busy, onSelect, onEdit, onDelete }: {
  readonly session: ProducerShowSession;
  /** 외부 링크 공연은 예술in 예매와 정원이 없다. */
  readonly external: boolean;
  readonly now: number;
  readonly selected: boolean;
  readonly busy: boolean;
  readonly onSelect: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  const remaining = Math.max(0, session.capacity - session.reservedTickets);
  const past = Date.parse(session.startsAt) <= now;
  return (
    <li className={`flex flex-wrap items-center gap-3 px-5 py-4 ${selected ? "bg-brand-soft" : ""}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="min-h-11 min-w-0 flex-1 rounded-control text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <span className={`num flex flex-wrap gap-x-2 text-base font-bold ${past ? "text-muted" : ""}`}>
          <span className="whitespace-nowrap">{formatShowDate(session.startsAt)} {formatShowTime(session.startsAt)}</span>
          {past ? <span className="whitespace-nowrap text-sm font-semibold">지난 회차</span> : null}
        </span>
        {external ? (
          <span className="mt-0.5 block text-sm text-muted-strong">외부 링크로 예매</span>
        ) : (
          <span className="num mt-0.5 flex flex-wrap gap-x-2 text-sm text-muted-strong">
            <span className="whitespace-nowrap">예매 {session.reservedTickets} / 정원 {session.capacity}석</span>
            <span className="whitespace-nowrap">{remaining ? `잔여 ${remaining}석` : "매진"}</span>
          </span>
        )}
      </button>
      {/* 규칙으로 막힌 버튼은 disabled 대신 aria-disabled로 두어 키보드로도 이유(안내 문구)를 들을 수 있게 한다. */}
      <div className="flex gap-1">
        <RuleGuardedButton blocked={past} busy={busy} onClick={onEdit}>수정</RuleGuardedButton>
        <RuleGuardedButton blocked={session.hasReservations} busy={busy} onClick={onDelete}>삭제</RuleGuardedButton>
      </div>
    </li>
  );
}

function RuleGuardedButton({ blocked, busy, onClick, children }: {
  readonly blocked: boolean;
  readonly busy: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <TextButton
      onClick={blocked ? undefined : onClick}
      disabled={busy}
      aria-disabled={blocked || undefined}
      aria-describedby={blocked ? SESSION_RULES_ID : undefined}
      className="aria-disabled:cursor-not-allowed aria-disabled:text-muted-soft aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-soft aria-disabled:active:translate-y-0 aria-disabled:active:scale-100 aria-disabled:active:bg-transparent"
    >
      {children}
    </TextButton>
  );
}

/** 외부 링크 공연은 정원 없이 시작 일시만 받는다. */
function SessionForm({ initial, external, busy, onSubmit, onCancel }: {
  readonly initial?: ProducerShowSession;
  readonly external: boolean;
  readonly busy: boolean;
  readonly onSubmit: (input: SaveShowSession) => Promise<boolean>;
  readonly onCancel?: () => void;
}) {
  const [startsAt, setStartsAt] = useState(initial ? toKstDateTimeInput(initial.startsAt) : "");
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : "");
  const [error, setError] = useState("");
  const startsAtId = useId();
  const minCapacity = Math.max(1, initial?.reservedTickets ?? 1);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const iso = fromKstDateTimeInput(startsAt);
    const count = Number(capacity);
    if (!iso) return setError("공연 날짜와 시작 시각을 입력해 주세요.");
    if (Date.parse(iso) <= Date.now()) return setError("회차 시작 시각은 지금 이후로 입력해 주세요.");
    if (!external && (!Number.isInteger(count) || count < minCapacity)) {
      return setError(initial?.reservedTickets ? `정원은 이미 예매된 ${initial.reservedTickets}석 이상이어야 해요.` : "정원을 1명 이상 입력해 주세요.");
    }
    setError("");
    const submitted = startsAt;
    void onSubmit(external ? { startsAt: iso } : { startsAt: iso, capacity: count }).then((saved) => {
      if (!saved || initial) return;
      // 요청이 끝나기 전에 다음 회차 일시를 입력했다면 지우지 않는다.
      const input = document.getElementById(startsAtId);
      if (!(input instanceof HTMLInputElement) || input.value !== submitted) return;
      setStartsAt("");
      input.focus();
    });
  };

  return (
    <form noValidate onSubmit={submit} aria-label={initial ? "회차 수정" : "회차 추가"}>
      <div className={`grid gap-3 sm:items-end ${external ? "sm:grid-cols-[minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_140px_auto]"}`}>
        <label className="block text-sm font-semibold text-muted-strong">
          시작 일시 (한국 시간)
          <FieldInput id={startsAtId} type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2" />
        </label>
        {external ? null : (
          <label className="block text-sm font-semibold text-muted-strong">
            정원
            <FieldInput type="number" inputMode="numeric" min={minCapacity} value={capacity} onChange={(event) => setCapacity(event.target.value)} placeholder="60" className="mt-2" />
          </label>
        )}
        <div className="flex gap-2 [&>*]:grow sm:[&>*]:grow-0">
          {onCancel ? <SecondaryButton onClick={onCancel} disabled={busy}>{initial ? "취소" : "닫기"}</SecondaryButton> : null}
          <PrimaryButton type="submit" disabled={busy}>{initial ? "저장" : "추가"}</PrimaryButton>
        </div>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm font-medium text-fail">{error}</p> : null}
    </form>
  );
}

function showInputWithRemainingSeats(show: ProducerShow, remainingSeatsVisible: boolean): SaveShow {
  return {
    title: show.title,
    genre: show.genre,
    description: show.description,
    venue: show.venue,
    runningMinutes: show.runningMinutes,
    ageRating: show.ageRating,
    inquiryPhone: show.inquiryPhone,
    hostName: show.hostName,
    links: show.links,
    guides: show.guides,
    remainingSeatsVisible,
    posterFileId: show.poster.fileId,
    imageFileIds: show.images.map((image) => image.fileId),
  };
}

/**
 * 운영자가 등록한 외부 링크 공연이다. 예매자 명단은 외부 예매 서비스에 있으므로 관객이 이동할 주소와
 * 예술in에서 예매하기를 눌러 이동한 횟수를 보여 준다.
 */
function ExternalReservationNotice({ url, visits }: { readonly url: string; readonly visits: number }) {
  return (
    <section aria-labelledby="external-reservation-title" className="rounded-card border border-border bg-card px-5 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="external-reservation-title" className="text-base font-bold">외부 링크로 예매받는 중</h2>
        <p className="text-sm text-muted-strong">예매하기로 이동 <strong className="num text-base text-foreground">{visits.toLocaleString("ko-KR")}</strong>회</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-strong">
        관객이 공연 페이지에서 예매하기를 누르면 아래 주소가 새 창으로 열려요. 예매자 명단과 인원 확인은 외부 예매 서비스에서 해 주세요.
        주소는 정보 수정에서 바꿀 수 있어요.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block break-all rounded-control border border-border bg-surface px-3 py-2.5 text-sm font-medium text-brand hover:border-brand-line hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {url}<span className="sr-only"> (새 창에서 열림)</span>
      </a>
    </section>
  );
}

function ShowSummary({ show, onDelete, onToggleRemainingSeats, busy }: {
  readonly show: ProducerShow;
  readonly onDelete: () => void;
  readonly onToggleRemainingSeats: () => void;
  readonly busy: boolean;
}) {
  return (
    <aside className="@container h-fit rounded-card border border-border bg-card p-5">
      {/* 폭이 좁은 휴대폰에서는 포스터 옆에 두면 값 칸이 너무 좁아 전화번호가 끊기므로 아래로 내린다. */}
      <div className="flex flex-col gap-4 @min-[17rem]:flex-row lg:block">
        <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-control border border-border bg-border-soft lg:w-full">
          <Image src={show.poster.url} alt={`${show.title} 포스터`} fill unoptimized sizes="(min-width: 1024px) 280px, 80px" className="object-cover" />
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm lg:mt-4 [&>dt]:whitespace-nowrap">
          <dt className="text-muted">주최</dt><dd className="break-words">{show.hostName || show.defaultHostName || "기획사 이름"}</dd>
          <dt className="text-muted">장소</dt><dd>{show.venue.name}</dd>
          <dt className="text-muted">공연 시간</dt><dd className="num">{show.runningMinutes}분</dd>
          {show.ageRating ? <><dt className="text-muted">관람 연령</dt><dd>{show.ageRating}</dd></> : null}
          <dt className="text-muted">문의 전화</dt><dd className="num whitespace-nowrap">{show.inquiryPhone}</dd>
          <dt className="text-muted">상세 이미지</dt><dd className="num">{show.images.length}장</dd>
          <dt className="text-muted">안내 링크</dt><dd className="num">{show.links.length ? `${show.links.length}개` : "없음"}</dd>
          <dt className="text-muted">추가 안내</dt><dd className="num">{show.guides.length ? `${show.guides.length}개` : "없음"}</dd>
          {show.externalReservationUrl ? <><dt className="text-muted">예매</dt><dd>외부 링크</dd></> : null}
        </dl>
      </div>
      {/* 외부 링크 공연은 잔여석을 관객에게 보여 주지 않으므로 공개 설정을 숨긴다. */}
      {show.externalReservationUrl ? null : (
        <div className="mt-5 border-t border-border-soft pt-4">
          <p className="text-sm font-semibold">관객에게 잔여석 표시</p>
          <p className="mt-1 text-sm text-muted-strong">현재 {show.remainingSeatsVisible ? "공개 중" : "비공개"}</p>
          <SecondaryButton
            onClick={onToggleRemainingSeats}
            disabled={busy}
            className="mt-3 w-full"
          >
            {busy ? "저장 중…" : show.remainingSeatsVisible ? "잔여석 비공개로 변경" : "잔여석 공개로 변경"}
          </SecondaryButton>
        </div>
      )}
      <div className="mt-5 border-t border-border-soft pt-4">
        <button
          type="button"
          onClick={onDelete}
          disabled={busy || show.hasReservations}
          className="min-h-11 text-sm font-semibold text-fail hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
        >
          공연 삭제
        </button>
        {show.hasReservations ? <p className="mt-1 text-xs leading-5 text-muted">예매 기록이 있는 공연은 삭제할 수 없어요. 예매 마감을 이용해 주세요.</p> : null}
      </div>
    </aside>
  );
}
