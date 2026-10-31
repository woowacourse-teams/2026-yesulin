import type { PassedContact } from "./use-passed-contacts";

export const contactLabels = {
  LOADING: "불러오는 중…", PROCESSING: "PDF 처리 중", MISSING: "번호 미확인",
  MULTIPLE: "번호 여러 개 · 원문 확인", ERROR: "조회 실패 · 다시 불러와 주세요",
  EXTRACTION_FAILED: "PDF 처리 실패 · 원문 확인",
};
export const emailLabels = { ...contactLabels, MISSING: "이메일 미확인", MULTIPLE: "이메일 여러 개 · 원문 확인" };

// 탭/줄바꿈이 다른 셀을 만들거나 지원서의 값이 스프레드시트 수식으로 실행되지 않게 한다.
function cell(value: string) {
  const text = value.replace(/[\t\r\n\u0000-\u001f]/g, " ").trim();
  return /^[=+@-]/.test(text) ? `'${text}` : text;
}

export function contactsClipboardText(rows: readonly PassedContact[]): string {
  return [["이름", "배역", "전화번호", "이메일"], ...rows.map(({ entry, roleName, contact, email }) => [
    entry.applicantName || "이름 미확인", roleName,
    contact.status === "FOUND" ? contact.phone : contactLabels[contact.status],
    email.status === "FOUND" ? email.email : emailLabels[email.status],
  ])].map(row => row.map(cell).join("\t")).join("\n");
}
