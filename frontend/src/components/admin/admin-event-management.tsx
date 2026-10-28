"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { AdminApiError, changeEventRegistrationClosed, changeEventStatus, deleteEvent, fetchAdminEvent, updateEvent } from "@/features/admin/api";
import { adminEventRoutes } from "@/features/admin/event-routes";
import type { AdminEvent } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { draftOfEvent } from "@/features/events/draft";
import { EVENT_REGISTRATION_STATUS_LABELS, eventRoutes, formatEventPeriod } from "@/features/events/types";
import { AdminEventForm } from "./admin-event-form";
import { AdminEventRegistrations } from "./admin-event-registrations";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminShell } from "./admin-shell";

type Props = { readonly eventId: number; readonly tab: "participants" | "settings" };
type Phase = "loading" | "ready" | "unauthorized" | "failed" | "missing";

/** 한 행사의 참가자와 설정을 독립된 주소에서 관리한다. */
export function AdminEventManagement({ eventId, tab }: Props) {
  const router = useRouter();
  const [loadedEvent, setEvent] = useState<AdminEvent | null>(null);
  const event = loadedEvent?.id === eventId ? loadedEvent : null;
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const unauthorized = useCallback(() => setPhase("unauthorized"), []);
  useEffect(() => {
    let active = true;
    fetchAdminEvent(eventId).then((next) => {
      if (active) { setEvent(next); setError(null); setPhase("ready"); }
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        setPhase("unauthorized"); return;
      }
      setPhase(cause instanceof AdminApiError && cause.status === 404 ? "missing" : "failed");
      setError(cause instanceof Error ? cause.message : "이벤트를 불러오지 못했습니다.");
    });
    return () => { active = false; };
  }, [eventId, reloadToken]);

  const change = async (operation: () => Promise<AdminEvent>) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { setEvent(await operation()); }
    catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) { unauthorized(); return; }
      setError(cause instanceof Error ? cause.message : "변경 사항을 저장하지 못했습니다.");
    } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError(null);
    try { await deleteEvent(eventId); router.replace(adminEventRoutes.list); }
    catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) { unauthorized(); return; }
      setDeleting(false);
      setError(cause instanceof Error ? cause.message : "이벤트를 지우지 못했습니다.");
    } finally { setBusy(false); }
  };
  if (phase === "unauthorized") return <AdminSessionEnded />;
  return <AdminShell current="events" title="이벤트 관리" actions={<>
    <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
    <AdminActionButton tone="quiet" onClick={() => void logout().catch(() => null).then(unauthorized)}>로그아웃</AdminActionButton>
  </>}>
    <Link href={adminEventRoutes.list} className="flex min-h-11 w-fit items-center rounded-control text-sm font-semibold text-muted-strong hover:underline">이벤트 목록</Link>
    {phase === "loading" || (phase === "ready" && !event) ? <p role="status">이벤트를 불러오는 중이에요.</p> : null}
    {phase === "missing" ? <p role="alert">이벤트를 찾을 수 없습니다. 목록에서 다른 이벤트를 선택해 주세요.</p> : error ? <p role="alert" className="text-sm text-fail">{error} {phase === "failed" ? <button type="button" onClick={refresh} className="underline">다시 시도</button> : null}</p> : null}
    {event && phase === "ready" ? <>
      <header className="flex min-w-0 flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <AuditionPostStatusBadge status={event.status} />
            <span className="font-semibold text-muted-strong">{EVENT_REGISTRATION_STATUS_LABELS[event.registrationStatus]}</span>
            {event.banner.enabled ? <span className="text-muted">{event.bannerVisible ? "배너 노출 중" : "배너 노출 대기·종료"}</span> : null}
          </div>
          <h2 className="break-words text-2xl font-bold leading-tight">{event.title}</h2>
          <p className="mt-2 text-sm text-muted">{formatEventPeriod(event.startsOn, event.endsOn) ?? "기간 미지정"}</p>
          <p className="num mt-4 text-sm text-muted-strong"><strong className="text-foreground">{event.registrationCount}명 접수</strong> / {event.registrationCapacity === null ? "정원 제한 없음" : `총 ${event.registrationCapacity}명`}</p>
          {event.registrationCapacity !== null && event.registrationCount > event.registrationCapacity ? <p className="mt-1 text-xs text-warn">정원을 낮춰도 기존 신청은 유지됩니다.</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {event.status === "PUBLISHED" ? <AdminActionLink href={eventRoutes.detail(event.id)} target="_blank" rel="noopener noreferrer">공개 화면</AdminActionLink> : null}
          {event.registrationEnabled ? <AdminActionButton disabled={busy} onClick={() => void change(() => changeEventRegistrationClosed(event.id, !event.registrationClosed))} title="기존 신청과 안내를 유지합니다. 정원이 차 있으면 다시 열어도 접수되지 않습니다.">{busy ? "변경 중…" : event.registrationClosed ? "모집 다시 열기" : "모집 마감"}</AdminActionButton> : null}
        </div>
      </header>
      <nav aria-label="이벤트 관리 메뉴" className="flex gap-6 border-b border-border">
        <Link href={adminEventRoutes.detail(eventId)} aria-current={tab === "participants" ? "page" : undefined} className={`flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold ${tab === "participants" ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>참가자 관리</Link>
        <Link href={adminEventRoutes.settings(eventId)} aria-current={tab === "settings" ? "page" : undefined} className={`flex min-h-11 items-center border-b-2 px-1 text-sm font-semibold ${tab === "settings" ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground"}`}>이벤트 설정</Link>
      </nav>
      {tab === "participants" ? <AdminEventRegistrations key={eventId} eventId={eventId} onUnauthorized={unauthorized} onChanged={refresh} /> : <section aria-label="이벤트 설정" className="flex max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">공개 설정</h3>
          <AdminActionButton disabled={busy} onClick={() => void change(() => changeEventStatus(event.id, event.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"))}>{event.status === "PUBLISHED" ? "숨기기" : "공개하기"}</AdminActionButton>
        </div>
        {saved ? <p role="status" className="text-sm text-pass">이벤트 설정을 저장했습니다.</p> : null}
        <AdminEventForm key={eventId} initial={draftOfEvent(event)} submitLabel="변경 사항 저장" onCancel={() => router.push(adminEventRoutes.detail(eventId))} onUnauthorized={unauthorized} onSave={async (write) => {
          setEvent(await updateEvent(eventId, write)); setSaved(true);
        }} />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-sm text-muted-strong">이벤트를 삭제하면 받은 신청과 사진도 함께 지워집니다.</p>
          <AdminActionButton tone="destructive" disabled={busy} onClick={() => setDeleting(true)}>이벤트 삭제</AdminActionButton>
        </div>
      </section>}
    </> : null}
    {deleting && event ? <ConfirmDialog title="이벤트를 지울까요?" destructive confirmLabel="이벤트 삭제" busy={busy} onClose={() => setDeleting(false)} onConfirm={() => void remove()} description={<><strong>{event.title}</strong> 글과 이미지, 받은 참가 신청과 사진을 지웁니다. 되돌릴 수 없습니다. 잠시 내리려면 숨기기를 사용해 주세요.</>} /> : null}
  </AdminShell>;
}
