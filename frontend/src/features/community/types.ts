export type CommunityEntry = {
  readonly id: number;
  readonly replyToId?: number | null;
  readonly title: string | null;
  readonly body: string;
  readonly author: string;
  readonly authorPhotoUrl?: string | null;
  readonly authorPath?: string | null;
  readonly postAuthor?: boolean;
  readonly memberOwned?: boolean;
  readonly authorMode?: CommunityAuthorMode;
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

export type CommunityAuthorMode = "ANONYMOUS" | "PROFILE";
export type CommunityProfile = { name: string; photoUrl: string | null; path: string | null };
export type CommunityParticipation = {
  memberId: number | null;
  canWrite: boolean;
  fixedMode: CommunityAuthorMode | null;
  profile: CommunityProfile | null;
};
