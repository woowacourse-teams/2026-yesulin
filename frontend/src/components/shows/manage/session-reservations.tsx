"use client";

import { useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { formatShowDateTime, formatShowFullDateTime } from "@/features/shows/format";
import { cancelReservation, getSessionReservations } from "@/features/shows/producer-api";
import type { ProducerReservation, ProducerShowSession } from "@/features/shows/types";
import { ConfirmDialog } from "./confirm-dialog";

type ReservationsState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly reservations: readonly ProducerReservation[] };

/** 선택한 회차의 예매자. 관객이 전화로 취소를 요청하면 예매번호·이름·번호로 찾아 취소한다. */
export function SessionReservations({ showId, session, onChanged }: {
  readonly showId: string;
  readonly session: ProducerShowSession;
  readonly onChanged: () => void;
}) {
  const toast = useToast();
  const [state, setState] = useState<ReservationsState>({ status: "loading" });
  const [reloadToken, setReloadToken] = useState(0);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<ProducerReservation | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    let active = true;
    getSessionReservations(showId, session.id)
      .then((reservations) => { if (active) setState({ status: "ready", reservations }); })
      .catch((cause) => {
        console.error("[회차 예매자 조회 실패]", cause);
        if (active) setState({ status: "error", message: cause instanceof Error ? cause.message : "예매자를 불러오지 못했습니다." });
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
  const normalizedQuery = query.replaceAll("-", "").trim().toLowerCase();
  const shown = normalizedQuery
    ? reservations.filter((item) => `${item.code} ${item.bookerName} ${item.bookerPhone.replaceAll("-", "")}`.toLowerCase().includes(normalizedQuery))
    : reservations;

  return (
    <section aria-labelledby="session-reservations-title" className="rounded-card border border-border bg-card">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-soft px-5 py-4">
        <div>
          <h2 id="session-reservations-title" className="text-base font-bold">예매자 · <span className="num">{formatShowDateTime(session.startsAt)}</span></h2>
          <p className="num mt-1 text-sm text-muted-strong">
            확정 {confirmed.length}건 · {confirmed.reduce((sum, item) => sum + item.ticketCount, 0)}매 / 정원 {session.capacity}석
          </p>
        </div>
        <label className="w-full max-w-xs text-sm font-semibold text-muted-strong">
          <span className="sr-only">예매자 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예매번호, 이름, 휴대폰 뒷자리"
            className="min-h-11 w-full rounded-control border border-border bg-card px-3 text-base md:text-sm"
          />
        </label>
      </div>

      {state.status === "loading" ? <p role="status" className="px-5 py-10 text-center text-sm text-muted">예매자를 불러오는 중…</p> : null}
      {state.status === "error" ? <div className="p-5"><ScreenError message={state.message} onRetry={reload} /></div> : null}
      {state.status === "ready" && reservations.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">아직 예매한 관객이 없어요.</p> : null}
      {state.status === "ready" && reservations.length > 0 && shown.length === 0 ? <p className="px-5 py-10 text-center text-sm text-muted">검색 결과가 없어요.</p> : null}

      {shown.length > 0 ? (
        <>
          <table className="hidden w-full text-left text-sm md:table">
            <thead className="border-b border-border-soft text-xs text-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">예매번호</th>
                <th scope="col" className="px-3 py-3 font-semibold">이름</th>
                <th scope="col" className="px-3 py-3 font-semibold">휴대폰</th>
                <th scope="col" className="px-3 py-3 font-semibold">매수</th>
                <th scope="col" className="px-3 py-3 font-semibold">예매 시각</th>
                <th scope="col" className="px-3 py-3 font-semibold">상태</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">작업</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft">
              {shown.map((item) => (
                <tr key={item.id} className={item.status === "CANCELED" ? "text-muted" : ""}>
                  <td className="num px-5 py-3 font-semibold tracking-[0.06em]">{item.code}</td>
                  <td className="px-3 py-3">{item.bookerName}</td>
                  <td className="num px-3 py-3"><a href={`tel:${item.bookerPhone.replaceAll("-", "")}`} className="hover:text-brand hover:underline">{item.bookerPhone}</a></td>
                  <td className="num px-3 py-3">{item.ticketCount}매</td>
                  <td className="num px-3 py-3">{formatShowDateTime(item.createdAt)}</td>
                  <td className="px-3 py-3"><ReservationStatusText reservation={item} /></td>
                  <td className="px-5 py-3 text-right">{item.status === "CONFIRMED" ? <CancelButton onClick={() => setTarget(item)} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-border-soft md:hidden">
            {shown.map((item) => (
              <li key={item.id} className={`px-5 py-4 ${item.status === "CANCELED" ? "text-muted" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="num text-base font-bold tracking-[0.06em]">{item.code}</p>
                    <p className="mt-1 text-base">{item.bookerName} · <span className="num">{item.ticketCount}매</span></p>
                    <a href={`tel:${item.bookerPhone.replaceAll("-", "")}`} className="num mt-1 inline-flex min-h-11 items-center text-base text-brand">{item.bookerPhone}</a>
                  </div>
                  <ReservationStatusText reservation={item} />
                </div>
                {item.status === "CONFIRMED" ? <div className="mt-2"><CancelButton onClick={() => setTarget(item)} /></div> : null}
              </li>
            ))}
          </ul>
        </>
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

function ReservationStatusText({ reservation }: { readonly reservation: ProducerReservation }) {
  return reservation.status === "CONFIRMED"
    ? <span className="whitespace-nowrap text-sm font-semibold text-pass">확정</span>
    : <span className="whitespace-nowrap text-sm font-semibold text-muted">취소됨</span>;
}

function CancelButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-control border border-fail/30 px-3 text-sm font-semibold text-fail hover:bg-fail-bg">
      예매 취소
    </button>
  );
}
