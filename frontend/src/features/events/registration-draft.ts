import { MAX_REGISTRATION_CAREERS, type EventActivityField, type EventParticipantType, type EventRegistrationWrite } from "./types";

/** 경력 입력 한 줄. `key`는 줄을 지우고 더해도 입력 칸이 섞이지 않게 붙인 화면용 번호다. */
export type CareerDraft = {
  readonly key: number;
  /** `YYYY` */
  readonly year: string;
  /** `MM` */
  readonly month: string;
  readonly workTitle: string;
  readonly role: string;
};

/** 참가 신청서 상태. 입력 칸은 모두 문자열이고 보낼 때 빈 칸을 null로 바꾼다. */
export type RegistrationDraft = {
  readonly participantType: EventParticipantType | null;
  readonly name: string;
  readonly phone: string;
  /** 공연사 관계자의 소속과 하는 일 */
  readonly affiliation: string;
  /** 배우가 프로필 명함 제작을 희망하는지. 켜야 아래 명함 정보를 적는다. */
  readonly businessCardRequested: boolean;
  readonly email: string;
  readonly snsHandle: string;
  /** `YYYY-MM-DD` */
  readonly birthDate: string;
  /** 올린 프로필 사진의 업로드 키. 사진을 고르지 않았으면 null이다. */
  readonly photoUploadKey: string | null;
  readonly activityFields: readonly EventActivityField[];
  readonly otherActivity: string;
  /** 신입이라 경력이 없다고 체크했는지. 체크하면 경력 줄은 보내지 않는다. */
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly privacyAgreed: boolean;
};

const PHONE = /^01[016789]-\d{3,4}-\d{4}$/;
/** 서버와 같은 모양. 도메인은 점을 뺀 조각끼리 점으로 잇게 맞춰 긴 입력에서도 느려지지 않는다. */
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function emptyCareer(key: number): CareerDraft {
  return { key, year: "", month: "", workTitle: "", role: "" };
}

export function emptyRegistrationDraft(): RegistrationDraft {
  return {
    participantType: null,
    name: "",
    phone: "",
    affiliation: "",
    businessCardRequested: false,
    email: "",
    snsHandle: "",
    birthDate: "",
    photoUploadKey: null,
    activityFields: [],
    otherActivity: "",
    noCareer: false,
    careers: [emptyCareer(1)],
    privacyAgreed: false,
  };
}

/** 분야를 켜고 끈다. 순서는 고른 순서가 아니라 연극·뮤지컬·매체·유튜브·기타 순서를 지킨다. */
export function toggleActivityField(
  fields: readonly EventActivityField[],
  field: EventActivityField,
  order: readonly EventActivityField[],
): readonly EventActivityField[] {
  const next = fields.includes(field) ? fields.filter((item) => item !== field) : [...fields, field];
  return order.filter((item) => next.includes(item));
}

/** 경력 시기에서 고를 연도. 올해부터 거꾸로 1970년까지다. */
export function careerYears(today: string): readonly string[] {
  const thisYear = Number(today.slice(0, 4));
  return Array.from({ length: thisYear - 1969 }, (_, index) => String(thisYear - index));
}

/** 휴대폰 번호를 적는 동안 `010-1234-5678` 모양으로 하이픈을 넣는다. */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 보내기 전에 고칠 점. 서버도 같은 규칙으로 거절하지만 먼저 알려 준다. 문제가 없으면 null이다.
 *
 * @param today 생년월일이 미래인지 볼 `YYYY-MM-DD`
 */
export function registrationProblem(draft: RegistrationDraft, today: string): string | null {
  if (!draft.participantType) return "참가 구분을 선택해 주십시오.";
  if (!draft.name.trim()) return "이름을 입력해 주십시오.";
  if (!PHONE.test(formatPhoneInput(draft.phone))) return "휴대폰 번호를 010-1234-5678 형식으로 입력해 주십시오.";
  if (draft.participantType === "PRODUCER" && !draft.affiliation.trim()) return "소속과 지금 하는 일을 입력해 주십시오.";
  if (draft.participantType === "ACTOR" && draft.businessCardRequested) {
    const problem = businessCardProblem(draft, today);
    if (problem) return problem;
  }
  if (!draft.privacyAgreed) return "개인정보 수집·이용에 동의해 주십시오.";
  return null;
}

function businessCardProblem(draft: RegistrationDraft, today: string): string | null {
  if (!EMAIL.test(draft.email.trim())) return "이메일 주소를 확인해 주십시오.";
  if (!draft.birthDate) return "생년월일을 입력해 주십시오.";
  if (draft.birthDate > today || draft.birthDate < "1900-01-01") return "생년월일을 확인해 주십시오.";
  if (!draft.photoUploadKey) return "프로필 사진을 올려 주십시오.";
  if (draft.activityFields.length === 0) return "활동 분야를 하나 이상 선택해 주십시오.";
  if (draft.activityFields.includes("OTHER") && !draft.otherActivity.trim()) return "기타 분야를 입력해 주십시오.";
  if (draft.noCareer) return null;
  const careers = filledCareers(draft.careers);
  if (careers.length === 0) return "경력을 한 줄 이상 입력하거나 '경력 없음'을 체크해 주십시오.";
  if (careers.length > MAX_REGISTRATION_CAREERS) return `경력은 ${MAX_REGISTRATION_CAREERS}줄까지 입력할 수 있습니다.`;
  if (careers.some((career) => !career.year || !career.month)) return "경력마다 연도와 월을 선택해 주십시오.";
  if (careers.some((career) => !career.workTitle.trim())) return "경력마다 작품명을 입력해 주십시오.";
  return null;
}

/** 구분과 명함 희망 여부에 맞는 칸만 담아 보낸다. {@link registrationProblem}을 통과한 신청서만 넘긴다. */
export function writeOfRegistration(draft: RegistrationDraft): EventRegistrationWrite {
  const card = draft.participantType === "ACTOR" && draft.businessCardRequested;
  return {
    participantType: draft.participantType ?? "ACTOR",
    name: draft.name.trim(),
    phone: formatPhoneInput(draft.phone),
    affiliation: draft.participantType === "PRODUCER" ? blankToNull(draft.affiliation) : null,
    businessCardRequested: card,
    email: card ? blankToNull(draft.email) : null,
    snsHandle: card ? blankToNull(draft.snsHandle) : null,
    birthDate: card ? blankToNull(draft.birthDate) : null,
    photoUploadKey: card ? draft.photoUploadKey : null,
    activityFields: card ? draft.activityFields : [],
    otherActivity: card && draft.activityFields.includes("OTHER") ? blankToNull(draft.otherActivity) : null,
    noCareer: card && draft.noCareer,
    careers: card && !draft.noCareer
      ? filledCareers(draft.careers).map((career) => ({
        performedMonth: `${career.year}-${career.month}`,
        workTitle: career.workTitle.trim(),
        role: blankToNull(career.role),
      }))
      : [],
    privacyAgreed: draft.privacyAgreed,
  };
}

/** 칸을 모두 비운 줄은 없는 줄로 본다. */
function filledCareers(careers: readonly CareerDraft[]): readonly CareerDraft[] {
  return careers.filter((career) => career.year || career.month || career.workTitle.trim() || career.role.trim());
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
