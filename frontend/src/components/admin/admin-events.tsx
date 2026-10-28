"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { EventPhaseBadge } from "@/components/events/event-screen";
import { AdminApiError, createEvent, fetchAdminEvents } from "@/features/admin/api";
import type { AdminEvent } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { emptyEventDraft } from "@/features/events/draft";
import { EVENT_REGISTRATION_STATUS_LABELS, formatEventPeriod } from "@/features/events/types";
import { adminEventRoutes } from "@/features/admin/event-routes";
import { AdminEventForm } from "./admin-event-form";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/** 목록은 행사별 현황과 관리 페이지 진입만 담당한다. */
export function AdminEvents() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [events, setEvents] = useState<readonly AdminEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    let active = true;
    fetchAdminEvents().then((next) => {
      if (active) { setEvents(next); setError(null); setPhase("ready"); }
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        setPhase("unauthorized"); return;
      }
      setError(cause instanceof Error ? cause.message : "이벤트 목록을 불러오지 못했습니다.");
      setPhase("failed");
    });
    return () => { active = false; };
  }, [reloadToken]);
  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  async function signOut() {
    await logout().catch(() => null);
    setEvents([]); setPhase("unauthorized");
  }
  if (phase === "unauthorized") return <AdminSessionEnded />;
  return (
    <AdminShell current="events" title="이벤트" description="이벤트를 선택해 참가자와 모집 설정을 관리하세요." actions={<>
      <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
      <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
    </>}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">이벤트 <span className="num ml-1 text-sm font-normal text-muted">{phase === "ready" ? `${events.length}건` : ""}</span></h2>
        <AdminActionButton tone="primary" onClick={() => setCreating(true)} disabled={creating}>이벤트 쓰기</AdminActionButton>
      </div>
      {creating ? <AdminEventForm initial={emptyEventDraft()} submitLabel="검토 전으로 만들기" onCancel={() => setCreating(false)} onUnauthorized={() => setPhase("unauthorized")} onSave={async (write) => {
        const created = await createEvent(write);
        router.push(adminEventRoutes.settings(created.id));
      }} /> : null}
      {error ? <p role="alert" className="text-sm text-fail">{error} <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button></p> : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">이벤트를 불러오는 중이에요.</p> : null}
      {phase === "ready" && events.length === 0 ? <AdminEmptyState title="첫 이벤트를 써 보세요" description="이벤트를 만든 뒤 전용 관리 페이지에서 공개하고 참가자를 확인할 수 있어요." /> : null}
      {phase === "ready" && events.length > 0 ? <section aria-label="이벤트 목록" className="overflow-hidden rounded-card border border-border bg-card">
        {events.map((event) => <article key={event.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 border-b border-border-soft p-4 last:border-b-0 sm:p-5">
          <div className="min-w-0 flex-1 basis-64">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <AuditionPostStatusBadge status={event.status} />
              <EventPhaseBadge phase={event.phase} registrationStatus={event.registrationStatus} />
              {event.bannerVisible ? <span className="text-brand">배너 노출 중</span> : null}
            </div>
            <h3 className="break-words text-lg font-semibold"><Link href={adminEventRoutes.detail(event.id)} className="rounded-sm hover:underline">{event.title}</Link></h3>
            <p className="mt-1 text-sm text-muted">{formatEventPeriod(event.startsOn, event.endsOn) ?? "기간 미지정"}</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold">{EVENT_REGISTRATION_STATUS_LABELS[event.registrationStatus]}</p>
            <p className="num mt-1 text-muted-strong">{event.registrationCount}명 접수{event.registrationEnabled ? event.registrationCapacity === null ? " / 정원 제한 없음" : ` / 총 ${event.registrationCapacity}명` : ""}</p>
          </div>
          <AdminActionLink href={adminEventRoutes.detail(event.id)}>관리하기<span className="sr-only">: {event.title}</span></AdminActionLink>
        </article>)}
      </section> : null}
    </AdminShell>
  );
}
