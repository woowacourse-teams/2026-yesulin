export const MAX_EVENT_DETAIL_IMAGES = 10;

/** 진행 기간으로 본 이벤트 단계. 백엔드가 한국 날짜로 계산한다. 기간을 비운 이벤트는 늘 진행 중이다. */
export type EventPhase = "UPCOMING" | "ONGOING" | "ENDED";
export type EventRegistrationStatus = "OPEN" | "CLOSED" | "FULL" | "ENDED" | "DISABLED";
export type EventPaymentStatus = "PENDING" | "CONFIRMED";
export const EVENT_REGISTRATION_STATUS_LABELS: Readonly<Record<EventRegistrationStatus, string>> = {
  OPEN: "모집 중", CLOSED: "모집 마감", FULL: "선착순 마감", ENDED: "기간 종료", DISABLED: "접수 불가",
};
export const EVENT_PAYMENT_STATUS_LABELS: Readonly<Record<EventPaymentStatus, string>> = {
  PENDING: "입금 미확인", CONFIRMED: "입금 확인",
};

export function registrationClosedMessage(status: EventRegistrationStatus): string {
  if (status === "FULL") return "선착순 모집 정원이 마감되었습니다.";
  if (status === "CLOSED") return "모집이 마감되었습니다.";
  if (status === "ENDED") return "참가 신청 기간이 끝났습니다.";
  return "지금은 참가 신청을 받지 않습니다.";
}

/** 이벤트 목록 카드. 백엔드 `PublicEventSummaryResult`와 같다. */
export type PublicEventSummary = {
  readonly id: number;
  readonly title: string;
  readonly summary: string | null;
  /** `YYYY-MM-DD` */
  readonly startsOn: string | null;
  /** `YYYY-MM-DD` */
  readonly endsOn: string | null;
  readonly phase: EventPhase;
  readonly coverImageUrl: string | null;
  readonly registrationStatus: EventRegistrationStatus;
};

/** 이벤트 상세. 백엔드 `PublicEventResult`와 같다. */
export type PublicEvent = PublicEventSummary & {
  /** 대표 이미지 옆의 자유 형식 개요. 줄바꿈을 유지한다. */
  readonly body: string;
  /** 하단의 상세 설명과 표시 순서대로 정렬한 이미지. */
  readonly detailBody: string | null;
  readonly detailImageUrls: readonly string[];
  /** 신청 버튼이 여는 주소. 없으면 버튼이 없다. 참가 신청서를 켠 글은 이 주소 대신 신청서를 연다. */
  readonly applyUrl: string | null;
  readonly applyLabel: string | null;
  /** 예술in 참가 신청서를 쓰는 글인지 */
  readonly registrationEnabled: boolean;
  /** 지금 참가 신청을 받는지. 신청서를 켠 글이 마감되면 false다. */
  readonly registrationOpen: boolean;
  readonly registrationCapacity: number | null;
  readonly registrationCount: number;
  readonly registrationClosed: boolean;
  /** 참가 신청서 위에 보일 보증금·계좌 같은 안내. 줄바꿈을 그대로 보여 준다. */
  readonly registrationNotice: string | null;
  /** 신청 전 확인 팝업 설정. 켜면 안내 내용을 확인한 뒤 신청한다. */
  readonly registrationConfirmationEnabled: boolean;
  readonly registrationConfirmationMessage: string | null;
  /** 배우의 프로필 명함 제작 희망을 받는 마감 시각(ISO). 없으면 신청 기간 내내 받는다. */
  readonly businessCardClosesAt: string | null;
  /** 지금 명함 제작 희망을 받는지. 참가 신청을 받는 중이고 마감 시각 전이어야 true다. */
  readonly businessCardOpen: boolean;
};

/** 참가 신청자 구분. 배우는 프로필 명함에 쓸 생년월일·사진을, 공연사 관계자는 소속과 하는 일을 적는다. */
export type EventParticipantType = "ACTOR" | "PRODUCER" | "GENERAL";

export const EVENT_PARTICIPANT_LABELS: Readonly<Record<EventParticipantType, string>> = {
  ACTOR: "배우",
  PRODUCER: "관계자",
  GENERAL: "일반인",
};

/** 배우가 활동하거나 준비하는 분야. 기타를 고르면 분야 이름을 직접 적는다. */
export type EventActivityField = "THEATER" | "MUSICAL" | "MEDIA" | "YOUTUBE" | "OTHER";

export const EVENT_ACTIVITY_FIELDS: readonly EventActivityField[] = ["THEATER", "MUSICAL", "MEDIA", "YOUTUBE", "OTHER"];

export const EVENT_ACTIVITY_LABELS: Readonly<Record<EventActivityField, string>> = {
  THEATER: "연극",
  MUSICAL: "뮤지컬",
  MEDIA: "매체",
  YOUTUBE: "유튜브",
  OTHER: "기타",
};

/** 배우 경력 한 줄. */
export type EventRegistrationCareer = {
  /** `YYYY-MM` */
  readonly performedMonth: string;
  readonly workTitle: string;
  /** 맡은 역. 비울 수 있다. */
  readonly role: string | null;
};

/** 경력은 이 줄 수까지 적는다. */
export const MAX_REGISTRATION_CAREERS = 10;

/** 명함 뒷면 한 줄 소개는 이 글자 수까지 적는다. */
export const MAX_REGISTRATION_INTRO = 40;
export type EventSnsPlatform = "INSTAGRAM" | "THREADS" | "YOUTUBE";
export const EVENT_SNS_PLATFORMS: readonly EventSnsPlatform[] = ["INSTAGRAM", "THREADS", "YOUTUBE"];
export const EVENT_SNS_LABELS: Readonly<Record<EventSnsPlatform, string>> = {
  INSTAGRAM: "인스타그램", THREADS: "스레드", YOUTUBE: "유튜브",
};
export const MAX_EVENT_SNS_HANDLE_LENGTH = 20;

/** 참가 신청 요청. 백엔드 `RegisterRequest`와 같다. 구분에 맞지 않는 칸은 서버가 저장하지 않는다. */
export type EventRegistrationWrite = {
  readonly participantType: EventParticipantType;
  readonly name: string;
  readonly phone: string;
  /** 배우가 프로필 명함 제작을 희망하는지. 켜야 아래 명함 정보(이메일~경력)를 받는다. */
  readonly businessCardRequested: boolean;
  /** 명함을 희망한 배우만 필수다. */
  readonly email: string | null;
  readonly snsHandle: string | null;
  readonly snsPlatform: EventSnsPlatform | null;
  /** `YYYY-MM-DD`. 명함을 희망한 배우만 필수다. */
  readonly birthDate: string | null;
  /** 공연사 관계자만 필수인 소속과 지금 하는 일 */
  readonly affiliation: string | null;
  /** 배우가 올린 프로필 사진의 업로드 키 */
  readonly photoUploadKey: string | null;
  /** 배우만 하나 이상 고른다. */
  readonly activityFields: readonly EventActivityField[];
  /** 기타를 고른 배우가 직접 적은 분야 */
  readonly otherActivity: string | null;
  /** 신입이라 경력이 없는 배우 */
  readonly noCareer: boolean;
  /** 배우 경력. 경력 없음이 아니면 한 줄 이상 적는다. */
  readonly careers: readonly EventRegistrationCareer[];
  /** 명함 뒷면에 넣을 한 줄 소개. 선택이다. */
  readonly intro: string | null;
  readonly privacyAgreed: boolean;
};

/** 브라우저가 참가 신청 사진을 저장소로 바로 올릴 주소. 백엔드 `EventRegistrationPhotoUploadResult`와 같다. */
export type EventRegistrationPhotoUpload = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
  readonly uploadKey: string;
};

/** 메인 상단에 지금 보일 이벤트 배너. 누르면 이벤트 상세로 간다. 백엔드 `EventBannerResult`와 같다. */
export type EventBanner = {
  readonly eventId: number;
  readonly title: string;
  readonly alt: string;
  readonly desktopImageUrl: string;
  readonly mobileImageUrl: string;
};

export const EVENT_PHASE_LABELS: Readonly<Record<EventPhase, string>> = {
  UPCOMING: "예정",
  ONGOING: "진행 중",
  ENDED: "마감",
};

export const DEFAULT_APPLY_LABEL = "신청하기";

export const eventApiPaths = {
  list: "/v1/public/events",
  detail: (eventId: number | string) => `/v1/public/events/${encodeURIComponent(String(eventId))}`,
  banners: "/v1/public/events/banners",
  registrations: (eventId: number | string) => `/v1/public/events/${encodeURIComponent(String(eventId))}/registrations`,
  registrationPhotoUploads: (eventId: number | string) =>
    `/v1/public/events/${encodeURIComponent(String(eventId))}/registrations/photo-uploads`,
} as const;

export const eventRoutes = {
  list: "/events",
  detail: (eventId: number | string) => `/events/${encodeURIComponent(String(eventId))}`,
  register: (eventId: number | string) => `/events/${encodeURIComponent(String(eventId))}/register`,
} as const;

/** `2026.10.01 ~ 10.16`처럼 기간을 짧게 쓴다. 해가 다르면 끝에도 해를 쓰고, 기간이 없으면 null이다. */
export function formatEventPeriod(startsOn: string | null, endsOn: string | null): string | null {
  const dot = (date: string) => date.replaceAll("-", ".");
  if (startsOn && endsOn) {
    const sameYear = startsOn.slice(0, 4) === endsOn.slice(0, 4);
    return `${dot(startsOn)} ~ ${sameYear ? dot(endsOn.slice(5)) : dot(endsOn)}`;
  }
  if (startsOn) return `${dot(startsOn)}부터`;
  if (endsOn) return `${dot(endsOn)}까지`;
  return null;
}
