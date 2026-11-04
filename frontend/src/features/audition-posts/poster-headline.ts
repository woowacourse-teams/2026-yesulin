const DECORATION = /[#*]+/g;
const QUOTED_WORK = /[<《〈「『“"]\s*([^<>《》〈〉「」『』“”"]{2,30}?)\s*[>》〉」』”"]/;
const BRACKETED_WORK = /\[\s*([^[\]]{2,30}?)\s*\]/;
const NOTICE_WORDS = /모집|공고|오디션|긴급|수정/;

/** 이미지 없는 공고의 기본 포스터에 크게 쓸 작품명. 꺾쇠·따옴표 안의 작품명을 우선하고 없으면 제목 전체를 쓴다. */
export function posterHeadline(title: string): string {
  const cleaned = title.replace(DECORATION, " ").replace(/\s+/g, " ").trim();
  const quoted = cleaned.match(QUOTED_WORK)?.[1];
  if (quoted) return quoted;
  const bracketed = cleaned.match(BRACKETED_WORK)?.[1];
  if (bracketed && !NOTICE_WORDS.test(bracketed)) return bracketed;
  return cleaned;
}
