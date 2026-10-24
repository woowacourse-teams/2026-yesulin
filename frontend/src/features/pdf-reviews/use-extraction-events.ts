import { useEffect, useRef, useState } from "react";

const EVENTS_URL = "/api/v1/pdf-extractions/events";

export type ExtractionEventsState = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

type Options = {
  readonly enabled: boolean;
  /** 값이 바뀌면 연결을 닫고 다시 연다. 수동 새로고침이 끊긴 연결을 되살릴 때 쓴다. */
  readonly reconnectKey: number;
  /** 연결·재연결과 추출 완료마다 DB 기준으로 화면을 다시 맞춘다. 완료된 jobId가 있으면 함께 받는다. */
  readonly sync: (completedJobIds: readonly string[]) => Promise<void>;
};

function readJobId(data: unknown) {
  if (typeof data !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return typeof parsed === "object" && parsed !== null && "jobId" in parsed && typeof parsed.jobId === "string" ? parsed.jobId : null;
  } catch { return null; }
}

/** 로그인한 화면에서만 추출 완료 이벤트를 구독한다. 이벤트는 신호일 뿐이므로 놓친 변경은 sync의 DB 조회로 복구한다. */
export function usePdfExtractionEvents({ enabled, reconnectKey, sync }: Options) {
  const [state, setState] = useState<ExtractionEventsState>("CONNECTING");
  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; });

  useEffect(() => {
    if (!enabled || typeof EventSource === "undefined") return;
    let active = true;
    let running = false;
    let requested = 0;
    let handled = 0;
    const completed = new Set<string>();

    // 동기화가 진행 중이면 요청을 한 번으로 합쳐 직렬로 실행한다.
    async function request(jobId?: string | null) {
      if (jobId) completed.add(jobId);
      requested += 1;
      if (running) return;
      running = true;
      try {
        while (active && handled < requested) {
          handled = requested;
          const ids = [...completed];
          completed.clear();
          await syncRef.current(ids).catch(() => {});
        }
      } finally { running = false; }
    }

    const source = new EventSource(EVENTS_URL);
    source.onopen = () => { setState("CONNECTED"); void request(); };
    source.addEventListener("connected", () => setState("CONNECTED"));
    source.addEventListener("completed", event => void request(readJobId((event as MessageEvent).data)));
    source.onerror = () => setState(source.readyState === EventSource.CLOSED ? "DISCONNECTED" : "CONNECTING");
    return () => { active = false; source.close(); };
  }, [enabled, reconnectKey]);

  return state;
}
