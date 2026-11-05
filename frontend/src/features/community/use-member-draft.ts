"use client";

import { useState } from "react";
import { readCommunityDraft, removeCommunityDraft, saveCommunityDraft, type MemberDraft } from "./member-draft";
import type { CommunityAuthorMode } from "./types";

export function useMemberDraft(scope: string, member: number, fixedMode: CommunityAuthorMode | null = null, initial = { title: "", body: "" }) {
  const [draft, setDraft] = useState<MemberDraft>(() => initialDraft(scope, member, fixedMode, initial));
  const [storageError, setStorageError] = useState("");
  const change = (patch: Partial<MemberDraft>) => {
    const next = { ...draft, ...patch, requestId: crypto.randomUUID() };
    try { saveCommunityDraft(scope, member, next); setStorageError(""); }
    catch { setStorageError("초안을 보관할 수 없어요. 로그인 화면으로 이동하기 전에 내용을 복사해 주세요."); }
    setDraft(next);
  };
  const clear = () => removeCommunityDraft(scope, member);
  return { draft, change, clear, storageError };
}

function initialDraft(scope: string, member: number, mode: CommunityAuthorMode | null, initial: { title: string; body: string }): MemberDraft {
  const stored = readCommunityDraft(scope, member);
  if (stored && mode && stored.authorMode !== mode) return { ...stored, authorMode: mode, requestId: crypto.randomUUID() };
  if (stored) return stored;
  return { ...initial, authorMode: mode ?? "ANONYMOUS", requestId: crypto.randomUUID() };
}
