"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { communityReturnTo } from "@/features/community/navigation";
import { getParticipation } from "@/features/community/api";
import type { CommunityAuthorMode, CommunityParticipation } from "@/features/community/types";
import { AnonymousAvatar, CommunityError } from "./community-ui";

export function CommunityLogin({ returnTo }: { readonly returnTo: string }) {
  return <Link className="community-pill" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>로그인하고 작성하기</Link>;
}

type GateProps = { readonly postId?: number; readonly returnTo?: string; readonly children: (value: CommunityParticipation) => ReactNode };
export function MemberParticipation({ postId, returnTo = communityReturnTo(postId), children }: GateProps) {
  const { session } = useAuthSession();
  const credential = session?.credential ?? "";
  const [state, setState] = useState<{ credential: string; value: CommunityParticipation } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      return getParticipation(postId).then(value => {
      if (current && request === generation) { setState({ credential, value }); setError(""); }
    }).catch(() => { if (current && request === generation) setError("참여 정보를 확인하지 못했어요. 다시 시도해 주세요."); });
    };
    void refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("community:participation-changed", refresh);
    return () => { current = false; window.removeEventListener("focus", refresh); window.removeEventListener("community:participation-changed", refresh); };
  }, [postId, credential]);
  if (error) return <CommunityError message={error} retry={() => window.location.reload()} />;
  if (!state || state.credential !== credential) return <p role="status">참여 정보를 확인하고 있어요.</p>;
  if (state.value.memberId === null) return <div className="community-member-prompt"><CommunityLogin returnTo={returnTo} /></div>;
  if (!state.value.canWrite) return <p className="community-member-prompt">배우 계정으로 글과 댓글을 작성할 수 있어요.</p>;
  return <div key={`${state.value.memberId}:${state.value.fixedMode}`}>{children(state.value)}</div>;
}

type ChoiceProps = { readonly participation: CommunityParticipation; readonly mode: CommunityAuthorMode; readonly onChange: (mode: CommunityAuthorMode) => void };
export function AuthorChoice({ participation, mode, onChange }: ChoiceProps) {
  const profile = participation.profile;
  const anonymous = mode === "ANONYMOUS";
  const locked = participation.fixedMode !== null || (anonymous && !profile?.path);
  const toggle = () => {
    if (anonymous) return onChange("PROFILE");
    onChange("ANONYMOUS");
  };
  return <div className="community-author-choice">
    {mode === "PROFILE" && profile?.path && <Link href={profile.path} className="community-profile-preview">
      <AnonymousAvatar author={profile.name.slice(0, 1)} photoUrl={profile.photoUrl} small /><span>{profile.name}</span></Link>}
    {mode === "PROFILE" && !profile?.path && <span>프로필 비공개</span>}
    {!profile?.path && <Link href="/applicants/profile">배우 페이지 설정</Link>}
    <label><input type="checkbox" checked={anonymous} disabled={locked} onChange={toggle} />익명</label>
  </div>;
}
