"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";

const TOAST_DURATION_MS = 2400;

const ToastContext = createContext<((message: string) => void) | null>(null);

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast는 ToastProvider 안에서만 쓸 수 있습니다.");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-[88px] left-1/2 z-90 max-w-[88vw] -translate-x-1/2 rounded-[7px] bg-foreground px-4 py-2.5 text-center text-[13px] text-white transition-opacity duration-200 lg:left-[calc(50%+var(--sidebar-width)/2)] ${
          message ? "opacity-100" : "opacity-0"
        }`}
      >
        {message}
      </div>
    </ToastContext>
  );
}
