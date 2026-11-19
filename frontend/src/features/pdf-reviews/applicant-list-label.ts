import { UNASSIGNED_ROLE } from "./screening-adapter";
import type { Applicant } from "./screening-types";

/**
 * 목록·캡션은 담당자가 올린 PDF 파일 이름을 기준으로 쓴다.
 * 담당자가 직접 적은 이름과 배정한 배역만 덧붙이고, 비어 있으면 "이름 미입력"이나 "미배정" 같은 자리 표시를 보이지 않는다.
 */
export function applicantListLabel(applicant: Applicant) {
  const document = applicant.sourceDocument;
  const filename = document?.filename || applicant.name;
  const name = (document?.title ?? "").trim();
  return { number: applicantNumberLabel(applicant, 0), filename, name, role: assignedRole(applicant.roleName), uploading: !!document?.uploading };
}

export function applicantNumberLabel(applicant: Applicant, fallback: number) {
  const sequence = applicant.sourceDocument?.sequence;
  if (sequence && sequence > 0) return `지원서 ${sequence}`;
  if (fallback > 0) return `지원서 ${fallback}`;
  return "";
}

function assignedRole(roleName: string) {
  if (roleName === UNASSIGNED_ROLE) return "";
  return roleName;
}
