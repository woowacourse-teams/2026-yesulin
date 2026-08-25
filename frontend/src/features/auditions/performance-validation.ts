import type { VenueAddress } from "./creation-types";

export const PERFORMANCE_TITLE_MAX_LENGTH = 200;
export const PERFORMANCE_VENUE_MAX_LENGTH = 200;
export const PERFORMANCE_ADDRESS_MAX_LENGTH = 300;
export const PERFORMANCE_ZONECODE_MAX_LENGTH = 20;
export const PERFORMANCE_ROLE_NAME_MAX_LENGTH = 100;
export const PERFORMANCE_ROLE_DESCRIPTION_MAX_LENGTH = 300;

type PerformanceRoleValue = {
  readonly name: string;
  readonly description: string;
};

export function validatePerformanceInput(input: {
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly roles: readonly PerformanceRoleValue[];
}) {
  if (!input.title.trim()) return "공연 제목을 입력해 주세요.";
  if (input.title.length > PERFORMANCE_TITLE_MAX_LENGTH) return `공연 제목은 ${PERFORMANCE_TITLE_MAX_LENGTH}자 이내로 입력해 주세요.`;
  if (!input.venue.trim()) return "공연 장소명을 입력해 주세요.";
  if (input.venue.length > PERFORMANCE_VENUE_MAX_LENGTH) return `공연 장소명은 ${PERFORMANCE_VENUE_MAX_LENGTH}자 이내로 입력해 주세요.`;
  if (!input.venueAddress.roadAddress.trim()) return "도로명주소 검색으로 공연 장소를 선택해 주세요.";
  if (input.venueAddress.roadAddress.length > PERFORMANCE_ADDRESS_MAX_LENGTH) return `도로명주소는 ${PERFORMANCE_ADDRESS_MAX_LENGTH}자 이내여야 합니다.`;
  if (input.venueAddress.detailAddress.length > PERFORMANCE_ADDRESS_MAX_LENGTH) return `상세 주소는 ${PERFORMANCE_ADDRESS_MAX_LENGTH}자 이내여야 합니다.`;
  if (input.venueAddress.zonecode.length > PERFORMANCE_ZONECODE_MAX_LENGTH) return `우편번호는 ${PERFORMANCE_ZONECODE_MAX_LENGTH}자 이내여야 합니다.`;

  const roleNames = new Set<string>();
  for (const role of input.roles) {
    const name = role.name.trim();
    const description = role.description.trim();
    if (!name) return "모든 배역의 이름을 입력해 주세요.";
    if (name.length > PERFORMANCE_ROLE_NAME_MAX_LENGTH) return `배역 이름은 ${PERFORMANCE_ROLE_NAME_MAX_LENGTH}자 이내로 입력해 주세요.`;
    if (!description) return "모든 배역의 한 줄 설명을 입력해 주세요.";
    if (description.length > PERFORMANCE_ROLE_DESCRIPTION_MAX_LENGTH) return `배역 설명은 ${PERFORMANCE_ROLE_DESCRIPTION_MAX_LENGTH}자 이내로 입력해 주세요.`;
    if (/\r|\n/.test(description)) return "배역 설명은 한 줄로 입력해 주세요.";
    const normalizedName = name.toLocaleLowerCase();
    if (roleNames.has(normalizedName)) return "같은 이름의 배역을 중복해서 추가할 수 없습니다.";
    roleNames.add(normalizedName);
  }
  return "";
}
