"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * ModalShell은 onClose가 바뀔 때마다 포커스를 다시 잡아서, 입력할 때마다 새 함수를 넘기면 입력 칸의 포커스가 빠진다.
 * 최신 onClose와 차단 여부를 참조로 읽는 고정된 닫기 함수를 돌려준다. blocked가 참(저장·예매 중)이면 닫지 않는다.
 */
export function useModalClose(onClose: () => void, blocked: boolean) {
  const latest = useRef({ onClose, blocked });
  useEffect(() => {
    latest.current = { onClose, blocked };
  });
  return useCallback(() => {
    if (!latest.current.blocked) latest.current.onClose();
  }, []);
}
