const enabled = (value: string | undefined) => value === "enabled";

export const frontendEnvironment = {
  apiMockingEnabled: enabled(process.env.NEXT_PUBLIC_API_MOCKING),
  producerLoginEnabled: enabled(process.env.NEXT_PUBLIC_PRODUCER_LOGIN),
  producerApiEnabled: enabled(process.env.NEXT_PUBLIC_PRODUCER_API),
  applicantProfileApiEnabled: enabled(process.env.NEXT_PUBLIC_APPLICANT_PROFILE_API),
  socialLoginEnabled: enabled(process.env.NEXT_PUBLIC_SOCIAL_LOGIN),
  localSocialLoginEnabled: enabled(process.env.NEXT_PUBLIC_LOCAL_SOCIAL_LOGIN),
} as const;
