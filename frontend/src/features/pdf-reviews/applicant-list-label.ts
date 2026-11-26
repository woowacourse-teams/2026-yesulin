import { UNASSIGNED_ROLE } from "./screening-adapter";
import type { Applicant } from "./screening-types";

/**
 * 목록에는 지원서 제목과 배정된 배역을 표시한다.
 */
export function applicantListLabel(applicant: Applicant) {
  const document = applicant.sourceDocument;
  const title = document?.title || document?.filename || applicant.name;
  return { title, role: assignedRole(applicant.roleName), uploading: !!document?.uploading };
}

function assignedRole(roleName: string) {
  if (roleName === UNASSIGNED_ROLE) return "";
  return roleName;
}
