/**
 * 오디션 일정표. 기획사는 관리 링크, 배우는 개인 링크의 열쇠로만 접근하고 로그인하지 않는다.
 * 날짜는 `YYYY-MM-DD`, 시각은 한국 시간 `HH:mm`이다. 서버의 `HH:mm:ss`는 API adapter에서 줄인다.
 */

export type TimetableStatus = "DRAFT" | "PUBLISHED";
export type SelfChangeStatus = "OPEN" | "LOCKED" | "DEADLINE_PASSED";

export type TimeSlot = {
  readonly date: string;
  readonly startTime: string;
};

export type TimeSlotRange = TimeSlot & {
  readonly endTime: string;
};

export type TimetableWindow = {
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
};

export type TimetableSetting = {
  readonly slotMinutes: number;
  readonly slotCapacity: number;
  readonly windows: readonly TimetableWindow[];
};

export type TimetableProfile = {
  readonly title: string;
  readonly organizerName: string;
  readonly organizerPhone: string;
  readonly location: string;
  readonly guide: string;
};

export type TimetableActor = {
  readonly id: number;
  readonly name: string;
  readonly phone: string;
  readonly slot: TimeSlotRange | null;
  readonly invited: boolean;
  /** 배우가 링크에서 직접 바꾸기 전, 기획사가 정했던 시간. 배우가 바꾼 적이 없으면 null. */
  readonly previousSlot: TimeSlotRange | null;
  readonly actorChangedAt: string | null;
  /** 일정표 확정 시각보다 늦으면 확정 뒤에 등록한 추가 합격자다. */
  readonly registeredAt: string;
};

export type TimetableRequest = {
  readonly id: number;
  readonly actorId: number;
  readonly actorName: string;
  readonly message: string;
  readonly createdAt: string;
};

export type TimetableBoard = TimetableProfile & TimetableSetting & {
  readonly status: TimetableStatus;
  readonly publishedAt: string | null;
  readonly selfChangeLocked: boolean;
  readonly selfChangeNoticeHours: number;
  readonly actors: readonly TimetableActor[];
  readonly requests: readonly TimetableRequest[];
};

export type TimetableCreated = {
  readonly manageKey: string;
  readonly timetable: TimetableBoard;
};

export type ActorContact = {
  readonly name: string;
  readonly phone: string;
};

/** 기획사가 보드에서 옮긴 배우. `previous`는 화면이 불러온 시간이며 그사이 바뀌었으면 서버가 거절한다. */
export type SlotAssignment = {
  readonly actorId: number;
  readonly previous: TimeSlot | null;
  readonly next: TimeSlot | null;
};

export type ActorTimetable = {
  readonly title: string;
  readonly organizerName: string;
  readonly location: string;
  readonly guide: string;
  readonly actorName: string;
  readonly slot: TimeSlotRange | null;
  readonly selfChange: SelfChangeStatus;
  readonly changeDeadline: string | null;
  readonly selfChangeNoticeHours: number;
  readonly openSlots: readonly TimeSlotRange[];
  readonly request: { readonly message: string; readonly createdAt: string } | null;
};

export const TIMETABLE_LIMITS = {
  titleLength: 60,
  organizerNameLength: 40,
  locationLength: 200,
  guideLength: 1000,
  actorNameLength: 30,
  maxActors: 300,
  minSlotMinutes: 5,
  maxSlotMinutes: 240,
  maxSlotCapacity: 50,
  maxWindows: 200,
  minuteStep: 5,
  requestLength: 300,
} as const;

/** 문자에 넣는 링크가 짧도록 128비트 난수를 Base64 URL 문자 22자로 쓴다. */
export const TIMETABLE_KEY_LENGTH = 22;
export const TIMETABLE_KEY_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${TIMETABLE_KEY_LENGTH}}$`);

export const timetableRoutes = {
  create: "/timetable/new",
  manage: (manageKey: string) => `/timetable/manage/${encodeURIComponent(manageKey)}`,
  /** 배우가 가장 많이 받는 문자라 경로를 짧게 둔다. */
  actor: (accessKey: string) => `/t/${encodeURIComponent(accessKey)}`,
} as const;
