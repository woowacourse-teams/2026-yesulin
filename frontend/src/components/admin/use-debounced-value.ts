"use client";

import { useEffect, useState } from "react";

/** 검색어를 칠 때마다 요청하지 않도록 입력이 멈춘 뒤에만 값을 넘긴다. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
