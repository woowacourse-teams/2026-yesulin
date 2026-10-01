export const NOTICE_PREFIX = "오디션 일시: {오디션일시}";

export function noticeTemplate(instructions: string) {
  return instructions.trim() ? `${NOTICE_PREFIX}\n\n${instructions}` : NOTICE_PREFIX;
}

// 고정 안내문을 제외한 추가 안내사항만 편집기에 표시한다.
export function noticeInstructions(template: string): string | null {
  if (template === NOTICE_PREFIX) return "";
  return template.startsWith(`${NOTICE_PREFIX}\n\n`) ? template.slice(NOTICE_PREFIX.length + 2) : null;
}

export function needsNoticeRefresh(deliveries: { status: string; providerId: string | null }[]) {
  return deliveries.some(d => ["QUEUED", "SENDING", "ACCEPTED"].includes(d.status)
    || (d.status === "UNKNOWN" && d.providerId !== null));
}

export function completeAppointment(value: string | null) {
  return !!value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);
}

export function renderNoticeBody(template: string, name: string, appointment: string | null, header: string, footer: string) {
  const body = template.replaceAll("\r\n", "\n").replaceAll("{이름}", name)
    .replaceAll("{오디션일시}", completeAppointment(appointment) ? appointment!.replace("T", " ") : "일시를 선택해 주세요").trimEnd();
  return `${header ? `${header.replaceAll("{이름}", name)}\n\n` : ""}${body}\n\n${footer}`;
}
