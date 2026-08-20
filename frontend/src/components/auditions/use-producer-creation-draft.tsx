"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteProducerCreationDraft,
  PRODUCER_CREATION_DRAFT_DELAY_MS,
  readProducerCreationDraft,
  saveProducerCreationDraft,
} from "@/features/auditions/producer-creation-draft-store";

type DraftStatus = "LOADING" | "IDLE" | "SAVING" | "SAVED" | "RESTORED" | "ERROR";

export function useProducerCreationDraft<T>({ draftKey, value, restore, isEmpty }: {
  readonly draftKey: string;
  readonly value: T;
  readonly restore: (value: T) => void;
  readonly isEmpty: (value: T) => boolean;
}) {
  const serialized = JSON.stringify(value);
  const initialSnapshot = useRef(serialized);
  const persistedSnapshot = useRef<string | null>(null);
  const ready = useRef(false);
  const latestDraft = useRef({ serialized, value, isEmpty });
  const [status, setStatus] = useState<DraftStatus>("LOADING");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    latestDraft.current = { serialized, value, isEmpty };
  }, [isEmpty, serialized, value]);

  useEffect(() => {
    let active = true;
    readProducerCreationDraft<T>(draftKey).then((draft) => {
      if (!active) return;
      if (draft) {
        persistedSnapshot.current = JSON.stringify(draft.value);
        restore(draft.value);
        setSavedAt(draft.updatedAt);
        setStatus("RESTORED");
      } else {
        persistedSnapshot.current = initialSnapshot.current;
        setStatus("IDLE");
      }
      ready.current = true;
    }).catch(() => {
      if (!active) return;
      persistedSnapshot.current = initialSnapshot.current;
      ready.current = true;
      setStatus("ERROR");
    });
    return () => { active = false; };
  }, [draftKey, restore]);

  useEffect(() => {
    if (!ready.current || persistedSnapshot.current === serialized) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setStatus("SAVING");
      const operation = isEmpty(value)
        ? deleteProducerCreationDraft(draftKey).then(() => null)
        : saveProducerCreationDraft(draftKey, value);
      operation.then((nextSavedAt) => {
        if (!active) return;
        persistedSnapshot.current = serialized;
        setSavedAt(nextSavedAt);
        setStatus(nextSavedAt ? "SAVED" : "IDLE");
      }).catch(() => {
        if (active) setStatus("ERROR");
      });
    }, PRODUCER_CREATION_DRAFT_DELAY_MS);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [draftKey, isEmpty, serialized, value]);

  const discard = useCallback(async () => {
    await deleteProducerCreationDraft(draftKey);
    persistedSnapshot.current = serialized;
    setSavedAt(null);
    setStatus("IDLE");
  }, [draftKey, serialized]);

  const flush = useCallback(async () => {
    const latest = latestDraft.current;
    if (!ready.current || persistedSnapshot.current === latest.serialized) return;
    setStatus("SAVING");
    try {
      const nextSavedAt = latest.isEmpty(latest.value) ? await deleteProducerCreationDraft(draftKey).then(() => null) : await saveProducerCreationDraft(draftKey, latest.value);
      persistedSnapshot.current = latest.serialized;
      setSavedAt(nextSavedAt);
      setStatus(nextSavedAt ? "SAVED" : "IDLE");
    } catch (cause) {
      setStatus("ERROR");
      throw cause;
    }
  }, [draftKey]);

  return { status, savedAt, discard, flush };
}

export function ProducerCreationDraftStatus({ status, savedAt }: { readonly status: DraftStatus; readonly savedAt: number | null }) {
  const detail = status === "LOADING" ? "기기에 저장된 작성 내용을 확인하고 있어요."
    : status === "RESTORED" ? "이 기기에 저장된 작성 내용을 불러왔어요."
      : status === "SAVING" ? "변경 내용을 이 기기에 저장하고 있어요."
        : status === "SAVED" && savedAt ? `${formatSavedTime(savedAt)}에 이 기기에 자동 저장됐어요.`
          : status === "ERROR" ? "자동 저장하지 못했습니다. 작성 완료 전 페이지를 닫지 마세요."
            : `입력을 멈추면 ${PRODUCER_CREATION_DRAFT_DELAY_MS / 1000}초 뒤 이 기기에 자동 저장돼요.`;
  const tone = status === "ERROR" ? "border-fail/30 bg-fail-bg text-fail" : "border-brand-line bg-brand-soft text-muted-strong";
  return <p role={status === "ERROR" ? "alert" : "status"} className={`mb-5 rounded-control border px-4 py-3 text-sm leading-6 ${tone}`}><strong>{status === "ERROR" ? "자동 저장 실패" : "작성 내용 자동 저장"}</strong> · {detail}</p>;
}

function formatSavedTime(value: number) {
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(value);
}
