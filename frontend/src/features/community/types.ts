export type CommunityEntry = {
  readonly id: number;
  readonly title: string | null;
  readonly body: string;
  readonly author: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly commentCount: number;
  readonly editable: boolean;
  readonly likeCount: number;
  readonly liked: boolean;
};

export type CommunityLikeState = Pick<CommunityEntry, "likeCount" | "liked">;

export type CommunityPage = {
  readonly items: readonly CommunityEntry[];
  readonly nextCursor: number | null;
};

export const communityPath = "/v1/public/community/posts";
export const reportReasons = {
  SPAM: "광고·스팸",
  HARASSMENT: "욕설·괴롭힘",
  PERSONAL_INFORMATION: "개인정보 노출",
  OTHER: "기타",
} as const;
export type ReportReason = keyof typeof reportReasons;
