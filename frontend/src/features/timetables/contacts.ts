import { TIMETABLE_LIMITS, type ActorContact } from "./types";

export type ContactLineError = {
  readonly line: number;
  readonly text: string;
  readonly message: string;
};

export type ParsedContacts = {
  readonly contacts: readonly ActorContact[];
  readonly errors: readonly ContactLineError[];
};

const PHONE_IN_TEXT = /(?:\+?82[\s-]?)?0?1[016789](?:[\s.-]?\d){7,8}/;

/** 01012345678, 010 1234 5678, +82 10-1234-5678을 010-1234-5678로 맞춘다. 휴대폰 번호가 아니면 null. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("82")) digits = `0${digits.slice(2)}`;
  if (!/^01\d{8,9}$/.test(digits)) return null;
  return digits.length === 10
    ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 입력하는 동안 휴대폰 번호에 하이픈을 넣는다. 01012345678 → 010-1234-5678, 10자리는 010-123-4567. */
export function formatPhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 엑셀·메모에서 붙여 넣은 여러 줄을 이름·번호로 나눈다. 한 줄에 한 명이며 순서와 구분자(공백·탭·쉼표)는 자유롭다.
 * 탭·쉼표로 칸이 나뉘면 번호가 아닌 첫 칸을 이름으로 쓴다(배역 등 나머지 칸은 무시).
 */
export function parseContacts(text: string): ParsedContacts {
  const contacts: ActorContact[] = [];
  const errors: ContactLineError[] = [];
  const seen = new Map<string, number>();
  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const parsed = parseLine(trimmed);
    if ("message" in parsed) {
      errors.push({ line, text: trimmed, message: parsed.message });
      return;
    }
    const duplicateLine = seen.get(parsed.phone);
    if (duplicateLine) {
      errors.push({ line, text: trimmed, message: `${duplicateLine}번째 줄과 번호가 같아요.` });
      return;
    }
    seen.set(parsed.phone, line);
    contacts.push(parsed);
  });
  return { contacts, errors };
}

function parseLine(line: string): ActorContact | { readonly message: string } {
  const cells = line.split(/[\t,]/).map((cell) => cell.trim()).filter(Boolean);
  let phone: string | null = null;
  let name = "";
  if (cells.length > 1) {
    const phoneCell = cells.find((cell) => normalizePhone(cell));
    phone = phoneCell ? normalizePhone(phoneCell) : null;
    name = cells.find((cell) => cell !== phoneCell && !normalizePhone(cell)) ?? "";
  } else {
    const match = line.match(PHONE_IN_TEXT);
    phone = match ? normalizePhone(match[0]) : null;
    name = match ? line.replace(match[0], " ") : line;
  }
  name = name.replace(/\s+/g, " ").trim();
  if (!phone) return { message: "휴대폰 번호(010-1234-5678)를 찾지 못했어요." };
  if (!name) return { message: "이름이 없어요." };
  if (name.length > TIMETABLE_LIMITS.actorNameLength) {
    return { message: `이름은 ${TIMETABLE_LIMITS.actorNameLength}자 이하로 적어 주세요.` };
  }
  return { name, phone };
}
