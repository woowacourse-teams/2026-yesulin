import type { SubmissionId } from "@/features/auditions/types";

export const applicantRoutes = {
  home: "/applicants",
  submissions: "/applicants/submissions",
  submission: (id: SubmissionId) => `/applicants/submissions/${id}`,
  applicationDraft: (postingId: string) => `/apply/${postingId}/write/basic?resumeDraft=1`,
  profile: "/applicants/profile",
  /** 편집 화면의 배우 페이지 설정 탭. */
  actorPageSettings: "/applicants/profile?tab=actor-page",
  actorPagePreview: "/applicants/profile/actor-page-preview",
  lookup: "/apply/lookup",
} as const;
