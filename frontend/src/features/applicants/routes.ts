import type { ApplicationId } from "@/features/auditions/types";

export const applicantRoutes = {
  home: "/applicants",
  applications: "/applicants/applications",
  application: (id: ApplicationId) => `/applicants/applications/${id}`,
  profile: "/applicants/profile",
} as const;
