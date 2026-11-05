import type { ApplicantProfileResponse } from "./types";

/** 프로필 답변을 화면에 쓸 글자로 읽는다. 값이 없거나 글자·숫자가 아니면 빈 문자열이다. */
export function profileAnswerText(profile: ApplicantProfileResponse, key: string): string {
  const value = profile.answers.find((answer) => answer.key === key)?.value;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "";
}

/** 마이페이지 이름 아래 한 줄. 출생 연도·성별·키 중 있는 값만 잇는다. */
export function profileSummary(profile: ApplicantProfileResponse): readonly string[] {
  const birth = profileAnswerText(profile, "BIRTH");
  const height = profileAnswerText(profile, "HEIGHT");
  return [
    /^\d{4}/.test(birth) && `${birth.slice(0, 4)}년생`,
    profileAnswerText(profile, "GENDER"),
    height && `${height}cm`,
  ].filter((part): part is string => Boolean(part));
}

export function representativePhoto(profile: ApplicantProfileResponse) {
  return profile.photoLibrary.find((photo) => photo.representative) ?? profile.photoLibrary[0];
}
