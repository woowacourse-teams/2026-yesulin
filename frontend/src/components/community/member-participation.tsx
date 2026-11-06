"use client";

import Link from "next/link";
import { applicantRoutes } from "@/features/applicants/routes";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { communityReturnTo } from "@/features/community/navigation";
import { getParticipation } from "@/features/community/api";
import type { CommunityAuthorMode, CommunityParticipation } from "@/features/community/types";
import { CommunityPhoto, CommunityError } from "./community-ui";

export function CommunityLogin({ returnTo }: { readonly returnTo: string }) {
  return <Link className="community-pill" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>로그인하고 작성하기</Link>;
}

type GateProps = { readonly postId?: number; readonly returnTo?: string; readonly children: (value: CommunityParticipation) => ReactNode };

/** 같은 화면에서 입력칸 위치가 바뀌어 다시 그려져도 마지막 참여 정보를 바로 보이고 뒤에서 새로 확인한다. */
const recentParticipation = new Map<string, CommunityParticipation>();

function remembered(postId: number | undefined, credential: string) {
  const value = recentParticipation.get(`${postId ?? ""}:${credential}`);
  if (!value) return null;
  return { credential, value };
}

export function MemberParticipation({ postId, returnTo = communityReturnTo(postId), children }: GateProps) {
  const { session } = useAuthSession();
  const credential = session?.credential ?? "";
  const [state, setState] = useState<{ credential: string; value: CommunityParticipation } | null>(() => remembered(postId, credential));
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    let generation = 0;
    const refresh = () => {
      const request = ++generation;
      return getParticipation(postId).then(value => {
      if (current && request === generation) { recentParticipation.set(`${postId ?? ""}:${credential}`, value); setState({ credential, value }); setError(""); }
    }).catch(() => { if (current && request === generation) setError("참여 정보를 확인하지 못했어요. 다시 시도해 주세요."); });
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => { current = false; window.removeEventListener("focus", refresh); };
  }, [postId, credential]);
  if (error) return <CommunityError message={error} retry={() => window.location.reload()} />;
  if (!state || state.credential !== credential) return <p role="status">참여 정보를 확인하고 있어요.</p>;
  if (state.value.memberId === null && !postId) return <div className="community-member-prompt">
    <p>사용하던 소셜 계정으로 빠르게 글쓰기를 시작하세요.</p>
    <CommunityLogin returnTo={returnTo} /><Link className="community-back-link" href="/community">목록으로 돌아가기</Link>
  </div>;
  if (state.value.memberId === null) return <div className="community-member-prompt"><CommunityLogin returnTo={returnTo} /></div>;
  if (!state.value.canWrite) return <p className="community-member-prompt">배우 계정으로 글과 댓글을 작성할 수 있어요.</p>;
  return <div key={state.value.memberId}>{children(state.value)}</div>;
}

type ChoiceProps = { readonly preview?: boolean; readonly participation: CommunityParticipation; readonly mode: CommunityAuthorMode; readonly onChange: (mode: CommunityAuthorMode) => void };
export function AuthorChoice({ participation, mode, onChange, preview = true }: ChoiceProps) {
  const reasonId = useId();
  const profile = participation.profile;
  const anonymous = mode === "ANONYMOUS";
  const needsProfile = !anonymous && !profile?.path;
  let reason: string | undefined;
  if (needsProfile) reason = "프로필로 등록하려면 배우 페이지를 먼저 공개해 주세요.";
  const toggle = () => {
    if (anonymous) return onChange("PROFILE");
    onChange("ANONYMOUS");
  };
  return <div className="community-author-choice">
    {preview && mode === "PROFILE" && profile?.path && <Link href={profile.path} className="community-profile-preview">
      <CommunityPhoto photoUrl={profile.photoUrl} small /><span>{profile.name}</span></Link>}
    {needsProfile && <Link href={applicantRoutes.actorPageSettings}>배우 페이지 공개 후 등록</Link>}
    <label title={reason}>
      <input type="checkbox" checked={anonymous} aria-describedby={reason && reasonId} onChange={toggle} />
      익명
    </label>
    {reason && <span id={reasonId} className="community-sr-only">{reason}</span>}
  </div>;
}
