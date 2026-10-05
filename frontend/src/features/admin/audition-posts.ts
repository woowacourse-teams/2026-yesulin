/**
 * 운영자가 붙여 넣은 값에서 OTR 공고 번호를 꺼낸다. 번호만 넣거나 `https://otr.co.kr/audition/?vid=22397`처럼
 * 원문 주소를 그대로 붙여 넣어도 된다. 번호를 찾지 못하면 null이다.
 */
export function extractOtrId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[0-9]{1,30}$/.test(trimmed)) return trimmed;
  const match = /[?&]vid=([0-9]{1,30})(?:&|#|$)/.exec(trimmed);
  return match ? match[1] : null;
}
