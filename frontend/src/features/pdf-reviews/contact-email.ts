export type ContactEmail =
  | { readonly status: "FOUND"; readonly email: string }
  | { readonly status: "MISSING" | "MULTIPLE"; readonly email: null };

/** PDF에 연속해서 적힌 주소만 읽는다. URL 속 값이나 여러 주소 중 하나를 연락처로 추측하지 않는다. */
export function contactEmail(text: string): ContactEmail {
  const source = text.normalize("NFKC").replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>]+|www\.[^\s<>]+/gi, " ");
  const emails = new Set<string>();
  // 토큰 전체를 검사해 잘못된 주소의 일부를 정상 주소로 잘라내지 않는다.
  for (const match of source.matchAll(/[\p{L}\p{N}.!#$%&'*+/=?^_`{|}~@-]+/gu)) {
    const token = match[0].endsWith(".") && !match[0].endsWith("..") ? match[0].slice(0, -1) : match[0];
    const parts = token.split("@");
    if (parts.length !== 2 || token.length > 254) continue;
    const [local, domain] = parts;
    if (!local || local.length > 64 || !/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i.test(local)
      || local.startsWith(".") || local.endsWith(".") || local.includes("..")) continue;
    const labels = domain.split(".");
    if (labels.length < 2 || !/^[a-z]{2,63}$/i.test(labels.at(-1)!)
      || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) continue;
    // 로컬 부분은 원문 그대로 두고 도메인의 대소문자만 통일한다.
    emails.add(`${local}@${domain.toLowerCase()}`);
  }
  if (emails.size === 1) return { status: "FOUND", email: [...emails][0] };
  return { status: emails.size > 1 ? "MULTIPLE" : "MISSING", email: null };
}
