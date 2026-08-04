/**
 * 시드 고정 난수. 새로고침해도 같은 목 데이터가 나오도록 LCG를 직접 돌린다
 * (Math.random을 쓰면 화면을 볼 때마다 인원·통계가 바뀌어 비교가 불가능하다).
 */
const MULTIPLIER = 1103515245;
const INCREMENT = 12345;
const MODULUS = 0x7fffffff;

export function createRandom(seed: number) {
  let current = seed;

  const next = () => {
    current = (current * MULTIPLIER + INCREMENT) & MODULUS;
    return current / MODULUS;
  };

  return {
    next,
    int: (max: number) => Math.floor(next() * max),
    pick: <T>(items: readonly T[], fallback: T): T => items[Math.floor(next() * items.length)] ?? fallback,
  };
}

export type Random = ReturnType<typeof createRandom>;

export const SCREENING_SEED = 20260803;
