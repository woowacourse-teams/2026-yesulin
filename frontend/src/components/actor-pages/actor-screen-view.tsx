"use client";

import { useEffect, useRef } from "react";
import { ANALYTICS_READY_EVENT } from "@/features/analytics/consent";
import { trackActorScreenView, type ActorScreenName } from "@/features/analytics/events";

/** 공개 화면을 읽고 분석 초기화가 끝난 뒤 한 번 보낸다. 꺼진 분석을 다시 켜면 그때 재시도한다. */
export function ActorScreenView({ screen }: { readonly screen: ActorScreenName }) {
  const sent = useRef(false);

  useEffect(() => {
    const send = () => {
      if (!sent.current) sent.current = trackActorScreenView(screen);
    };
    window.addEventListener(ANALYTICS_READY_EVENT, send);
    send();
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, send);
  }, [screen]);

  return null;
}
