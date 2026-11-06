"use client";

import { PiHeart, PiHeartFill } from "react-icons/pi";
import { setPostLike } from "@/features/community/api";
import { trackLikeToggled } from "@/features/community/analytics";
import { useCommunityAction } from "@/features/community/hooks";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { CommunityError } from "./community-ui";

type Props = { readonly post: CommunityEntry; readonly onChanged: (state: CommunityLikeState) => void; readonly labelled?: boolean };

export function LikeButton({ post, onChanged, labelled = false }: Props) {
  const action = useCommunityAction();
  const toggle = () => action.run(async () => {
    const state = await setPostLike(post.id, !post.liked);
    onChanged(state);
    if (state.liked !== post.liked) trackLikeToggled(state.liked);
  });
  return <><button type="button" className="community-like" aria-pressed={post.liked}
    aria-label={`좋아요 ${post.likeCount}개`} disabled={action.busy} onClick={toggle}>
    {post.liked && <PiHeartFill size={19} aria-hidden="true" />}{!post.liked && <PiHeart size={19} aria-hidden="true" />}
    <span>{labelled && "좋아요 "}{post.likeCount}</span></button><CommunityError message={action.error} retry={() => void toggle()} /></>;
}
