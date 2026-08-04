"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

type Settled<T> = {
  /** 이 결과가 어느 조회의 것인지. 현재 key와 다르면 아직 불러오는 중이다. */
  readonly key: string;
  readonly data: T | null;
  readonly error: string;
};

/**
 * 화면 하나가 필요로 하는 조회 한 건. key가 바뀔 때만 다시 불러오고,
 * 뒤늦게 도착한 응답이 최신 화면을 덮어쓰지 않도록 버린다.
 */
export function useScreeningQuery<T>(key: string, load: () => Promise<T>, fallbackMessage: string) {
  const [reloadToken, setReloadToken] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ key: "", data: null, error: "" });
  const loadRef = useRef(load);

  const requestKey = `${key}#${reloadToken}`;

  // 이펙트는 등록 순서대로 실행되므로 아래 조회 이펙트는 항상 최신 loader를 본다.
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;

    loadRef
      .current()
      .then((data) => {
        if (active) setSettled({ key: requestKey, data, error: "" });
      })
      .catch((cause: unknown) => {
        if (active) setSettled({ key: requestKey, data: null, error: errorMessage(cause, fallbackMessage) });
      });

    return () => {
      active = false;
    };
  }, [requestKey, fallbackMessage]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);
  const fresh = settled.key === requestKey;

  return {
    data: fresh ? settled.data : null,
    error: fresh ? settled.error : "",
    loading: !fresh,
    reload,
  };
}
