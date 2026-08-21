import type { SubmissionId } from "@/features/auditions/types";

export const applicantRoutes = {
  home: "/applicants",
  submissions: "/applicants/submissions",
  submission: (id: SubmissionId) => `/applicants/submissions/${id}`,
  applicationDraft: (postingId: string) => `/apply/${postingId}?resumeDraft=1`,
  profile: "/applicants/profile",
  lookup: "/apply/lookup",
} as const;
