"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicShow } from "@/features/shows/api";
import type { PublicShow, ReservationReceipt } from "@/features/shows/types";
import { PublicShowDetail } from "./public-show-detail";
import { ReservationComplete } from "./reservation-complete";
import { ShowPageHeader } from "./show-page-header";
import { ShowUnavailable } from "./show-status";

export function PublicShowRoute({ showId, initialShow }: {
  readonly showId: string;
  readonly initialShow: PublicShow | null;
}) {
  const [show, setShow] = useState(initialShow);
  const [state, setState] = useState<"loading" | "ready" | "missing">(initialShow ? "ready" : "loading");
  const [receipt, setReceipt] = useState<ReservationReceipt | null>(null);

  /** 잔여석은 계속 바뀌므로 예매 실패나 완료 뒤에 다시 읽는다. */
  const refresh = useCallback(async () => {
    try {
      const next = await getPublicShow(showId);
      setShow(next);
      setState("ready");
    } catch (cause) {
      console.error("[공개 공연 조회 실패]", cause);
      setState((current) => current === "ready" ? current : "missing");
    }
  }, [showId]);

  useEffect(() => {
    if (initialShow) return;
    let active = true;
    getPublicShow(showId)
      .then((next) => {
        if (!active) return;
        setShow(next);
        setState("ready");
      })
      .catch((cause) => {
        if (!active) return;
        console.error("[공개 공연 조회 실패]", cause);
        setState("missing");
      });
    return () => { active = false; };
  }, [initialShow, showId]);

  if (state === "loading") return <ShowDetailLoading />;
  if (state === "missing" || !show) return <ShowUnavailable />;
  if (receipt) {
    return (
      <ReservationComplete
        show={show}
        receipt={receipt}
        onBack={() => { setReceipt(null); void refresh(); }}
      />
    );
  }
  return <PublicShowDetail show={show} onReserved={setReceipt} onStale={refresh} />;
}

function ShowDetailLoading() {
  return (
    <main aria-label="공연 정보 불러오는 중" className="min-h-screen bg-surface text-foreground">
      <ShowPageHeader />
      <div className="mx-auto max-w-[880px] animate-pulse px-5 py-8 md:px-8 min-[1200px]:max-w-[1200px]">
        <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div className="aspect-[3/4] rounded-card bg-border-soft" />
          <div>
            <div className="h-8 w-2/3 rounded bg-border-soft" />
            <div className="mt-4 h-5 w-1/2 rounded bg-border-soft" />
          </div>
        </div>
        <div className="mt-8 h-48 rounded-card bg-border" />
        <p className="sr-only">공연 정보를 불러오고 있습니다.</p>
      </div>
    </main>
  );
}
