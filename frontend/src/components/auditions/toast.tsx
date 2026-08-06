"use client";

import { createContext, use, useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";
type ToastOptions = { readonly type?: ToastType; readonly duration?: number };
type ShowToast = (message: string, options?: ToastOptions) => void;
type ToastState = { readonly id: number; readonly message: string; readonly type: ToastType };

const DEFAULT_DURATION = { success: 3600, error: 7000, info: 4200 } as const;
const ToastContext = createContext<ShowToast | null>(null);

export function useToast() {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast는 ToastProvider 안에서만 쓸 수 있습니다.");
  return show;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequence = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const show = useCallback<ShowToast>((message, options = {}) => {
    const type = options.type ?? "info";
    const duration = options.duration ?? DEFAULT_DURATION[type];
    sequence.current += 1;
    setToast({ id: sequence.current, message, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = duration > 0 ? setTimeout(() => setToast(null), duration) : null;
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onClose={dismiss} /> : null}
    </ToastContext>
  );
}

const TOAST_TONE = {
  success: "border-pass/35 text-pass",
  error: "border-fail/35 text-fail",
  info: "border-brand-line text-brand",
} as const;

function ToastView({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const isError = toast.type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`toast-enter fixed bottom-[88px] left-1/2 z-90 flex w-[min(440px,calc(100vw-32px))] items-start gap-3 rounded-card border bg-card p-3 pr-2 text-left shadow-[var(--shadow-3)] lg:left-[calc(50%+var(--sidebar-width)/2)] ${TOAST_TONE[toast.type]}`}
    >
      <ToastIcon type={toast.type} />
      <p className="min-w-0 flex-1 py-1.5 text-base font-medium leading-relaxed text-foreground md:text-sm">
        {toast.message}
      </p>
      <button
        type="button"
        aria-label="알림 닫기"
        onClick={onClose}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-muted-strong transition-[background-color,color,transform] duration-150 hover:bg-surface hover:text-foreground active:scale-95"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="m5 5 10 10M15 5 5 15" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  return (
    <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-current/10">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2">
        {type === "success" ? <path d="m4 10 4 4 8-9" /> : null}
        {type === "error" ? <path d="M10 5v6m0 3v1" /> : null}
        {type === "info" ? <path d="M10 9v6m0-10v1" /> : null}
      </svg>
    </span>
  );
}
