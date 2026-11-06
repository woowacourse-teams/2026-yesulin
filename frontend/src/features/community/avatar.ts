/** 파란 별 마스코트를 이만큼 돌려 다른 색 별로 만든다. 0은 원래 파란색이다. */
const AVATAR_HUES = [0, 30, 60, 100, 150, 190, 230, 270, 300, 330] as const;

/**
 * 같은 글 안에서 같은 작성자는 같은 색이 되도록 글 번호와 표시 이름으로 색을 고른다.
 * 계정 정보는 쓰지 않아 다른 글에서는 같은 사람이라도 다른 색이 될 수 있다.
 */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return AVATAR_HUES[hash % AVATAR_HUES.length];
}
