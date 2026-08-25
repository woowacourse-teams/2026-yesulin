import type { ApplicantRoleProgress } from "./types";

/** 공고를 더 이상 찾을 수 없어 포스터를 받지 못했을 때 목록·상세가 함께 쓰는 대체 이미지. */
export const FALLBACK_POSTER_URL = "/images/yesulin-logo-mark.png";

export type V1SelectedRole = { readonly roleId: number; readonly roleName: string };

/** 심사 결과 공개 경계가 아직 없으므로 선택한 배역은 모두 접수 상태로만 보여 준다. */
export function toRoleProgress(role: V1SelectedRole): ApplicantRoleProgress {
  return {
    roleId: String(role.roleId),
    roleName: role.roleName,
    state: "RECEIVED",
    round: null,
    roundName: null,
  };
}
