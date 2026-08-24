export const applicantProfileApiEnabled =
  process.env.NEXT_PUBLIC_APPLICANT_PROFILE_API === "enabled"
  || process.env.NEXT_PUBLIC_API_MOCKING === "disabled";
