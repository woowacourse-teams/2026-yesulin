"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CommunityEntry, CommunityPage } from "./types";
import { communityDraftNavigation } from "./draft-navigation";

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
  const update = (id: number, change: Partial<CommunityEntry>) => {
    setItems(previous => previous.map(entry => {
      if (entry.id === id) return { ...entry, ...change };
      return entry;
    }));
  };
  return { items, cursor, loading, error, load, update };
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
    return communityDraftNavigation().register();
  }, [dirty]);
}
