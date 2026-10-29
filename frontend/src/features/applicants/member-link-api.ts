import { applicantRequest } from "./request";

export type MemberLinkCode = {
  readonly code: string;
  readonly expiresAt: string;
  readonly reissueAvailableAt: string;
};

export function issueMemberLinkCode(): Promise<MemberLinkCode> {
  return applicantRequest("/v1/applicants/me/member-link-code", { method: "POST" });
}
