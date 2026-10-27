"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityEntry, CommunityPage } from "./types";

export function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "잠시 후 다시 시도해 주세요.";
}

export function useCommunityAction() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(operation: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    await operation().catch(cause => setError(errorMessage(cause)));
    running.current = false;
    setBusy(false);
  }
  return { busy, error, run };
}

export function useCommunityFeed(loader: (cursor?: number) => Promise<CommunityPage>, initial: CommunityPage | null = null) {
  const [items, setItems] = useState<readonly CommunityEntry[]>(initial?.items ?? []);
  const [cursor, setCursor] = useState<number | null>(initial?.nextCursor ?? null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const fetchPage = useCallback(async (next?: number, replace = false) => {
    const current = ++generation.current;
    try {
      const page = await loader(next);
      if (current !== generation.current) return;
      setItems(previous => mergePage(previous, page.items, next, replace));
      setCursor(page.nextCursor);
      setError("");
    } catch (cause) {
      if (current === generation.current) setError(errorMessage(cause));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [loader]);
  const load = useCallback((next?: number, replace = false) => {
    setLoading(true);
    setError("");
    return fetchPage(next, replace);
  }, [fetchPage]);
  useEffect(() => {
    if (initial) return;
    const requests = generation;
    const current = ++requests.current;
    loader().then(page => {
      if (current !== requests.current) return;
      setItems(page.items); setCursor(page.nextCursor); setError(""); setLoading(false);
    }).catch(cause => {
      if (current !== requests.current) return;
      setError(errorMessage(cause)); setLoading(false);
    });
    return () => { requests.current++; };
  }, [loader, initial]);
  return { items, cursor, loading, error, load };
}

function mergePage(previous: readonly CommunityEntry[], incoming: readonly CommunityEntry[], cursor?: number, replace = false) {
  if (!cursor || replace) return incoming;
  const entries = new Map(previous.map(entry => [entry.id, entry]));
  incoming.forEach(entry => entries.set(entry.id, entry));
  return [...entries.values()];
}

export function useDraftGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", confirmDraftNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", confirmDraftNavigation, true);
    };
  }, [dirty]);
}

function confirmDraftNavigation(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a");
  if (!link || link.target === "_blank" || link.getAttribute("href")?.startsWith("#")) return;
  if (window.confirm("작성 중인 내용이 사라져요. 이동할까요?")) return;
  event.preventDefault();
  event.stopPropagation();
}
