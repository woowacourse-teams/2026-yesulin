import { request } from "@/features/auditions/api-client";
import { toHm } from "./time";
import type {
  ActorContact,
  ActorTimetable,
  SlotAssignment,
  TimeSlot,
  TimeSlotRange,
  TimetableBoard,
  TimetableCreated,
  TimetableProfile,
  TimetableSetting,
  TimetableWindow,
} from "./types";

const TIMETABLES_PATH = "/v1/timetables";
/** 열쇠는 요청 로그에 남지 않도록 경로가 아니라 이 헤더로 보낸다. */
export const TIMETABLE_KEY_HEADER = "X-Timetable-Key";

const keyHeaders = (key: string) => ({ [TIMETABLE_KEY_HEADER]: key });

const toRange = <T extends TimeSlotRange | null>(slot: T): T =>
  (slot ? { date: slot.date, startTime: toHm(slot.startTime), endTime: toHm(slot.endTime) } : null) as T;

const toWindow = (window: TimetableWindow): TimetableWindow => ({
  date: window.date,
  startTime: toHm(window.startTime),
  endTime: toHm(window.endTime),
});

function toBoard(board: TimetableBoard): TimetableBoard {
  return {
    ...board,
    windows: board.windows.map(toWindow),
    actors: board.actors.map((actor) => ({
      ...actor,
      slot: toRange(actor.slot),
      previousSlot: toRange(actor.previousSlot),
    })),
  };
}

function toActorTimetable(timetable: ActorTimetable): ActorTimetable {
  return { ...timetable, slot: toRange(timetable.slot), openSlots: timetable.openSlots.map(toRange) };
}

function profileBody(profile: TimetableProfile) {
  return {
    title: profile.title.trim(),
    organizerName: profile.organizerName.trim(),
    organizerPhone: profile.organizerPhone.trim(),
    location: profile.location.trim(),
    guide: profile.guide.trim(),
  };
}

function settingBody(setting: TimetableSetting) {
  return {
    slotMinutes: setting.slotMinutes,
    slotCapacity: setting.slotCapacity,
    windows: setting.windows.map(toWindow),
  };
}

const slotBody = (slot: TimeSlot | null) => (slot ? { date: slot.date, startTime: toHm(slot.startTime) } : null);

export async function createTimetable(profile: TimetableProfile, setting: TimetableSetting): Promise<TimetableCreated> {
  const created = await request<TimetableCreated>(TIMETABLES_PATH, {
    method: "POST",
    body: JSON.stringify({ profile: profileBody(profile), setting: settingBody(setting) }),
  });
  return { manageKey: created.manageKey, timetable: toBoard(created.timetable) };
}

export async function getTimetableBoard(manageKey: string): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage`, { headers: keyHeaders(manageKey) }));
}

export async function updateTimetableProfile(manageKey: string, profile: TimetableProfile): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/profile`, {
    method: "PUT",
    headers: keyHeaders(manageKey),
    body: JSON.stringify(profileBody(profile)),
  }));
}

/** 시간대 설정은 통째로, 배정은 옮긴 배우만 보낸다. */
export async function saveTimetableBoard(
  manageKey: string,
  setting: TimetableSetting,
  assignments: readonly SlotAssignment[],
): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/board`, {
    method: "PUT",
    headers: keyHeaders(manageKey),
    body: JSON.stringify({
      setting: settingBody(setting),
      assignments: assignments.map((assignment) => ({
        actorId: assignment.actorId,
        previous: slotBody(assignment.previous),
        next: slotBody(assignment.next),
      })),
    }),
  }));
}

export async function registerTimetableActors(
  manageKey: string,
  actors: readonly ActorContact[],
): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/actors`, {
    method: "POST",
    headers: keyHeaders(manageKey),
    body: JSON.stringify({ actors: actors.map((actor) => ({ name: actor.name.trim(), phone: actor.phone.trim() })) }),
  }));
}

export async function removeTimetableActor(manageKey: string, actorId: number): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/actors/${actorId}`, {
    method: "DELETE",
    headers: keyHeaders(manageKey),
  }));
}

export async function publishTimetable(manageKey: string): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/publication`, {
    method: "POST",
    headers: keyHeaders(manageKey),
  }));
}

export async function changeSelfChangeLock(manageKey: string, locked: boolean): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/self-change-lock`, {
    method: "PUT",
    headers: keyHeaders(manageKey),
    body: JSON.stringify({ locked }),
  }));
}

export async function resolveTimetableRequest(manageKey: string, requestId: number): Promise<TimetableBoard> {
  return toBoard(await request<TimetableBoard>(`${TIMETABLES_PATH}/manage/requests/${requestId}/resolution`, {
    method: "POST",
    headers: keyHeaders(manageKey),
  }));
}

export async function getActorTimetable(accessKey: string): Promise<ActorTimetable> {
  return toActorTimetable(await request<ActorTimetable>(`${TIMETABLES_PATH}/actor`, {
    headers: keyHeaders(accessKey),
  }));
}

/** `current`는 화면이 본 지금 시간이다. 그사이 기획사가 옮겼으면 서버가 거절한다. */
export async function changeActorSlot(accessKey: string, current: TimeSlot, next: TimeSlot): Promise<ActorTimetable> {
  return toActorTimetable(await request<ActorTimetable>(`${TIMETABLES_PATH}/actor/slot`, {
    method: "PUT",
    headers: keyHeaders(accessKey),
    body: JSON.stringify({ current: slotBody(current), next: slotBody(next) }),
  }));
}

export async function requestActorTime(accessKey: string, message: string): Promise<ActorTimetable> {
  return toActorTimetable(await request<ActorTimetable>(`${TIMETABLES_PATH}/actor/requests`, {
    method: "POST",
    headers: keyHeaders(accessKey),
    body: JSON.stringify({ message: message.trim() }),
  }));
}
