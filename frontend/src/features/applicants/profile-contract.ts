import type {
  ApplicantAnswer,
  ApplicantAnswerValue,
  ApplicantProfileResponse,
  CareerEntry,
  EducationInformation,
  UpdateProfileRequest,
} from "./types";

export type ApplicantProfileValues = Readonly<Record<string, ApplicantAnswerValue | undefined>>;

export type BackendProfileResponse = {
  readonly basicInformation: {
    readonly name: string | null;
    readonly height: number | null;
    readonly weight: number | null;
    readonly birthDate: string | null;
    readonly gender: "FEMALE" | "MALE" | null;
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: string | null;
  };
  readonly additionalInformation: {
    readonly educationLevel: "NONE" | "HIGH_SCHOOL" | "UNIVERSITY" | null;
    readonly school: string | null;
    readonly major: string | null;
    readonly links: readonly string[];
    readonly nationality: string | null;
    readonly coverLetter: string | null;
    readonly specialty: string | null;
    readonly hobbies: string | null;
    readonly militaryServiceStatus: "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null;
    readonly careers: readonly {
      readonly year: number;
      readonly title: string;
      readonly roleName: string;
    }[];
  };
  readonly completeness: {
    readonly filled: number;
    readonly total: number;
  };
};

export type BackendProfileUpdateRequest = {
  readonly basicInformation: BackendProfileResponse["basicInformation"];
  readonly additionalInformation: BackendProfileResponse["additionalInformation"];
};

const labels: Readonly<Record<string, string>> = {
  NAME: "이름",
  HEIGHT: "키",
  WEIGHT: "몸무게",
  BIRTH: "생년월일",
  GENDER: "성별",
  PHONE: "연락처",
  EMAIL: "이메일",
  ADDRESS: "거주 지역",
  SCHOOL: "학력",
  LINK: "SNS / 외부 링크",
  NATIONALITY: "국적",
  COVER_LETTER: "자기소개",
  SPECIALTY: "특기",
  HOBBIES: "취미",
  MILITARY: "군필 여부",
  CAREER: "경력",
};

export function toProfileInformation(response: BackendProfileResponse) {
  const basic = response.basicInformation;
  const additional = response.additionalInformation;
  const answers = [
    profileAnswer("NAME", basic.name),
    profileAnswer("HEIGHT", basic.height),
    profileAnswer("WEIGHT", basic.weight),
    profileAnswer("BIRTH", basic.birthDate),
    profileAnswer("GENDER", genderLabel(basic.gender)),
    profileAnswer("PHONE", basic.phone),
    profileAnswer("EMAIL", basic.email),
    profileAnswer("ADDRESS", basic.address),
    profileAnswer("SCHOOL", educationValue(additional)),
    profileAnswer("LINK", additional.links),
    profileAnswer("NATIONALITY", additional.nationality),
    profileAnswer("COVER_LETTER", additional.coverLetter),
    profileAnswer("SPECIALTY", additional.specialty),
    profileAnswer("HOBBIES", additional.hobbies),
    profileAnswer("MILITARY", militaryLabel(additional.militaryServiceStatus)),
    profileAnswer("CAREER", additional.careers.map((career) => ({
      year: career.year,
      title: career.title,
      part: career.roleName,
    }))),
  ].filter((answer): answer is ApplicantAnswer => answer !== null);

  return {
    answers,
    completeness: {
      filled: response.completeness.filled,
      standardTotal: response.completeness.total,
    },
  } satisfies Pick<ApplicantProfileResponse, "answers" | "completeness">;
}

export function toBackendProfileUpdate(values: ApplicantProfileValues): BackendProfileUpdateRequest {
  return {
    basicInformation: {
      name: textValue(values.NAME),
      height: numberValue(values.HEIGHT),
      weight: numberValue(values.WEIGHT),
      birthDate: textValue(values.BIRTH),
      gender: genderValue(values.GENDER),
      phone: textValue(values.PHONE),
      email: textValue(values.EMAIL),
      address: textValue(values.ADDRESS),
    },
    additionalInformation: {
      ...educationRequest(values.SCHOOL),
      links: stringArray(values.LINK),
      nationality: textValue(values.NATIONALITY),
      coverLetter: textValue(values.COVER_LETTER),
      specialty: textValue(values.SPECIALTY),
      hobbies: textValue(values.HOBBIES),
      militaryServiceStatus: militaryValue(values.MILITARY),
      careers: careerArray(values.CAREER).map((career) => ({
        year: career.year,
        title: career.title.trim(),
        roleName: career.part.trim(),
      })),
    },
  };
}

export function toLegacyProfileUpdate(values: ApplicantProfileValues): UpdateProfileRequest {
  const answers = Object.entries(labels).flatMap(([key, label]) => {
    const value = values[key];
    return hasValue(value) ? [{ key, label, value }] : [];
  });
  return {
    answers,
    removeKeys: Object.keys(labels).filter((key) => !hasValue(values[key])),
  };
}

function profileAnswer(key: string, value: ApplicantAnswerValue | null): ApplicantAnswer | null {
  return value !== null && hasValue(value) ? { key, label: labels[key] ?? key, value } : null;
}

function genderLabel(value: BackendProfileResponse["basicInformation"]["gender"]) {
  if (value === "FEMALE") return "여성";
  if (value === "MALE") return "남성";
  return null;
}

function militaryLabel(value: BackendProfileResponse["additionalInformation"]["militaryServiceStatus"]) {
  if (value === "COMPLETED") return "군필";
  if (value === "NOT_COMPLETED") return "미필";
  if (value === "NOT_APPLICABLE") return "해당 없음";
  return null;
}

function genderValue(value: ApplicantAnswerValue | undefined) {
  if (value === "여성") return "FEMALE" as const;
  if (value === "남성") return "MALE" as const;
  return null;
}

function militaryValue(value: ApplicantAnswerValue | undefined) {
  if (value === "군필") return "COMPLETED" as const;
  if (value === "미필") return "NOT_COMPLETED" as const;
  if (value === "해당 없음") return "NOT_APPLICABLE" as const;
  return null;
}

function textValue(value: ApplicantAnswerValue | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function educationValue(additional: BackendProfileResponse["additionalInformation"]): EducationInformation | null {
  if (additional.educationLevel === null && additional.school === null && additional.major === null) return null;
  return { level: additional.educationLevel, school: additional.school ?? "", major: additional.major ?? "" };
}

function educationRequest(value: ApplicantAnswerValue | undefined) {
  if (!isEducationInformation(value)) return { educationLevel: null, school: null, major: null };
  return {
    educationLevel: value.level,
    school: value.level === "NONE" ? null : nullableText(value.school),
    major: value.level === "UNIVERSITY" ? nullableText(value.major) : null,
  };
}

function nullableText(value: string) {
  return value.trim() || null;
}

function numberValue(value: ApplicantAnswerValue | undefined) {
  return typeof value === "number" && value > 0 ? value : null;
}

function stringArray(value: ApplicantAnswerValue | undefined) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
    : [];
}

function careerArray(value: ApplicantAnswerValue | undefined): readonly CareerEntry[] {
  return Array.isArray(value) ? value.filter(isCareerEntry) : [];
}

function isCareerEntry(value: unknown): value is CareerEntry {
  return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value;
}

function hasValue(value: ApplicantAnswerValue | undefined): value is ApplicantAnswerValue {
  if (value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  if (isEducationInformation(value)) return value.level !== null || Boolean(value.school.trim()) || Boolean(value.major.trim());
  return true;
}

function isEducationInformation(value: unknown): value is EducationInformation {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "level" in value && "school" in value && "major" in value;
}
