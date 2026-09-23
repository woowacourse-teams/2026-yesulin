export const APPLICATION_TYPES = ["STANDARD", "OTR"] as const;

export type ApplicationType = (typeof APPLICATION_TYPES)[number];
