"use client";

import { useEffect, useState } from "react";
import { completeAppointment } from "@/features/auditions/notice-message";
import { noticeApi, type NoticeCommand, type NoticePreview } from "@/features/auditions/notice-api";

export function useNoticePreview(api: ReturnType<typeof noticeApi>, command: NoticeCommand | null, enabled: boolean, revision: number) {
  const signature = `${revision}:${JSON.stringify(command)}`;
  const complete = !!command?.recipients.length && command.recipients.every(r => completeAppointment(r.appointment));
  const [result, setResult] = useState<{ signature: string; preview: NoticePreview | null; error: string } | null>(null);
  useEffect(() => {
    if (!enabled || !command || !complete) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const preview = await api.preview(command);
        if (!cancelled) setResult({ signature, preview, error: "" });
      } catch (cause) {
        if (!cancelled) setResult({ signature, preview: null, error: cause instanceof Error ? cause.message : "발송 정보를 확인하지 못했습니다." });
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [api, command, complete, enabled, signature]);
  const current = enabled && result?.signature === signature ? result : null;
  return { preview: current?.preview ?? null, error: current?.error ?? "", loading: enabled && complete && !current, complete };
}
