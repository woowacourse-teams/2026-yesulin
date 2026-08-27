/**
 * 프로필에서는 외부 링크를 여러 개 등록할 수 있는데 지원서는 한 개만 받아 서로 맞지 않았다.
 * 제출 계약은 이미 링크 목록을 받으므로 지원서도 프로필과 같은 개수까지 받는다.
 * 첫 칸은 기존과 같은 LINK를 쓰고 두 번째부터 LINK.1, LINK.2로 이어 붙인다.
 */
export const MAX_APPLICATION_LINKS = 5;

export function applicationLinkKey(index: number) {
  return index === 0 ? "LINK" : `LINK.${index}`;
}

export function applicationLinkKeys() {
  return Array.from({ length: MAX_APPLICATION_LINKS }, (_, index) => applicationLinkKey(index));
}

/** 빈 칸을 걸러 낸 제출용 링크 목록. */
export function applicationLinks(values: Readonly<Record<string, string>>) {
  return applicationLinkKeys()
    .map((key) => (values[key] ?? "").trim())
    .filter((link) => link.length > 0);
}

/** 한 칸을 지우면 뒤 칸을 앞으로 당겨 빈 칸이 가운데 남지 않게 한다. */
export function removedLinkValues(values: Readonly<Record<string, string>>, index: number) {
  const remaining = applicationLinkKeys()
    .map((key) => values[key] ?? "")
    .filter((_, candidate) => candidate !== index);
  return Object.fromEntries(applicationLinkKeys().map((key, position) => [key, remaining[position] ?? ""]));
}
