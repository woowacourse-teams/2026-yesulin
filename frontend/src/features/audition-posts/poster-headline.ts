const DECORATION = /[#*@$%★☆♡♥]+|!{2,}|\p{Extended_Pictographic}/gu;
const GENRE_TAG = /<(뮤지컬|연극)>/g;
const QUOTED_WORK = /[<《〈「『“"]\s*([^<>《》〈〉「」『』“”"]{2,30}?)\s*[>》〉」』”"]/g;
const SINGLE_QUOTED_WORK = /[‘']\s*([^‘’']{2,30}?)\s*[’']/g;
const BRACKETED_WORK = /\[\s*([^[\]]{2,30}?)\s*\]/;
const GENRE_ONLY = /^(뮤지컬|연극|아동극|가족뮤지컬|창작뮤지컬|창작극)$/;
const ORGANIZATION_WORDS = /극단|단원|컴퍼니|극장|프로덕션/;
const NOTICE_WORDS = /모집|공고|오디션|긴급|급구|수정|공모|지원마감|배우|구인/;
const LEADING_NOISE = /^(?:[\s,.]*(?:\([^)]*\)|\[[^\]]*\]|\d{4}(?:-\d{2})?년?|\d{1,2}\/\d{1,2}|\d{1,2}월\s*\d{1,2}일(?:\s*,\s*\d{1,2}일)?|\d{1,2}월-\d{1,2}월))+[\s,.]*/;
const MONEY = /(?:총\s*)?(?:페이|출연료|회당)?\s*[\d,~.]+\s*(?:만\s*|억\s*)?원(?:부터)?|(?:총\s*)?페이\s*[\d,~.]+/g;
const PARENTHESES = /\s*\([^)]*\)/g;
const SEPARATOR = /\s*(?:\/|_|\s-\s|\||,)\s*/;
const POLITE_ENDING = /\s*(?:을|를)?\s*(모집|구인|오디션)?\s*(?:합니다|하실 분|구합니다|모십니다)[.!~]*$/;

/**
 * 이미지 없는 공고의 기본 포스터에 크게 쓸 문구.
 * 꺾쇠·따옴표·대괄호 안의 작품명을 우선하고, 없으면 날짜·금액·괄호·장식을 걷어낸 제목 앞부분을 쓴다.
 */
export function posterHeadline(title: string): string {
  const text = withoutDecoration(title);
  const headline = quotedWork(text) ?? singleQuotedWork(text) ?? bracketedWork(text) ?? summarized(text);
  if (headline) return headline;
  return collapseSpaces(text.replace(/[[\]()]/g, " "));
}

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function withoutDecoration(title: string): string {
  return collapseSpaces(title.replace(DECORATION, " ").replace(GENRE_TAG, "$1 "));
}

function quotedWork(title: string): string | undefined {
  return [...title.matchAll(QUOTED_WORK)].map((match) => match[1].trim()).find((work) => !GENRE_ONLY.test(work));
}

function singleQuotedWork(title: string): string | undefined {
  return [...title.matchAll(SINGLE_QUOTED_WORK)].map((match) => match[1].trim()).find((work) => !ORGANIZATION_WORDS.test(work));
}

function bracketedWork(title: string): string | undefined {
  const work = title.match(BRACKETED_WORK)?.[1];
  if (work && !NOTICE_WORDS.test(work)) return work;
  return undefined;
}

function summarized(title: string): string {
  const core = collapseSpaces(title.replace(LEADING_NOISE, "").replace(MONEY, " ").replace(PARENTHESES, " "));
  const firstPart = core.split(SEPARATOR)[0] || core;
  const ending = firstPart.match(POLITE_ENDING);
  if (!ending) return firstPart.trim();
  return `${firstPart.slice(0, ending.index).trim()} ${ending[1] ?? "모집"}`.trim();
}
