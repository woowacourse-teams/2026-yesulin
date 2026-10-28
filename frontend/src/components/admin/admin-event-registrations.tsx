"use client";

import { useEffect, useRef, useState } from "react";
import { FieldInput, FieldSelect } from "@/components/ui/controls";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { AdminApiError, changeEventPaymentStatus, deleteEventRegistration, downloadBusinessCardArchive, fetchEventRegistrations } from "@/features/admin/api";
import type { AdminEventRegistration } from "@/features/admin/types";
import { EVENT_ACTIVITY_LABELS, EVENT_PARTICIPANT_LABELS, EVENT_SNS_LABELS, EVENT_PAYMENT_STATUS_LABELS, type EventPaymentStatus, type EventParticipantType } from "@/features/events/types";
import { formatDateTime } from "./admin-format";
import { AdminActionButton } from "./admin-shell";

const PARTICIPANT_BADGE_TONES: Readonly<Record<EventParticipantType, string>> = {
  ACTOR: "border-brand-line bg-brand-soft text-brand-strong",
  PRODUCER: "border-etc/20 bg-etc-bg text-etc",
};

/** 이벤트 참가 신청자를 먼저 온 순서로 보여 준다. 배우 사진은 잠깐 열리는 주소라 다시 열려면 새로고침한다. */
export function AdminEventRegistrations({ eventId, onUnauthorized, onChanged }: { readonly eventId: number; readonly onUnauthorized: () => void; readonly onChanged?: () => void }) {
  const [registrations, setRegistrations] = useState<readonly AdminEventRegistration[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [deleting, setDeleting] = useState<AdminEventRegistration | null>(null);
  const [removing, setRemoving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [query, setQuery] = useState("");
  const [participantType, setParticipantType] = useState<EventParticipantType | "ALL">("ALL");
  const [paymentFilter, setPaymentFilter] = useState<EventPaymentStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [paymentSaving, setPaymentSaving] = useState<number | null>(null);
  /** 부모가 매번 새 함수를 넘겨도 다시 읽지 않게 최신 콜백만 기억한다. */
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);

  useEffect(() => {
    let active = true;
    fetchEventRegistrations(eventId)
      .then((next) => { if (active) { setRegistrations(next); setError(null); } })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
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
      onChanged?.();
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        onUnauthorized();
        return;
      }
      setDeleting(null);
      setError(cause instanceof Error ? cause.message : "참가 신청을 지우지 못했습니다.");
    } finally {
      setRemoving(false);
    }
  };

  const savePayment = async (registration: AdminEventRegistration, status: EventPaymentStatus) => {
    if (paymentSaving !== null || status === registration.paymentStatus) return;
    setPaymentSaving(registration.id); setError(null);
    try {
      const updated = await changeEventPaymentStatus(eventId, registration.id, status);
      setRegistrations((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) { unauthorized.current(); return; }
      setError(cause instanceof Error ? cause.message : "입금 상태를 저장하지 못했습니다.");
    } finally { setPaymentSaving(null); }
  };
  const confirmed = registrations?.filter((item) => item.paymentStatus === "CONFIRMED").length ?? 0;
  const actors = registrations?.filter((item) => item.participantType === "ACTOR").length ?? 0;
  const cards = registrations?.filter((item) => item.businessCardRequested).length ?? 0;

  const normalizedQuery = query.trim().toLocaleLowerCase().replace(/[\s-]/g, "");
  const matching = (registrations ?? []).map((registration, index) => ({ registration, order: index + 1 })).filter(({ registration }) => (
    (participantType === "ALL" || registration.participantType === participantType)
    && (paymentFilter === "ALL" || registration.paymentStatus === paymentFilter)
    && (!normalizedQuery || [registration.name, registration.phone, registration.email, registration.affiliation]
      .some((value) => value?.toLocaleLowerCase().replace(/[\s-]/g, "").includes(normalizedQuery)))
  ));
  const pageCount = Math.max(1, Math.ceil(matching.length / 20));
  const currentPage = Math.min(page, pageCount);
  const visible = matching.slice((currentPage - 1) * 20, currentPage * 20);
  const resetFilters = () => { setQuery(""); setParticipantType("ALL"); setPaymentFilter("ALL"); setPage(1); };

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await downloadBusinessCardArchive(eventId);
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        unauthorized.current();
        return;
      }
      setError(cause instanceof Error ? cause.message : "명함 자료를 내려받지 못했습니다.");
    } finally {
      setDownloading(false);
    }
  };
  return (
    <section aria-label="참가 신청자" className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-semibold">
          참가 신청자
          {registrations ? <span className="num ml-1 font-normal text-muted">{registrations.length}명</span> : null}
        </h3>
        {cards > 0 ? (
          <AdminActionButton className="ml-auto" disabled={downloading} onClick={() => void download()}>
            {downloading ? "내려받는 중…" : `명함 자료 내려받기 (${cards}명)`}
          </AdminActionButton>
        ) : null}
        <AdminActionButton tone="quiet" className={cards > 0 ? "" : "ml-auto"} onClick={() => setReloadToken((value) => value + 1)}>새로고침</AdminActionButton>
      </div>
      {registrations ? <p className="text-xs leading-6 text-muted-strong">관계자 {registrations.filter((item) => item.participantType === "PRODUCER").length}명 · 배우 {actors}명<br />입금 확인 {confirmed}명 · 미확인 {registrations.length - confirmed}명 · 상태를 바꾸면 바로 저장됩니다.</p> : null}
      {registrations && registrations.length > 0 ? <>
        <div role="search" aria-label="참가자 검색 및 필터" className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <label htmlFor="event-participant-search" className="mb-1 block text-xs font-semibold text-muted-strong">참가자 검색</label>
            <FieldInput id="event-participant-search" type="search" placeholder="이름, 전화번호, 이메일, 소속" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </div>
          <div>
            <label htmlFor="event-participant-type" className="mb-1 block text-xs font-semibold text-muted-strong">참가 유형</label>
            <FieldSelect id="event-participant-type" value={participantType} onChange={(event) => { setParticipantType(event.target.value as EventParticipantType | "ALL"); setPage(1); }}>
              <option value="ALL">전체 유형</option>
              <option value="PRODUCER">관계자</option><option value="ACTOR">배우</option>
            </FieldSelect>
          </div>
          <div>
            <label htmlFor="event-participant-payment" className="mb-1 block text-xs font-semibold text-muted-strong">입금 필터</label>
            <FieldSelect id="event-participant-payment" value={paymentFilter} onChange={(event) => { setPaymentFilter(event.target.value as EventPaymentStatus | "ALL"); setPage(1); }}>
              <option value="ALL">전체 입금 상태</option><option value="PENDING">입금 미확인</option><option value="CONFIRMED">입금 확인</option>
            </FieldSelect>
          </div>
        </div>
        <p role="status" className="num text-xs text-muted">검색 결과 {matching.length}명 / 전체 {registrations.length}명</p>
        {matching.length === 0 ? <div className="rounded-control border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-strong">조건에 맞는 참가자가 없습니다.</p>
          <AdminActionButton tone="quiet" className="mt-2" onClick={resetFilters}>검색 초기화</AdminActionButton>
        </div> : null}
      </> : null}
      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      {!registrations && !error ? <p role="status" className="text-sm text-muted">신청자를 불러오는 중이에요.</p> : null}
      {registrations?.length === 0 ? <p className="text-sm text-muted">아직 신청자가 없어요.</p> : null}
      {visible.length > 0 ? (
        <ol className="flex flex-col gap-4">
          {visible.map(({ registration, order }) => (
            <li key={registration.id} className="flex min-w-0 flex-wrap gap-4 rounded-card border border-slate-300 bg-card p-4 text-sm sm:p-5">
              {registration.photoUrl ? (
                <a href={registration.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0" aria-label={`${registration.name} 사진 크게 보기`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- 잠깐 열리는 비공개 저장소 주소를 그대로 보여 준다. */}
                  <img src={registration.photoUrl} alt="" className="h-20 w-16 rounded-control border border-border-soft bg-surface object-cover" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <span className="num inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-surface text-xs font-semibold text-muted" aria-label={`접수 순서 ${order}번`}>{order}</span>
                  <span className="break-words text-base font-bold text-foreground">{registration.name}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${PARTICIPANT_BADGE_TONES[registration.participantType]}`}>{EVENT_PARTICIPANT_LABELS[registration.participantType]}</span>
                  {registration.businessCardRequested ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">명함 희망</span> : null}
                </p>
                <p className="num mt-2 break-all text-muted-strong">
                  {[registration.phone, registration.email, registration.snsHandle ? `${registration.snsPlatform ? `${EVENT_SNS_LABELS[registration.snsPlatform]}: ` : ""}${registration.snsHandle}` : null, registration.birthDate].filter(Boolean).join(" · ")}
                </p>
                {registration.affiliation ? <p className="mt-1 whitespace-pre-line break-words text-muted-strong">{registration.affiliation}</p> : null}
                {registration.businessCardRequested ? <details className="mt-1">
                  <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-brand">명함 정보 보기</summary>
                  <ActorDetails registration={registration} />
                </details> : null}
                <p className="mt-1 text-xs text-muted">{formatDateTime(registration.createdAt)} 신청</p>
              </div>
              <div className="flex basis-full flex-wrap items-start gap-3 border-t border-border pt-3 sm:basis-auto sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                <div className="min-w-[150px] flex-1 sm:flex-none">
                  <label htmlFor={`event-payment-${registration.id}`} className="mb-1 block text-xs font-semibold text-muted-strong">입금 상태</label>
                  <FieldSelect id={`event-payment-${registration.id}`} aria-label={`${registration.name} 입금 상태`} value={registration.paymentStatus} disabled={paymentSaving !== null || removing} onChange={(event) => void savePayment(registration, event.target.value as EventPaymentStatus)} className={registration.paymentStatus === "CONFIRMED" ? "font-semibold text-pass" : "text-muted-strong"}>
                    <option value="PENDING">{EVENT_PAYMENT_STATUS_LABELS.PENDING}</option>
                    <option value="CONFIRMED">{EVENT_PAYMENT_STATUS_LABELS.CONFIRMED}</option>
                  </FieldSelect>
                  {paymentSaving === registration.id ? <p role="status" className="mt-1 text-xs text-muted">저장 중…</p> : registration.paymentConfirmedAt ? <p className="num mt-1 text-xs text-muted">{formatDateTime(registration.paymentConfirmedAt)}</p> : null}
                </div>
                <AdminActionButton tone="destructive" disabled={paymentSaving !== null} className="mt-5" onClick={() => setDeleting(registration)}>삭제</AdminActionButton>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {matching.length > 0 ? <nav aria-label="참가자 페이지" className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="num text-xs text-muted">{(currentPage - 1) * 20 + 1}–{Math.min(currentPage * 20, matching.length)}명 표시 · 페이지당 20명</p>
        <div className="flex items-center gap-3">
          <AdminActionButton disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>이전</AdminActionButton>
          <span className="num text-sm" aria-live="polite">{currentPage} / {pageCount} 페이지</span>
          <AdminActionButton disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>다음</AdminActionButton>
        </div>
      </nav> : null}
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
      {registration.intro ? <p>한 줄 소개: {registration.intro}</p> : null}
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
