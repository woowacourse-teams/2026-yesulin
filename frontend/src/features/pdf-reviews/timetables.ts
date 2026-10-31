import { request } from "@/features/auditions/api-client";
import { normalizePhone } from "@/features/timetables/contacts";
import type { ReviewDecision, ReviewKey } from "./types";

export type RosterSummary = { id: number; title: string; actorCount: number };
export type RosterSlot = { date: string; startTime: string };
export type RosterAssignment = { actorId: number; slot: RosterSlot | null; previousSlot: RosterSlot | null };
export type RosterActor = {
  id: number; name: string; phone: string | null; email: string; roleName: string;
  sourceReviewId: string; sourceApplicantId: string; sourceDecision: ReviewDecision | null; slot: RosterSlot | null;
};
export type RosterDetail = { id: number; title: string; actors: RosterActor[] };
export type RosterContact = { entryId: string; name: string; phone: string; email: string };
const base = "/v1/producer-timetables";
export const listRosters = (signal?: AbortSignal) => request<RosterSummary[]>(base, { signal, cache: "no-store" });
export const fetchRoster = (id: number, signal?: AbortSignal) => request<RosterDetail>(`${base}/${id}`, { signal, cache: "no-store" });
export const createRoster = (title: string, creationKey: string) => request<RosterDetail>(base, {
  method: "POST", body: JSON.stringify({ title, creationKey }),
});
export const importRoster = (id: number, reviewId: ReviewKey, actors: readonly RosterContact[]) =>
  request<RosterDetail>(`${base}/${id}/imports`, { method: "POST", body: JSON.stringify({ reviewId, actors }) });
export const editRosterContact = (id: number, previous: RosterActor, next: RosterContact) =>
  request<RosterDetail>(`${base}/${id}/actors/${previous.id}`, { method: "PATCH", body: JSON.stringify({
    name: next.name, phone: next.phone, email: next.email,
    previousName: previous.name, previousPhone: previous.phone, previousEmail: previous.email,
  }) });
export const removeRosterActor = (id: number, actorId: number) => request<RosterDetail>(`${base}/${id}/actors/${actorId}`, { method: "DELETE" });

export const saveRosterAssignments = (id: number, assignments: RosterAssignment[]) =>
  request<RosterDetail>(`${base}/${id}/assignments`, { method: "PATCH", body: JSON.stringify({ assignments }) });

/** 빈 연락처는 허용하고 입력한 값만 검증한다. */
export function readRosterContact(value: RosterContact): { value: RosterContact; error: string } {
  const name = value.name.trim();
  const phone = value.phone.trim() ? /^[+\d\s().-]+$/.test(value.phone) ? normalizePhone(value.phone) : null : "";
  const email = value.email.trim();
  const error = !name ? "이름을 입력해 주세요." : name.length > 30 ? "이름은 30자 이하로 입력해 주세요."
    : phone === null ? "전화번호를 확인하거나 비워 주세요."
    : email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ? "이메일 주소를 확인해 주세요." : "";
  return { value: { ...value, name, phone: phone ?? "", email }, error };
}
