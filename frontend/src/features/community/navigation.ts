export function communityReturnTo(postId?: number, editing = false) {
  if (!postId) return "/community/new";
  if (editing) return `/community/${postId}?edit=1`;
  return `/community/${postId}?reply=1`;
}

export function communityCommentEditReturnTo(postId: number, commentId: number) {
  return `/community/${postId}?editComment=${commentId}`;
}

export function finishCommunityEdit() {
  const url = new URL(window.location.href);
  url.searchParams.delete("edit");
  url.searchParams.delete("editComment");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
