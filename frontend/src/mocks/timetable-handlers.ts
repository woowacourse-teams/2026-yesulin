import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminTimetableMessage, AdminTimetableMessageType } from "@/features/admin/types";
import { addDays, hmOf, minutesOf, sameSlot, slotKey, slotsOf, toHm, todayInSeoul } from "@/features/timetables/time";
import {
  TIMETABLE_KEY_LENGTH,
  TIMETABLE_KEY_PATTERN,
  TIMETABLE_LIMITS,
  timetableRoutes,
  type ActorTimetable,
  type TimeSlot,
  type TimetableBoard,
  type TimetableProfile,
  type TimetableSetting,
} from "@/features/timetables/types";
import { mockSessionRole } from "./auth-handlers";

/**
 * 백엔드 domain/timetable 규칙을 따라가는 메모리 목. 새로고침하면 seed로 돌아간다.
 * 응답 시각은 실제 서버처럼 `HH:mm:ss`로 내려 API adapter의 변환까지 확인한다.
 */
const API = "/api/v1/timetables";
const KEY_HEADER = "X-Timetable-Key";
const SELF_CHANGE_HOURS = 24;
const realLoginEnabled = frontendEnvironment.producerLoginEnabled;

export const SEED_TIMETABLE_KEYS = {
  draft: "seed_manage_draft".padEnd(TIMETABLE_KEY_LENGTH, "0"),
  published: "seed_manage_published".padEnd(TIMETABLE_KEY_LENGTH, "0"),
  actor: "seed_actor_kim".padEnd(TIMETABLE_KEY_LENGTH, "0"),
} as const;

type MockActor = {
  id: number;
  accessKey: string;
  name: string;
  phone: string;
  slot: TimeSlot | null;
  invitedAt: string | null;
  actorChangedAt: string | null;
  previousSlot: TimeSlot | null;
  registeredAt: string;
};

type MockRequest = { id: number; actorId: number; message: string; open: boolean; createdAt: string };

type MockTimetable = TimetableProfile & TimetableSetting & {
  id: number;
  manageKey: string;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  selfChangeLocked: boolean;
  actors: MockActor[];
  requests: MockRequest[];
};

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

type MockMessage = Mutable<Omit<AdminTimetableMessage, "timetableTitle" | "organizerName">> & {
  timetableId: number;
  actorId: number | null;
};

let sequence = 100;
const nextId = () => {
  sequence += 1;
  return sequence;
};
const now = () => new Date().toISOString();

function randomKey(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const bytes = crypto.getRandomValues(new Uint8Array(TIMETABLE_KEY_LENGTH));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message, detail: null }, { status });
const notFound = () => apiError(404, "TIMETABLE_NOT_FOUND", "일정표를 찾을 수 없습니다. 링크를 다시 확인해 주세요.");
const invalid = (message: string) => apiError(400, "TIMETABLE_INVALID_INPUT", message);

const timetables: MockTimetable[] = [];
const messages: MockMessage[] = [];

function startInstant(slot: TimeSlot): number {
  return Date.parse(`${slot.date}T${toHm(slot.startTime)}:00+09:00`);
}

const withSeconds = (time: string) => `${toHm(time)}:00`;

function range(timetable: MockTimetable, slot: TimeSlot | null) {
  return slot
    ? { date: slot.date, startTime: withSeconds(slot.startTime), endTime: withSeconds(hmOf(minutesOf(slot.startTime) + timetable.slotMinutes)) }
    : null;
}

function toBoard(timetable: MockTimetable): TimetableBoard {
  return {
    title: timetable.title,
    organizerName: timetable.organizerName,
    organizerPhone: timetable.organizerPhone,
    location: timetable.location,
    guide: timetable.guide,
    status: timetable.status,
    publishedAt: timetable.publishedAt,
    selfChangeLocked: timetable.selfChangeLocked,
    selfChangeNoticeHours: SELF_CHANGE_HOURS,
    slotMinutes: timetable.slotMinutes,
    slotCapacity: timetable.slotCapacity,
    windows: timetable.windows.map((window) => ({ ...window, startTime: withSeconds(window.startTime), endTime: withSeconds(window.endTime) })),
    actors: timetable.actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      phone: actor.phone,
      slot: range(timetable, actor.slot),
      invited: actor.invitedAt !== null,
      previousSlot: range(timetable, actor.previousSlot),
      actorChangedAt: actor.actorChangedAt,
      registeredAt: actor.registeredAt,
    })) as TimetableBoard["actors"],
    requests: timetable.requests.filter((request) => request.open).flatMap((request) => {
      const actor = timetable.actors.find((candidate) => candidate.id === request.actorId);
      return actor ? [{ id: request.id, actorId: actor.id, actorName: actor.name, message: request.message, createdAt: request.createdAt }] : [];
    }),
  };
}

function counts(timetable: MockTimetable): Map<string, number> {
  const result = new Map<string, number>();
  timetable.actors.forEach((actor) => {
    if (actor.slot) result.set(slotKey(actor.slot), (result.get(slotKey(actor.slot)) ?? 0) + 1);
  });
  return result;
}

const beforeDeadline = (slot: TimeSlot) => Date.now() + SELF_CHANGE_HOURS * 3600_000 <= startInstant(slot);

function selfChangeOf(timetable: MockTimetable, actor: MockActor): ActorTimetable["selfChange"] {
  if (timetable.selfChangeLocked) return "LOCKED";
  return actor.slot && beforeDeadline(actor.slot) ? "OPEN" : "DEADLINE_PASSED";
}

function toActorView(timetable: MockTimetable, actor: MockActor): ActorTimetable {
  const selfChange = selfChangeOf(timetable, actor);
  const used = counts(timetable);
  const openSlots = selfChange === "OPEN"
    ? slotsOf(timetable).filter((slot) => !sameSlot(slot, actor.slot) && beforeDeadline(slot)
      && (used.get(slotKey(slot)) ?? 0) < timetable.slotCapacity)
    : [];
  const request = timetable.requests.find((candidate) => candidate.actorId === actor.id && candidate.open);
  return {
    title: timetable.title,
    organizerName: timetable.organizerName,
    location: timetable.location,
    guide: timetable.guide,
    actorName: actor.name,
    slot: range(timetable, actor.slot),
    selfChange,
    changeDeadline: actor.slot ? new Date(startInstant(actor.slot) - SELF_CHANGE_HOURS * 3600_000).toISOString() : null,
    selfChangeNoticeHours: SELF_CHANGE_HOURS,
    openSlots: openSlots.map((slot) => range(timetable, slot)!),
    request: request ? { message: request.message, createdAt: request.createdAt } : null,
  } as ActorTimetable;
}

function queue(timetable: MockTimetable, type: AdminTimetableMessageType, actor: MockActor | null) {
  const pending = messages.filter((message) => message.status === "PENDING");
  // 받는 사람이 링크에서 최신 일정을 보므로, 아직 보내지 않은 같은 목적의 문자가 있으면 더 쌓지 않는다.
  if (type === "ACTOR_SCHEDULE_CHANGED" && actor && pending.some((message) => message.actorId === actor.id
    && (message.type === "ACTOR_INVITATION" || message.type === "ACTOR_SCHEDULE_CHANGED"))) return;
  if (type === "ORGANIZER_TIME_REQUEST" && pending.some((message) => message.timetableId === timetable.id
    && message.type === type)) return;
  const origin = typeof window === "undefined" ? "http://localhost:3000" : window.location.origin;
  const actorLink = actor ? `${origin}${timetableRoutes.actor(actor.accessKey)}` : "";
  const manageLink = `${origin}${timetableRoutes.manage(timetable.manageKey)}`;
  const organizerGreeting = `${timetable.organizerName} 담당자님, 안녕하세요.`;
  const actorGreeting = `지원자 ${actor?.name ?? ""}님, 안녕하세요.`;
  const actorCaution = "[주의] 본인만 쓰는 링크입니다. 다른 사람에게 보내지 마세요.";
  const organizerCaution = "[주의] 링크를 가진 사람은 누구나 일정표를 고칠 수 있습니다. 외부에 공유하지 마세요.";
  const compose = (subject: string, greeting: string, content: string, label: string, link: string, caution: string) =>
    `[예술인] ${subject}\n\n${greeting}\n${content}\n\n▶ ${label}\n${link}\n\n${caution}\n\n예술인 ${origin}`;
  const body = {
    ORGANIZER_LINK: compose("오디션 일정표 관리 링크", organizerGreeting,
      `'${timetable.title}' 일정표를 만들었습니다.\n아래 링크에서 합격자 등록과 일정 확정을 할 수 있습니다.`,
      "일정표 관리", manageLink, organizerCaution),
    ORGANIZER_TIME_REQUEST: compose("시간 조정 요청 알림", organizerGreeting,
      `'${timetable.title}' 일정표에 배우의 시간 조정 요청이 들어왔습니다.\n아래 링크에서 확인해 주세요.`,
      "일정표 관리", manageLink, organizerCaution),
    ACTOR_INVITATION: compose("오디션 합격 안내", actorGreeting,
      `${timetable.organizerName} 오디션에 합격하셨습니다.\n아래 링크에서 '${timetable.title}' 일정을 확인해 주세요.`,
      "내 오디션 일정", actorLink, actorCaution),
    ACTOR_SCHEDULE_CHANGED: compose("오디션 일정 변경 안내", actorGreeting,
      `${timetable.organizerName} '${timetable.title}' 일정이 변경되었습니다.\n아래 링크에서 바뀐 시간을 확인해 주세요.`,
      "내 오디션 일정", actorLink, actorCaution),
  }[type];
  messages.push({
    id: nextId(),
    timetableId: timetable.id,
    actorId: actor?.id ?? null,
    type,
    status: "PENDING",
    recipientName: actor?.name ?? timetable.organizerName,
    recipientPhone: actor?.phone ?? timetable.organizerPhone,
    body,
    createdAt: now(),
    sentAt: null,
  });
}

/** 서버처럼 저장 직전에 모든 배정이 바운더리와 정원 안에 있고, 안내한 배우가 비어 있지 않은지 확인한다. */
function boardProblem(timetable: MockTimetable): string | null {
  const offered = new Set(slotsOf(timetable).map(slotKey));
  for (const actor of timetable.actors) {
    if (actor.slot && !offered.has(slotKey(actor.slot))) return `‘${actor.name}’ 배우의 시간이 정한 시간대에서 벗어났습니다.`;
    if (!actor.slot && timetable.status === "PUBLISHED" && actor.invitedAt) return `안내를 받은 ‘${actor.name}’ 배우는 시간을 비워 둘 수 없습니다.`;
  }
  for (const [key, count] of counts(timetable)) {
    if (count > timetable.slotCapacity) return `${key.replace("T", " ")} 칸에 정원 ${timetable.slotCapacity}명보다 많은 배우가 배정됐습니다.`;
  }
  return null;
}

function settingProblem(setting: TimetableSetting): string | null {
  if (!Number.isInteger(setting.slotMinutes) || setting.slotMinutes < 5 || setting.slotMinutes > 240 || setting.slotMinutes % 5 !== 0) {
    return "1인당 소요 시간은 5분 단위로 240분 이하여야 합니다.";
  }
  if (!Number.isInteger(setting.slotCapacity) || setting.slotCapacity < 1 || setting.slotCapacity > 50) return "한 칸의 정원은 1명 이상 50명 이하여야 합니다.";
  if (!setting.windows?.length || setting.windows.length > TIMETABLE_LIMITS.maxWindows) return "오디션을 열 날짜와 시간대를 하나 이상 정해 주세요.";
  for (const window of setting.windows) {
    if (minutesOf(window.startTime) >= minutesOf(window.endTime)) return `${window.date} 시간대의 종료 시각은 시작 시각보다 늦어야 합니다.`;
    if (minutesOf(window.endTime) - minutesOf(window.startTime) < setting.slotMinutes) return `${window.date} 시간대가 1인당 소요 시간보다 짧습니다.`;
  }
  const sorted = [...setting.windows].sort((left, right) => `${left.date}${left.startTime}`.localeCompare(`${right.date}${right.startTime}`));
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    if (previous.date === sorted[index].date && minutesOf(sorted[index].startTime) < minutesOf(previous.endTime)) {
      return `${sorted[index].date}에 서로 겹치는 시간대가 있습니다.`;
    }
  }
  return null;
}

const normalizeSetting = (setting: TimetableSetting): TimetableSetting => ({
  slotMinutes: setting.slotMinutes,
  slotCapacity: setting.slotCapacity,
  windows: setting.windows.map((window) => ({ date: window.date, startTime: toHm(window.startTime), endTime: toHm(window.endTime) })),
});

const toSlot = (value: { date: string; startTime: string } | null | undefined): TimeSlot | null =>
  value ? { date: value.date, startTime: toHm(value.startTime) } : null;

function byManageKey(request: Request): MockTimetable | null {
  const key = request.headers.get(KEY_HEADER) ?? "";
  if (!TIMETABLE_KEY_PATTERN.test(key)) return null;
  return timetables.find((timetable) => timetable.manageKey === key) ?? null;
}

function byAccessKey(request: Request): { timetable: MockTimetable; actor: MockActor } | null {
  const key = request.headers.get(KEY_HEADER) ?? "";
  if (!TIMETABLE_KEY_PATTERN.test(key)) return null;
  for (const timetable of timetables) {
    const actor = timetable.actors.find((candidate) => candidate.accessKey === key);
    if (actor) return timetable.status === "PUBLISHED" && actor.invitedAt ? { timetable, actor } : null;
  }
  return null;
}

function seed() {
  const first = addDays(todayInSeoul(), 7);
  const second = addDays(first, 1);
  const profile = {
    organizerName: "남극장",
    organizerPhone: "010-9000-0000",
    location: "서울 종로구 대학로 12, 남극장 3층 연습실",
    guide: "지정 대사 1분과 자유 연기 1분을 준비해 주세요.\n움직이기 편한 복장으로 오세요.",
  };
  const actor = (name: string, phone: string, slot: string | null, extra: Partial<MockActor> = {}): MockActor => ({
    id: nextId(),
    accessKey: randomKey(),
    name,
    phone,
    slot: slot ? { date: first, startTime: slot } : null,
    invitedAt: null,
    actorChangedAt: null,
    previousSlot: null,
    registeredAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    ...extra,
  });
  timetables.push({
    id: nextId(),
    manageKey: SEED_TIMETABLE_KEYS.draft,
    title: "남극장 정기공연 2차 오디션",
    ...profile,
    slotMinutes: 20,
    slotCapacity: 1,
    windows: [
      { date: first, startTime: "10:00", endTime: "12:00" },
      { date: first, startTime: "13:00", endTime: "15:00" },
      { date: second, startTime: "14:00", endTime: "17:00" },
    ],
    status: "DRAFT",
    publishedAt: null,
    selfChangeLocked: false,
    actors: ["김하늘", "이도윤", "박서연", "최민준", "정하은", "강지호", "윤채원", "임시우"].map((name, index) => (
      actor(name, `010-1000-${String(index + 1).padStart(4, "0")}`, null)
    )),
    requests: [],
  });
  const invitedAt = new Date(Date.now() - 86_400_000).toISOString();
  const kim = actor("김배우", "010-2000-0001", "10:00", { accessKey: SEED_TIMETABLE_KEYS.actor, invitedAt });
  const lee = actor("이배우", "010-2000-0002", "10:30", {
    invitedAt,
    actorChangedAt: new Date(Date.now() - 3_600_000).toISOString(),
    previousSlot: { date: first, startTime: "11:00" },
  });
  const park = actor("박배우", "010-2000-0003", "11:30", { invitedAt });
  const choi = actor("최배우", "010-2000-0004", "11:30", { invitedAt });
  const jung = actor("정배우", "010-2000-0005", null, { registeredAt: new Date(Date.now() - 3_600_000).toISOString() });
  const published: MockTimetable = {
    id: nextId(),
    manageKey: SEED_TIMETABLE_KEYS.published,
    title: "남극장 신작 리딩 오디션",
    ...profile,
    slotMinutes: 30,
    slotCapacity: 2,
    windows: [
      { date: first, startTime: "10:00", endTime: "13:00" },
      { date: second, startTime: "15:00", endTime: "18:00" },
    ],
    status: "PUBLISHED",
    publishedAt: invitedAt,
    selfChangeLocked: false,
    actors: [kim, lee, park, choi, jung],
    requests: [{ id: nextId(), actorId: choi.id, message: "그 주에 지방 공연이 있어서 다음 주 평일 저녁이면 좋겠습니다.", open: true, createdAt: now() }],
  };
  timetables.push(published);
  [kim, lee, park, choi].forEach((invitee) => queue(published, "ACTOR_INVITATION", invitee));
  queue(published, "ORGANIZER_TIME_REQUEST", null);
}

seed();

export const timetableHandlers = [
  http.post(API, async ({ request }) => {
    await delay(200);
    const body = await request.json() as { profile: TimetableProfile; setting: TimetableSetting };
    if (!body.profile?.title?.trim() || !body.profile.organizerName?.trim()) return invalid("일정표 이름과 단체명을 입력해 주세요.");
    if (!/^01\d-\d{3,4}-\d{4}$/.test(body.profile.organizerPhone ?? "")) return invalid("담당자 휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.");
    const problem = settingProblem(body.setting);
    if (problem) return invalid(problem);
    const timetable: MockTimetable = {
      id: nextId(),
      manageKey: randomKey(),
      ...body.profile,
      ...normalizeSetting(body.setting),
      status: "DRAFT",
      publishedAt: null,
      selfChangeLocked: false,
      actors: [],
      requests: [],
    };
    timetables.push(timetable);
    queue(timetable, "ORGANIZER_LINK", null);
    return HttpResponse.json({ manageKey: timetable.manageKey, timetable: toBoard(timetable) }, { status: 201 });
  }),

  http.get(`${API}/manage`, async ({ request }) => {
    await delay(160);
    const timetable = byManageKey(request);
    return timetable ? HttpResponse.json(toBoard(timetable)) : notFound();
  }),

  http.put(`${API}/manage/profile`, async ({ request }) => {
    await delay(160);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    const body = await request.json() as TimetableProfile;
    if (!body.title?.trim() || !body.organizerName?.trim()) return invalid("일정표 이름과 단체명을 입력해 주세요.");
    Object.assign(timetable, body);
    return HttpResponse.json(toBoard(timetable));
  }),

  http.put(`${API}/manage/board`, async ({ request }) => {
    await delay(220);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    const body = await request.json() as {
      setting: TimetableSetting;
      assignments: { actorId: number; previous: TimeSlot | null; next: TimeSlot | null }[];
    };
    const problem = settingProblem(body.setting);
    if (problem) return invalid(problem);
    // 서버처럼 저장한 시간대는 줄이거나 바꿀 수 없고 늘리기만 한다.
    const nextSetting = normalizeSetting(body.setting);
    const nextSlots = new Set(slotsOf(nextSetting).map(slotKey));
    if (nextSetting.slotMinutes !== timetable.slotMinutes) return apiError(409, "TIMETABLE_SETTING_NOT_EXTENDABLE", "오디션 진행 시간은 바꿀 수 없습니다.");
    if (nextSetting.slotCapacity < timetable.slotCapacity) return apiError(409, "TIMETABLE_SETTING_NOT_EXTENDABLE", "동시 오디션 인원은 줄일 수 없습니다.");
    if (!slotsOf(timetable).every((slot) => nextSlots.has(slotKey(slot)))) {
      return apiError(409, "TIMETABLE_SETTING_NOT_EXTENDABLE", "저장한 시간대는 줄이거나 바꿀 수 없고 늘리기만 할 수 있습니다.");
    }
    const snapshot = structuredClone({ setting: normalizeSetting(timetable), actors: timetable.actors });
    Object.assign(timetable, normalizeSetting(body.setting));
    const moved: MockActor[] = [];
    for (const assignment of body.assignments) {
      const actor = timetable.actors.find((candidate) => candidate.id === assignment.actorId);
      if (!actor) {
        Object.assign(timetable, snapshot.setting, { actors: snapshot.actors });
        return apiError(404, "TIMETABLE_ACTOR_NOT_FOUND", "배우를 찾을 수 없습니다.");
      }
      if (!sameSlot(actor.slot, toSlot(assignment.previous))) {
        Object.assign(timetable, snapshot.setting, { actors: snapshot.actors });
        return apiError(409, "TIMETABLE_ASSIGNMENT_CONFLICT", `‘${actor.name}’ 배우의 시간이 그사이 바뀌었습니다. 새로 불러온 뒤 다시 옮겨 주세요.`);
      }
      actor.slot = toSlot(assignment.next);
      actor.actorChangedAt = null;
      actor.previousSlot = null;
      moved.push(actor);
    }
    const boardError = boardProblem(timetable);
    if (boardError) {
      Object.assign(timetable, snapshot.setting, { actors: snapshot.actors });
      return apiError(409, "TIMETABLE_SLOT_UNAVAILABLE", boardError);
    }
    if (timetable.status === "PUBLISHED") {
      moved.filter((actor) => actor.invitedAt).forEach((actor) => queue(timetable, "ACTOR_SCHEDULE_CHANGED", actor));
      timetable.actors.filter((actor) => actor.slot && !actor.invitedAt).forEach((actor) => {
        actor.invitedAt = now();
        queue(timetable, "ACTOR_INVITATION", actor);
      });
      timetable.requests.filter((item) => moved.some((actor) => actor.id === item.actorId)).forEach((item) => { item.open = false; });
    }
    return HttpResponse.json(toBoard(timetable));
  }),

  http.post(`${API}/manage/actors`, async ({ request }) => {
    await delay(200);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    const body = await request.json() as { actors: { name: string; phone: string }[] };
    if (!body.actors?.length) return invalid("등록할 배우를 한 명 이상 입력해 주세요.");
    if (timetable.actors.length + body.actors.length > TIMETABLE_LIMITS.maxActors) {
      return apiError(409, "TIMETABLE_TOO_MANY_ACTORS", `한 일정표에는 배우를 ${TIMETABLE_LIMITS.maxActors}명까지 등록할 수 있습니다.`);
    }
    const phones = new Map(timetable.actors.map((actor) => [actor.phone, actor.name]));
    for (const contact of body.actors) {
      if (!/^01\d-\d{3,4}-\d{4}$/.test(contact.phone)) return invalid("휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.");
      const existing = phones.get(contact.phone);
      if (existing) return apiError(409, "TIMETABLE_DUPLICATE_ACTOR", `${contact.phone} 번호는 ‘${existing}’ 배우로 이미 등록돼 있습니다.`);
      phones.set(contact.phone, contact.name);
    }
    body.actors.forEach((contact) => timetable.actors.push({
      id: nextId(),
      accessKey: randomKey(),
      name: contact.name.trim(),
      phone: contact.phone,
      slot: null,
      invitedAt: null,
      actorChangedAt: null,
      previousSlot: null,
      registeredAt: now(),
    }));
    return HttpResponse.json(toBoard(timetable), { status: 201 });
  }),

  http.delete(`${API}/manage/actors/:actorId`, async ({ request, params }) => {
    await delay(160);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    const actorId = Number(params.actorId);
    if (!timetable.actors.some((actor) => actor.id === actorId)) return apiError(404, "TIMETABLE_ACTOR_NOT_FOUND", "배우를 찾을 수 없습니다.");
    timetable.actors = timetable.actors.filter((actor) => actor.id !== actorId);
    timetable.requests = timetable.requests.filter((item) => item.actorId !== actorId);
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].actorId === actorId && messages[index].status === "PENDING") messages.splice(index, 1);
    }
    return HttpResponse.json(toBoard(timetable));
  }),

  http.post(`${API}/manage/publication`, async ({ request }) => {
    await delay(220);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    if (timetable.status === "PUBLISHED") return apiError(409, "TIMETABLE_NOT_PUBLISHABLE", "이미 확정한 일정표입니다.");
    if (timetable.actors.length === 0) return apiError(409, "TIMETABLE_NOT_PUBLISHABLE", "배우를 한 명 이상 등록해 주세요.");
    const unassigned = timetable.actors.filter((actor) => !actor.slot).length;
    if (unassigned > 0) return apiError(409, "TIMETABLE_NOT_PUBLISHABLE", `아직 시간이 정해지지 않은 배우가 ${unassigned}명 있습니다.`);
    timetable.status = "PUBLISHED";
    timetable.publishedAt = now();
    timetable.actors.forEach((actor) => {
      actor.invitedAt = now();
      queue(timetable, "ACTOR_INVITATION", actor);
    });
    return HttpResponse.json(toBoard(timetable));
  }),

  http.put(`${API}/manage/self-change-lock`, async ({ request }) => {
    await delay(140);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    timetable.selfChangeLocked = Boolean(((await request.json()) as { locked: boolean }).locked);
    return HttpResponse.json(toBoard(timetable));
  }),

  http.post(`${API}/manage/requests/:requestId/resolution`, async ({ request, params }) => {
    await delay(140);
    const timetable = byManageKey(request);
    if (!timetable) return notFound();
    const target = timetable.requests.find((item) => item.id === Number(params.requestId));
    if (!target) return apiError(404, "TIMETABLE_REQUEST_NOT_FOUND", "요청을 찾을 수 없습니다.");
    target.open = false;
    return HttpResponse.json(toBoard(timetable));
  }),

  http.get(`${API}/actor`, async ({ request }) => {
    await delay(160);
    const access = byAccessKey(request);
    return access ? HttpResponse.json(toActorView(access.timetable, access.actor)) : notFound();
  }),

  http.put(`${API}/actor/slot`, async ({ request }) => {
    await delay(200);
    const access = byAccessKey(request);
    if (!access) return notFound();
    const { timetable, actor } = access;
    const body = await request.json() as { current: TimeSlot; next: TimeSlot };
    const current = toSlot(body.current);
    const next = toSlot(body.next);
    if (!sameSlot(actor.slot, current)) return apiError(409, "TIMETABLE_ASSIGNMENT_CONFLICT", "일정이 그사이 바뀌었습니다. 새로고침한 뒤 다시 골라 주세요.");
    const status = selfChangeOf(timetable, actor);
    if (status !== "OPEN") return apiError(409, "TIMETABLE_SELF_CHANGE_CLOSED", status === "LOCKED" ? "기획사가 일정 변경을 마감했습니다." : "오디션 시작 24시간 전까지만 직접 바꿀 수 있습니다.");
    const open = next && toActorView(timetable, actor).openSlots.some((slot) => sameSlot(slot, next));
    if (!open || !next) return apiError(409, "TIMETABLE_SLOT_UNAVAILABLE", "선택한 시간은 이미 찼거나 바꿀 수 없는 시간입니다. 다른 시간을 골라 주세요.");
    if (!actor.actorChangedAt) actor.previousSlot = actor.slot;
    actor.slot = next;
    actor.actorChangedAt = now();
    timetable.requests.filter((item) => item.actorId === actor.id).forEach((item) => { item.open = false; });
    return HttpResponse.json(toActorView(timetable, actor));
  }),

  http.post(`${API}/actor/requests`, async ({ request }) => {
    await delay(200);
    const access = byAccessKey(request);
    if (!access) return notFound();
    const { timetable, actor } = access;
    const message = String(((await request.json()) as { message: string }).message ?? "").trim();
    if (!message || message.length > TIMETABLE_LIMITS.requestLength) return invalid("요청 내용은 1자 이상 300자 이하로 적어 주세요.");
    const open = timetable.requests.find((item) => item.actorId === actor.id && item.open);
    if (open) open.message = message;
    else timetable.requests.push({ id: nextId(), actorId: actor.id, message, open: true, createdAt: now() });
    queue(timetable, "ORGANIZER_TIME_REQUEST", null);
    return HttpResponse.json(toActorView(timetable, actor));
  }),

  http.get("/api/v1/admin/timetable-messages", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(140);
    const role = mockSessionRole();
    if (!role) return apiError(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
    if (role !== "ADMIN") return apiError(403, "AUTH_FORBIDDEN", "접근 권한이 없습니다.");
    const status = new URL(request.url).searchParams.get("status") === "SENT" ? "SENT" : "PENDING";
    const list = messages.filter((message) => message.status === status);
    const ordered = status === "PENDING" ? list : [...list].sort((left, right) => (right.sentAt ?? "").localeCompare(left.sentAt ?? ""));
    return HttpResponse.json({
      pendingCount: messages.filter((message) => message.status === "PENDING").length,
      messages: ordered.map(toAdminMessage),
    });
  }),

  http.post("/api/v1/admin/timetable-messages/completion", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(140);
    if (mockSessionRole() !== "ADMIN") return apiError(403, "AUTH_FORBIDDEN", "접근 권한이 없습니다.");
    const ids = ((await request.json()) as { messageIds: number[] }).messageIds ?? [];
    const targets = messages.filter((message) => ids.includes(message.id));
    if (targets.length !== new Set(ids).size) return apiError(404, "TIMETABLE_MESSAGE_NOT_FOUND", "문자를 찾을 수 없습니다.");
    targets.forEach((message) => {
      if (message.status === "PENDING") {
        message.status = "SENT";
        message.sentAt = now();
      }
    });
    return HttpResponse.json({ messages: targets.map(toAdminMessage) });
  }),
];

function toAdminMessage(message: MockMessage): AdminTimetableMessage {
  const timetable = timetables.find((candidate) => candidate.id === message.timetableId);
  return {
    id: message.id,
    type: message.type,
    status: message.status,
    timetableTitle: timetable?.title ?? "",
    organizerName: timetable?.organizerName ?? "",
    recipientName: message.recipientName,
    recipientPhone: message.recipientPhone,
    body: message.body,
    createdAt: message.createdAt,
    sentAt: message.sentAt,
  };
}
