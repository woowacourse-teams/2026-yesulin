"use client";

import { useCallback, useEffect, useState } from "react";
import { getPublicShow } from "@/features/shows/api";
import type { PublicShow, ReservationReceipt } from "@/features/shows/types";
import { PublicShowDetail } from "./public-show-detail";
import { ReservationComplete } from "./reservation-complete";
import { PublicScreen } from "@/components/landing/public-screen";
import { ContentSkeleton } from "@/components/ui/content-state";
import { ScreenError } from "@/components/auditions/screen-status";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { ShowUnavailable } from "./show-status";

export function PublicShowRoute({ showId, initialShow }: {
  readonly showId: string;
  readonly initialShow: PublicShow | null;
}) {
  const [show, setShow] = useState(initialShow);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(initialShow ? "ready" : "loading");
  const [reloadToken, setReloadToken] = useState(0);
  const [receipt, setReceipt] = useState<ReservationReceipt | null>(null);

  /** 잔여석은 계속 바뀌므로 예매 실패나 완료 뒤에 다시 읽는다. */
  const refresh = useCallback(async () => {
    try {
      const next = await getPublicShow(showId);
      setShow(next);
      setState("ready");
    } catch (cause) {
      console.error("[공개 공연 조회 실패]", cause);
      setState((current) => cause instanceof AuditionRequestError && cause.status === 404 ? "missing" : current === "ready" ? current : "error");
    }
  }, [showId]);

  useEffect(() => {
    if (initialShow && reloadToken === 0) return;
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
        setState(cause instanceof AuditionRequestError && cause.status === 404 ? "missing" : "error");
      });
    return () => { active = false; };
  }, [initialShow, showId, reloadToken]);

  if (state === "loading") return <ShowDetailLoading />;
  if (state === "error") return <PublicScreen backHref="/shows" backLabel="공연 목록"><ScreenError message="공연 정보를 불러오지 못했어요." onRetry={() => { setState("loading"); setReloadToken((value) => value + 1); }} /></PublicScreen>;
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
    <PublicScreen backHref="/shows" backLabel="공연 목록">
      <ContentSkeleton label="공연 정보 불러오는 중">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
          <div className="aspect-[3/4] rounded-card bg-border-soft" />
          <div>
            <div className="h-8 w-2/3 rounded bg-border-soft" />
            <div className="mt-4 h-5 w-1/2 rounded bg-border-soft" />
          </div>
        </div>
        <div className="mt-8 h-48 rounded-card bg-border" />
        </ContentSkeleton>
    </PublicScreen>
  );
}
