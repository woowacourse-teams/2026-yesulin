import { formatSlotRange } from "./time";
import type { TimetableBoard } from "./types";

export const INVITATION_PLACEHOLDERS = [
  { token: "{이름}", label: "배우 이름" },
  { token: "{오디션일시}", label: "오디션 일시" },
  { token: "{작품명}", label: "작품명" },
  { token: "{단체명}", label: "단체명" },
  { token: "{장소}", label: "장소" },
  { token: "{안내사항}", label: "안내 사항" },
] as const;

export type InvitationValues = {
  readonly actorName: string;
  readonly title: string;
  readonly organizerName: string;
  readonly schedule: string;
  readonly location: string;
  readonly guide: string;
};

export function renderInvitation(template: string, values: InvitationValues): string {
  return template
    .replaceAll("{이름}", values.actorName)
    .replaceAll("{작품명}", values.title)
    .replaceAll("{단체명}", values.organizerName)
    .replaceAll("{오디션일시}", values.schedule)
    .replaceAll("{장소}", values.location)
    .replaceAll("{안내사항}", values.guide);
}

export function previewValues(board: TimetableBoard): InvitationValues {
  const actor = board.actors.find((candidate) => candidate.slot) ?? null;
  return {
    actorName: actor?.name ?? "홍길동",
    title: board.title,
    organizerName: board.organizerName,
    schedule: actor?.slot ? formatSlotRange(actor.slot, actor.slot.endTime) : "10월 10일 (토) 10:00~10:20",
    location: board.location,
    guide: board.guide,
  };
}
