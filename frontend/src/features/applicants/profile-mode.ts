import { frontendEnvironment } from "@/config/environment";

export const applicantProfileApiEnabled =
  frontendEnvironment.applicantProfileApiEnabled
  || !frontendEnvironment.apiMockingEnabled;
