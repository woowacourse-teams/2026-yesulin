const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 한글 음절은 초성·중성·종성이 28개 단위로 묶여 있어, 나머지가 0이면 받침이 없다. */
const JONGSEONG_COUNT = 28;

/**
 * 받침 유무에 따라 조사를 고른다.
 *
 * 공고마다 항목 이름을 직접 정하므로 문구를 미리 써 둘 수 없다.
 * 그렇다고 "사진을(를)"처럼 두 조사를 함께 두면 읽는 사람이 한 번 더 걸러 읽어야 한다.
 * 마지막 글자가 한글이 아니면 무엇으로 읽을지 알 수 없으므로 그때만 두 조사를 남긴다.
 */
export function withParticle(word: string, withJongseong: string, withoutJongseong: string) {
  const trimmed = word.trim();
  const code = trimmed.slice(-1).codePointAt(0);
  if (code === undefined || code < HANGUL_FIRST || code > HANGUL_LAST) {
    return `${trimmed}${withJongseong}(${withoutJongseong})`;
  }
  return `${trimmed}${(code - HANGUL_FIRST) % JONGSEONG_COUNT === 0 ? withoutJongseong : withJongseong}`;
}

/** 이름 뒤에 붙는 목적격 조사. 예: 사진을 · 경력을 · 키를 */
export const objectParticle = (word: string) => withParticle(word, "을", "를");

/** 이름 뒤에 붙는 주제격 조사. 예: 사진은 · 경력은 · 키는 */
export const topicParticle = (word: string) => withParticle(word, "은", "는");
