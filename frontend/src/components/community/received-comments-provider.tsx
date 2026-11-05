"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { InboxContext } from "./received-comments-context";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { getNotifications, readNotification } from "@/features/community/api";
import type { CommunityNotice } from "@/features/community/types";

type Notices = readonly CommunityNotice[];
type Owner = { readonly actor: string | false };
type Snapshot = { scope: Owner; items: Notices | null; error: string };
function failedSnapshot(current: Snapshot | null, scope: Owner, cause: unknown): Snapshot {
  let items = current?.items ?? null;
  if (current?.scope !== scope) items = null;
  if (cause instanceof AuditionRequestError && [401, 403].includes(cause.status)) items = null;
  return { scope, items, error: "받은 댓글을 불러오지 못했어요." };
}

function seenNotice(item: CommunityNotice, id: number) {
  if (item.commentId === id) return { ...item, seen: true };
  return item;
}

export function ReceivedCommentsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuthSession();
  const actor = session?.role === "APPLICANT" && session.credential;
  const [state, setState] = useState<Snapshot | null>(null);
  const owner = useMemo(() => ({ actor }), [actor]);
  const active = useRef<Owner | null>(null);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(() => {
    if (active.current !== owner || document.hidden) return;
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    void getNotifications(request.signal).then(items => {
      if (!request.signal.aborted) setState({ scope: owner, items, error: "" });
    }).catch(cause => {
      if (!request.signal.aborted) setState(current => failedSnapshot(current, owner, cause));
    });
  }, [owner]);
  useEffect(() => {
    if (!owner.actor) return;
    active.current = owner;
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active.current = null;
      pending.current?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [owner, refresh]);
  async function markRead(id: number) {
    if (active.current !== owner) return false;
    await readNotification(id);
    if (active.current !== owner) return false;
    pending.current?.abort();
    setState(current => {
      if (!current?.items || current.scope !== owner) return current;
      return { ...current, items: current.items.map(item => seenNotice(item, id)) };
    });
    refresh();
    return true;
  }
  let current: Snapshot | null = null;
  if (state?.scope === owner) current = state;
  return <InboxContext value={{ items: current?.items ?? null, error: current?.error ?? "", refresh, markRead }}>{children}</InboxContext>;
}
