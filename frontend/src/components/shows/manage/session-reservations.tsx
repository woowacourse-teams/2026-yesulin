"use client";

import { useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FilterChip, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { saveBlob } from "@/features/files/download";
import { createXlsxBlob } from "@/features/files/xlsx";
import { formatShowDateTime, formatShowFullDateTime } from "@/features/shows/format";
import { cancelReservation, getSessionReservations } from "@/features/shows/producer-api";
import {
  confirmedPhoneNumbers,
  reservationFileName,
  reservationSheet,
} from "@/features/shows/reservation-export";
import type { ProducerReservation, ProducerShowSession } from "@/features/shows/types";
import { ConfirmDialog } from "./confirm-dialog";
import { PhoneNumbersDialog } from "./phone-numbers-dialog";
import { ReservationDetailPanel } from "./reservation-detail-panel";

type ReservationsState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly reservations: readonly ProducerReservation[] };

type ReservationFilter = "ALL" | "CONFIRMED" | "CANCELED" | "MEMO";

const FILTERS: readonly { readonly value: ReservationFilter; readonly label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "CONFIRMED", label: "확정" },
  { value: "CANCELED", label: "취소" },
  { value: "MEMO", label: "메모 있음" },
];

const FILTER_MATCHES: Record<ReservationFilter, (reservation: ProducerReservation) => boolean> = {
  ALL: () => true,
  CONFIRMED: (reservation) => reservation.status === "CONFIRMED",
  CANCELED: (reservation) => reservation.status === "CANCELED",
  MEMO: (reservation) => Boolean(reservation.memo),
};

const CHECKBOX_CLASS = "h-5 w-5 shrink-0 cursor-pointer accent-brand";
/** 넓은 카드에서 머리글과 각 줄이 같은 칸을 쓰도록 한 곳에서 정한다. */
const ROW_COLUMNS = "@min-[42rem]:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem_3.5rem_3.5rem_1.25rem]";

const summaryId = (id: number) => `reservation-${id}-summary`;
const panelId = (id: number) => `reservation-${id}-detail`;

/**
 * 선택한 회차의 예매 관객. 줄을 누르면 아래로 상세가 펼쳐져 매수 조정·메모·취소를 한곳에서 하고,
 * 메모가 있는 관객은 줄에 표시한다. 문자 안내용 전화번호 복사와 현장 명단용 엑셀 다운로드를 제공하며
 * 취소된 예매는 복사·엑셀에서 뺀다.
 */
export function SessionReservations({ showId, showTitle, session, onChanged }: {
  readonly showId: string;
  readonly showTitle: string;
  readonly session: ProducerShowSession;
  readonly onChanged: () => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<ReservationsState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReservationFilter>("ALL");
  const [target, setTarget] = useState<ProducerReservation | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(() => new Set());
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<number>>(() => new Set());
  // 한 번 펼친 상세는 접어도 숨겨 두기만 해서, 쓰다 만 메모나 고르던 매수가 사라지지 않게 한다.
  const [openedIds, setOpenedIds] = useState<ReadonlySet<number>>(() => new Set());
  const [phoneDialog, setPhoneDialog] = useState<{ readonly phones: readonly string[]; readonly selectedOnly: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    getSessionReservations(showId, session.id)
      .then((reservations) => { if (active) setState({ status: "ready", reservations }); })
      .catch((cause) => {
        console.error("[회차 예매 관객 조회 실패]", cause);
        if (active) setState({ status: "error", message: cause instanceof Error ? cause.message : "예매 관객을 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, [showId, session.id, reloadToken]);

  const reload = () => {
    setState({ status: "loading" });
    setReloadToken((token) => token + 1);
  };

  const replaceReservation = (updated: ProducerReservation) => setState((current) => current.status === "ready"
    ? { status: "ready", reservations: current.reservations.map((item) => item.id === updated.id ? updated : item) }
    : current);

  const toggleExpanded = (id: number) => {
    setOpenedIds((current) => current.has(id) ? current : new Set([...current, id]));
    setExpandedIds((current) => current.has(id) ? withoutIds(current, [id]) : new Set([...current, id]));
  };

  const confirmCancel = async () => {
    if (!target) return;
    setCanceling(true);
    try {
      const canceled = await cancelReservation(target.id);
      replaceReservation(canceled);
      setSelectedIds((current) => withoutIds(current, [canceled.id]));
      toast(`${canceled.bookerName}님의 ${canceled.ticketCount}매 예매를 취소했어요.`, { type: "success" });
      setTarget(null);
      onChanged();
      // 누른 취소 버튼이 사라지므로 그 관객 줄로 포커스를 돌린다.
      window.setTimeout(() => document.getElementById(summaryId(canceled.id))?.focus());
    } catch (cause) {
      toast(cause instanceof AuditionRequestError ? cause.message : "예매를 취소하지 못했습니다. 다시 시도해 주세요.", { type: "error" });
    } finally {
      setCanceling(false);
    }
  };

  const detailUpdated = (updated: ProducerReservation, kind: "tickets" | "memo") => {
    replaceReservation(updated);
    if (kind === "tickets") {
      toast(`${updated.bookerName}님의 예매를 ${updated.ticketCount}매로 바꿨어요.`, { type: "success" });
      onChanged();
      return;
    }
    toast(updated.memo ? `${updated.bookerName}님 메모를 저장했어요.` : `${updated.bookerName}님 메모를 지웠어요.`, { type: "success" });
  };

  const reservations = state.status === "ready" ? state.reservations : [];
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED");
  const confirmedTickets = confirmed.reduce((sum, item) => sum + item.ticketCount, 0);
  const remainingSeats = Math.max(0, session.capacity - confirmedTickets);
  const confirmedPhones = confirmedPhoneNumbers(confirmed);
  const selected = confirmed.filter((item) => selectedIds.has(item.id));
  const normalizedQuery = query.replaceAll("-", "").trim().toLowerCase();
  const shown = reservations
    .filter(FILTER_MATCHES[filter])
    .filter((item) => !normalizedQuery
      || `${item.code} ${item.bookerName} ${item.bookerPhone.replaceAll("-", "")} ${item.memo}`.toLowerCase().includes(normalizedQuery));
  const shownConfirmed = shown.filter((item) => item.status === "CONFIRMED");
  const allShownSelected = shownConfirmed.length > 0 && shownConfirmed.every((item) => selectedIds.has(item.id));
  const someShownSelected = shownConfirmed.some((item) => selectedIds.has(item.id));
  const selectAll = { checked: allShownSelected, indeterminate: !allShownSelected && someShownSelected, disabled: !shownConfirmed.length };

  const toggle = (id: number) => setSelectedIds((current) => current.has(id) ? withoutIds(current, [id]) : new Set([...current, id]));
  // 검색·필터 중이면 보이는 확정 예매만 한꺼번에 고르거나 푼다.
  const toggleAllShown = () => setSelectedIds((current) => allShownSelected
    ? withoutIds(current, shownConfirmed.map((item) => item.id))
    : new Set([...current, ...shownConfirmed.map((item) => item.id)]));

  const openPhoneDialog = () => {
    const phones = confirmedPhoneNumbers(selected.length ? selected : confirmed);
    if (!phones.length) return;
    setPhoneDialog({ phones, selectedOnly: selected.length > 0 });
  };

  const downloadSheet = () => {
    try {
      saveBlob(createXlsxBlob(reservationSheet(reservations)), reservationFileName(showTitle, session.startsAt));
      toast(`확정 예매 ${confirmed.length}건으로 엑셀 파일을 만들었어요.`, { type: "success" });
    } catch (cause) {
      console.error("[예매 관객 명단 엑셀 만들기 실패]", cause);
      toast("엑셀 파일을 만들지 못했어요. 다시 시도해 주세요.", { type: "error" });
    }
  };

  return (
    <section aria-labelledby="session-reservations-title" className="@container rounded-card border border-border bg-card">
      <div className="border-b border-border-soft px-5 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="session-reservations-title" className="text-base font-bold">예매 관객 · <span className="num">{formatShowDateTime(session.startsAt)}</span></h2>
            <p className="num mt-1 text-sm text-muted-strong">
              확정 {confirmed.length}건 · {confirmedTickets}매 / 정원 {session.capacity}석
            </p>
          </div>
          <label className="w-full max-w-xs text-sm font-semibold text-muted-strong">
            <span className="sr-only">예매 관객 검색</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예매번호, 이름, 휴대폰 뒷자리, 메모"
              className="min-h-11 w-full rounded-control border border-border bg-card px-3 text-base md:text-sm"
            />
          </label>
        </div>
        {state.status === "ready" && reservations.length > 0 ? (
          <div role="group" aria-label="예매 관객 거르기" className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((option) => (
              <FilterChip key={option.value} pressed={filter === option.value} onClick={() => setFilter(option.value)}>
                {option.value === "MEMO" ? <NoteIcon className="mr-1 inline h-4 w-4 align-[-3px]" /> : null}
                {option.label} <span className="num ml-0.5">{reservations.filter(FILTER_MATCHES[option.value]).length}</span>
              </FilterChip>
            ))}
          </div>
        ) : null}
      </div>

      {state.status === "ready" && confirmed.length > 0 ? (
        <div role="toolbar" aria-label="예매 관객 명단 내보내기" className="flex flex-wrap items-center gap-2 border-b border-border-soft px-5 py-3">
          <label className={`inline-flex min-h-11 items-center gap-2 pr-1 text-sm font-semibold text-muted-strong @min-[42rem]:hidden ${shownConfirmed.length ? "cursor-pointer" : "opacity-50"}`}>
            <SelectAllCheckbox {...selectAll} onChange={toggleAllShown} />
            전체 선택
          </label>
          <SecondaryButton onClick={openPhoneDialog} aria-haspopup="dialog" className="w-full @min-[32rem]:w-auto">
            {selected.length ? <>선택한 <span className="num">{selected.length}</span>명 번호 복사</> : <>전화번호 전체 복사 <span className="num ml-1 text-muted">{confirmedPhones.length}명</span></>}
          </SecondaryButton>
          <PrimaryButton onClick={downloadSheet} title="엑셀(.xlsx) 파일로 다운로드" className="w-full @min-[32rem]:w-auto">예매 관객 내보내기</PrimaryButton>
          {selected.length ? <TextButton onClick={() => setSelectedIds(new Set())}>선택 해제</TextButton> : null}
          <p className="w-full text-xs leading-5 text-muted lg:ml-auto lg:w-auto">취소된 예매는 복사·엑셀에 넣지 않아요.</p>
        </div>
      ) : null}

      {state.status === "loading" ? <p role="status" className="px-5 py-10 text-center text-sm text-muted">예매 관객을 불러오는 중…</p> : null}
      {state.status === "error" ? <div className="p-5"><ScreenError message={state.message} onRetry={reload} /></div> : null}
      {state.status === "ready" && reservations.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">아직 예매한 관객이 없어요.</p> : null}
      {state.status === "ready" && reservations.length > 0 && shown.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">조건에 맞는 예매 관객이 없어요.</p> : null}

      {shown.length > 0 ? (
        <>
          {/* 화면 폭이 아니라 이 카드 폭으로 나눈다. 데스크톱이라도 오른쪽 요약 카드 때문에 좁으면 카드처럼 쌓는다. */}
          <div className="hidden items-center border-b border-border-soft text-xs font-semibold text-muted @min-[42rem]:flex">
            <label className={`flex h-11 w-14 shrink-0 items-center justify-center ${shownConfirmed.length ? "cursor-pointer" : "opacity-50"}`}>
              <span className="sr-only">보이는 확정 예매 모두 선택</span>
              <SelectAllCheckbox {...selectAll} onChange={toggleAllShown} />
            </label>
            <div aria-hidden="true" className={`grid min-w-0 flex-1 gap-x-3 py-2 pl-1 pr-5 ${ROW_COLUMNS}`}>
              <span>예매번호·시각</span><span>이름</span><span>휴대폰</span><span>매수</span><span>상태</span><span />
            </div>
          </div>
          <ul className="divide-y divide-border-soft">
            {shown.map((item) => (
              <ReservationRow
                key={item.id}
                reservation={item}
                selected={selectedIds.has(item.id)}
                expanded={expandedIds.has(item.id)}
                opened={openedIds.has(item.id)}
                remainingSeats={remainingSeats}
                onToggleSelected={() => toggle(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                onUpdated={detailUpdated}
                onCancel={setTarget}
              />
            ))}
          </ul>
        </>
      ) : null}

      {phoneDialog ? (
        <PhoneNumbersDialog
          phones={phoneDialog.phones}
          sessionStartsAt={session.startsAt}
          selectedOnly={phoneDialog.selectedOnly}
          onClose={() => setPhoneDialog(null)}
        />
      ) : null}

      {target ? (
        <ConfirmDialog
          title="예매를 취소할까요?"
          destructive
          busy={canceling}
          confirmLabel="예매 취소"
          onClose={() => setTarget(null)}
          onConfirm={() => void confirmCancel()}
          description={<>
            <strong className="num block text-foreground">{target.code} · {target.bookerName} · {target.ticketCount}매</strong>
            <span className="mt-2 block">{formatShowFullDateTime(session.startsAt)} 회차의 좌석이 다시 예매 가능해집니다. 취소한 예매는 되돌릴 수 없어요.</span>
          </>}
        />
      ) : null}
    </section>
  );
}

/** 줄 전체가 펼치기 버튼이다. 체크박스는 버튼 밖에 두어 선택과 펼치기가 섞이지 않게 한다. */
function ReservationRow({ reservation, selected, expanded, opened, remainingSeats, onToggleSelected, onToggleExpanded, onUpdated, onCancel }: {
  readonly reservation: ProducerReservation;
  readonly selected: boolean;
  readonly expanded: boolean;
  readonly opened: boolean;
  readonly remainingSeats: number;
  readonly onToggleSelected: () => void;
  readonly onToggleExpanded: () => void;
  readonly onUpdated: (reservation: ProducerReservation, kind: "tickets" | "memo") => void;
  readonly onCancel: (reservation: ProducerReservation) => void;
}) {
  const canceled = reservation.status === "CANCELED";
  const rowTone = selected ? "bg-brand-soft" : expanded ? "bg-surface" : "";
  const textTone = canceled ? "text-muted" : "";
  return (
    <li>
      <div className={`flex items-stretch transition-colors ${rowTone}`}>
        <div className="flex w-14 shrink-0 items-start justify-center pt-1.5 @min-[42rem]:items-center @min-[42rem]:pt-0">
          {canceled ? null : (
            <label className="flex h-11 w-11 cursor-pointer items-center justify-center">
              <input type="checkbox" checked={selected} onChange={onToggleSelected} aria-label={`${reservation.bookerName} ${reservation.code} 선택`} className={CHECKBOX_CLASS} />
            </label>
          )}
        </div>
        <button
          type="button"
          id={summaryId(reservation.id)}
          aria-expanded={expanded}
          aria-controls={opened ? panelId(reservation.id) : undefined}
          onClick={onToggleExpanded}
          className={`min-w-0 flex-1 cursor-pointer py-3 pl-1 pr-4 text-left hover:bg-brand-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand @min-[42rem]:pr-5 ${textTone}`}
        >
          {/* 좁은 카드: 예매번호·상태 / 이름·매수·메모 표시 / 휴대폰 */}
          <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 @min-[42rem]:hidden">
            <span className="num text-sm font-bold tracking-[0.06em]">{reservation.code}</span>
            <span className="flex items-center gap-1 justify-self-end">
              <ReservationStatusText reservation={reservation} />
              <Chevron open={expanded} />
            </span>
            <span className="col-span-2 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span>{reservation.bookerName} · <span className="num">{reservation.ticketCount}매</span></span>
              {reservation.memo ? <MemoBadge /> : null}
            </span>
            <span className="num col-span-2 mt-0.5 text-sm text-muted-strong">{reservation.bookerPhone}</span>
          </span>
          {/* 넓은 카드: 머리글과 같은 칸 */}
          <span className={`hidden items-center gap-x-3 text-sm @min-[42rem]:grid ${ROW_COLUMNS}`}>
            <span className="min-w-0">
              <span className="num block font-semibold tracking-[0.06em]">{reservation.code}</span>
              <span className="num block text-xs text-muted">{formatShowDateTime(reservation.createdAt)}</span>
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate">{reservation.bookerName}</span>
              {reservation.memo ? <MemoBadge /> : null}
            </span>
            <span className="num">{reservation.bookerPhone}</span>
            <span className="num">{reservation.ticketCount}매</span>
            <ReservationStatusText reservation={reservation} />
            <Chevron open={expanded} />
          </span>
        </button>
      </div>
      {opened ? (
        <div id={panelId(reservation.id)} hidden={!expanded}>
          <ReservationDetailPanel reservation={reservation} remainingSeats={remainingSeats} onUpdated={onUpdated} onCancel={onCancel} />
        </div>
      ) : null}
    </li>
  );
}

function withoutIds(current: ReadonlySet<number>, ids: readonly number[]): ReadonlySet<number> {
  const next = new Set(current);
  for (const id of ids) next.delete(id);
  return next;
}

/** 일부만 골랐을 때는 체크박스를 "일부 선택" 상태로 보여 준다. */
function SelectAllCheckbox({ checked, indeterminate, disabled, onChange }: {
  readonly checked: boolean;
  readonly indeterminate: boolean;
  readonly disabled: boolean;
  readonly onChange: () => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      ref={(element) => { if (element) element.indeterminate = indeterminate; }}
      className={`${CHECKBOX_CLASS} disabled:cursor-not-allowed`}
    />
  );
}

function ReservationStatusText({ reservation }: { readonly reservation: ProducerReservation }) {
  return reservation.status === "CONFIRMED"
    ? <span className="whitespace-nowrap text-sm font-semibold text-brand">확정</span>
    : <span className="whitespace-nowrap text-sm font-semibold text-muted">취소됨</span>;
}

/** 메모가 있는 관객 표시. 주황은 작은 글자 대비가 낮아 테두리·아이콘에만 쓰고 글자는 본문색으로 둔다. */
function MemoBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warn/40 bg-warn-bg px-2 py-0.5 text-xs font-semibold text-foreground">
      <NoteIcon className="h-3.5 w-3.5 text-warn" />
      메모<span className="sr-only"> 있음</span>
    </span>
  );
}

function NoteIcon({ className }: { readonly className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3.5 2.5h6l3 3v8h-9z" />
      <path d="M9.5 2.5v3h3M5.5 8.5h5M5.5 11h3.5" />
    </svg>
  );
}

function Chevron({ open }: { readonly open: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`h-5 w-5 shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  );
}
