"use client";

import { useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
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

type ReservationsState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly reservations: readonly ProducerReservation[] };

const CHECKBOX_CLASS = "h-5 w-5 shrink-0 cursor-pointer accent-brand";

/**
 * 선택한 회차의 예매 관객. 관객이 전화로 취소를 요청하면 예매번호·이름·번호로 찾아 취소하고,
 * 문자 안내용 전화번호 복사와 현장 명단용 엑셀 다운로드를 제공한다. 취소된 예매는 복사·엑셀에서 뺀다.
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
  const [target, setTarget] = useState<ProducerReservation | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(() => new Set());
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

  const confirmCancel = async () => {
    if (!target) return;
    setCanceling(true);
    try {
      const canceled = await cancelReservation(target.id);
      setState((current) => current.status === "ready"
        ? { status: "ready", reservations: current.reservations.map((item) => item.id === canceled.id ? canceled : item) }
        : current);
      setSelectedIds((current) => withoutIds(current, [canceled.id]));
      toast(`${canceled.bookerName}님의 ${canceled.ticketCount}매 예매를 취소했어요.`, { type: "success" });
      setTarget(null);
      onChanged();
    } catch (cause) {
      toast(cause instanceof AuditionRequestError ? cause.message : "예매를 취소하지 못했습니다. 다시 시도해 주세요.", { type: "error" });
    } finally {
      setCanceling(false);
    }
  };

  const reservations = state.status === "ready" ? state.reservations : [];
  const confirmed = reservations.filter((item) => item.status === "CONFIRMED");
  const confirmedPhones = confirmedPhoneNumbers(confirmed);
  const selected = confirmed.filter((item) => selectedIds.has(item.id));
  const normalizedQuery = query.replaceAll("-", "").trim().toLowerCase();
  const shown = normalizedQuery
    ? reservations.filter((item) => `${item.code} ${item.bookerName} ${item.bookerPhone.replaceAll("-", "")}`.toLowerCase().includes(normalizedQuery))
    : reservations;
  const shownConfirmed = shown.filter((item) => item.status === "CONFIRMED");
  const allShownSelected = shownConfirmed.length > 0 && shownConfirmed.every((item) => selectedIds.has(item.id));
  const someShownSelected = shownConfirmed.some((item) => selectedIds.has(item.id));

  const toggle = (id: number) => setSelectedIds((current) => current.has(id) ? withoutIds(current, [id]) : new Set([...current, id]));
  // 검색 중이면 보이는 확정 예매만 한꺼번에 고르거나 푼다.
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
      saveBlob(createXlsxBlob(reservationSheet(reservations, session.startsAt)), reservationFileName(showTitle, session.startsAt));
      toast(`확정 예매 ${confirmed.length}건으로 엑셀 파일을 만들었어요.`, { type: "success" });
    } catch (cause) {
      console.error("[예매 관객 명단 엑셀 만들기 실패]", cause);
      toast("엑셀 파일을 만들지 못했어요. 다시 시도해 주세요.", { type: "error" });
    }
  };

  return (
    <section aria-labelledby="session-reservations-title" className="@container rounded-card border border-border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div>
          <h2 id="session-reservations-title" className="text-base font-bold">예매 관객 · <span className="num">{formatShowDateTime(session.startsAt)}</span></h2>
          <p className="num mt-1 text-sm text-muted-strong">
            확정 {confirmed.length}건 · {confirmed.reduce((sum, item) => sum + item.ticketCount, 0)}매 / 정원 {session.capacity}석
          </p>
        </div>
        <label className="w-full max-w-xs text-sm font-semibold text-muted-strong">
          <span className="sr-only">예매 관객 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예매번호, 이름, 휴대폰 뒷자리"
            className="min-h-11 w-full rounded-control border border-border bg-card px-3 text-base md:text-sm"
          />
        </label>
      </div>

      {state.status === "ready" && confirmed.length > 0 ? (
        <div role="toolbar" aria-label="예매 관객 명단 내보내기" className="flex flex-wrap items-center gap-2 border-b border-border-soft px-5 py-3">
          <label className={`inline-flex min-h-11 items-center gap-2 pr-1 text-sm font-semibold text-muted-strong @min-[42rem]:hidden ${shownConfirmed.length ? "cursor-pointer" : "opacity-50"}`}>
            <SelectAllCheckbox checked={allShownSelected} indeterminate={!allShownSelected && someShownSelected} disabled={!shownConfirmed.length} onChange={toggleAllShown} />
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
      {state.status === "ready" && reservations.length > 0 && shown.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">검색 결과가 없어요.</p> : null}

      {shown.length > 0 ? (
        <>
          {/* 화면 폭이 아니라 이 카드 폭으로 나눈다. 데스크톱이라도 오른쪽 요약 카드 때문에 좁으면 카드 목록을 쓴다. */}
          <div className="hidden overflow-x-auto @min-[42rem]:block">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead className="border-b border-border-soft text-xs text-muted">
                <tr>
                  <th scope="col" className="w-12 py-1 pl-2">
                    <label className={`flex h-11 w-11 items-center justify-center ${shownConfirmed.length ? "cursor-pointer" : "opacity-50"}`}>
                      <span className="sr-only">보이는 확정 예매 모두 선택</span>
                      <SelectAllCheckbox checked={allShownSelected} indeterminate={!allShownSelected && someShownSelected} disabled={!shownConfirmed.length} onChange={toggleAllShown} />
                    </label>
                  </th>
                  <th scope="col" className="px-2 py-3 font-semibold">예매번호</th>
                  <th scope="col" className="px-2 py-3 font-semibold">이름</th>
                  <th scope="col" className="px-2 py-3 font-semibold">휴대폰</th>
                  <th scope="col" className="px-2 py-3 font-semibold">매수</th>
                  <th scope="col" className="px-2 py-3 font-semibold">예매 시각</th>
                  <th scope="col" className="py-3 pl-2 pr-5 text-right font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((item) => (
                  <tr key={item.id} className={item.status === "CANCELED" ? "text-muted" : selectedIds.has(item.id) ? "bg-brand-soft" : ""}>
                    <td className="py-1 pl-2">
                      {item.status === "CONFIRMED" ? (
                        <label className="flex h-11 w-11 cursor-pointer items-center justify-center">
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} aria-label={`${item.bookerName} ${item.code} 선택`} className={CHECKBOX_CLASS} />
                        </label>
                      ) : null}
                    </td>
                    <td className="num px-2 py-3 font-semibold tracking-[0.06em]">{item.code}</td>
                    <td className="px-2 py-3">{item.bookerName}</td>
                    <td className="num px-2 py-3">{item.bookerPhone}</td>
                    <td className="num px-2 py-3">{item.ticketCount}매</td>
                    <td className="num px-2 py-3">{formatShowDateTime(item.createdAt)}</td>
                    {/* 칸을 아끼려고 상태와 취소 버튼을 한 칸에 둔다. */}
                    <td className="py-2 pl-2 pr-5">
                      <div className="flex items-center justify-end gap-6">
                        <ReservationStatusText reservation={item} />
                        {item.status === "CONFIRMED" ? <CancelButton onClick={() => setTarget(item)} /> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-border-soft @min-[42rem]:hidden">
            {shown.map((item) => (
              <li key={item.id} className={`flex gap-2 py-4 pl-3 pr-5 ${item.status === "CANCELED" ? "text-muted" : selectedIds.has(item.id) ? "bg-brand-soft" : ""}`}>
                {item.status === "CONFIRMED" ? (
                  <label className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggle(item.id)} aria-label={`${item.bookerName} ${item.code} 선택`} className={CHECKBOX_CLASS} />
                  </label>
                ) : <span aria-hidden="true" className="w-11 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="num text-base font-bold tracking-[0.06em]">{item.code}</p>
                      <p className="mt-1 text-base">{item.bookerName} · <span className="num">{item.ticketCount}매</span></p>
                      <p className="num mt-1 text-base text-muted-strong">{item.bookerPhone}</p>
                    </div>
                    <ReservationStatusText reservation={item} />
                  </div>
                  {item.status === "CONFIRMED" ? <div className="mt-2"><CancelButton onClick={() => setTarget(item)} /></div> : null}
                </div>
              </li>
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

function CancelButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-control border border-fail/30 px-3 text-sm font-semibold text-fail hover:bg-fail-bg">
      예매 취소
    </button>
  );
}
