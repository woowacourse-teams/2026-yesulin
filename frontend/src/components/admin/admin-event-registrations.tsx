"use client";

import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { AdminApiError, deleteEventRegistration, fetchEventRegistrations } from "@/features/admin/api";
import type { AdminEventRegistration } from "@/features/admin/types";
import { EVENT_ACTIVITY_LABELS, EVENT_PARTICIPANT_LABELS } from "@/features/events/types";
import { formatDateTime } from "./admin-format";
import { AdminActionButton } from "./admin-shell";

/** 이벤트 참가 신청자를 먼저 온 순서로 보여 준다. 배우 사진은 잠깐 열리는 주소라 다시 열려면 새로고침한다. */
export function AdminEventRegistrations({ eventId, onUnauthorized }: { readonly eventId: number; readonly onUnauthorized: () => void }) {
  const [registrations, setRegistrations] = useState<readonly AdminEventRegistration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [deleting, setDeleting] = useState<AdminEventRegistration | null>(null);
  const [removing, setRemoving] = useState(false);
  /** 부모가 매번 새 함수를 넘겨도 다시 읽지 않게 최신 콜백만 기억한다. */
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);

  useEffect(() => {
    let active = true;
    fetchEventRegistrations(eventId)
      .then((next) => { if (active) { setRegistrations(next); setError(null); } })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && cause.status === 401) {
          unauthorized.current();
          return;
        }
        setError(cause instanceof Error ? cause.message : "참가 신청자를 불러오지 못했습니다.");
      });
    return () => { active = false; };
  }, [eventId, reloadToken]);

  const remove = async (registration: AdminEventRegistration) => {
    setRemoving(true);
    try {
      await deleteEventRegistration(eventId, registration.id);
      setRegistrations((current) => current?.filter((item) => item.id !== registration.id) ?? null);
      setDeleting(null);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        onUnauthorized();
        return;
      }
      setDeleting(null);
      setError(cause instanceof Error ? cause.message : "참가 신청을 지우지 못했습니다.");
    } finally {
      setRemoving(false);
    }
  };

  const actors = registrations?.filter((item) => item.participantType === "ACTOR").length ?? 0;
  return (
    <section aria-label="참가 신청자" className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">
          참가 신청자
          {registrations ? <span className="num ml-1 font-normal text-muted">{registrations.length}명 (배우 {actors} · 공연사 {registrations.length - actors})</span> : null}
        </h4>
        <AdminActionButton tone="quiet" className="ml-auto" onClick={() => setReloadToken((value) => value + 1)}>새로고침</AdminActionButton>
      </div>
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      {!registrations && !error ? <p role="status" className="text-sm text-muted">신청자를 불러오는 중이에요.</p> : null}
      {registrations?.length === 0 ? <p className="text-sm text-muted">아직 신청자가 없어요.</p> : null}
      {registrations && registrations.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {registrations.map((registration, index) => (
            <li key={registration.id} className="flex min-w-0 gap-3 rounded-control border border-border-soft p-3 text-sm">
              {registration.photoUrl ? (
                <a href={registration.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`${registration.name} 사진 크게 보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 잠깐 열리는 비공개 저장소 주소를 그대로 보여 준다. */}
                  <img src={registration.photoUrl} alt="" className="h-20 w-16 rounded-control border border-border-soft bg-surface object-cover" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                  <span className="num text-muted">{index + 1}</span>
                  {registration.name}
                  <span className="rounded-full bg-border-soft px-2 py-0.5 text-xs font-bold text-muted-strong">{EVENT_PARTICIPANT_LABELS[registration.participantType]}</span>
                  {registration.businessCardRequested ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">명함 희망</span> : null}
                </p>
                <p className="num mt-1 break-all text-muted-strong">
                  {[registration.phone, registration.email, registration.snsHandle, registration.birthDate].filter(Boolean).join(" · ")}
                </p>
                {registration.affiliation ? <p className="mt-1 whitespace-pre-line break-words text-muted-strong">{registration.affiliation}</p> : null}
                {registration.businessCardRequested ? <ActorDetails registration={registration} /> : null}
                <p className="mt-1 text-xs text-muted">{formatDateTime(registration.createdAt)} 신청</p>
              </div>
              <AdminActionButton tone="destructive" className="self-start" onClick={() => setDeleting(registration)}>삭제</AdminActionButton>
            </li>
          ))}
        </ol>
      ) : null}
      {deleting ? (
        <ConfirmDialog
          title="참가 신청을 지울까요?"
          destructive
          confirmLabel="신청 삭제"
          busy={removing}
          onClose={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
          description={<><strong className="font-semibold text-foreground">{deleting.name}</strong>님의 신청과 사진을 지워요. 되돌릴 수 없어요.</>}
        />
      ) : null}
    </section>
  );
}

/** 명함을 희망한 배우가 고른 분야와 경력. 신입은 경력 대신 "경력 없음"을 보인다. */
function ActorDetails({ registration }: { readonly registration: AdminEventRegistration }) {
  const fields = registration.activityFields
    .map((field) => field === "OTHER" && registration.otherActivity ? `기타(${registration.otherActivity})` : EVENT_ACTIVITY_LABELS[field])
    .join(" · ");
  return (
    <div className="mt-1 text-muted-strong">
      {fields ? <p>분야: {fields}</p> : null}
      {registration.noCareer ? <p>경력 없음 (신입)</p> : (
        <ul className="mt-1 list-disc pl-5">
          {registration.careers.map((career, index) => (
            <li key={index} className="break-words">
              <span className="num">{career.performedMonth.replace("-", ".")}</span> {career.workTitle}{career.role ? ` · ${career.role}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
