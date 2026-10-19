import type { AuditionPostSummary } from "./types";

/** 공고 알림 오픈채팅방 인원. 알림을 본 일부가 공고를 확인했다고 보고 공개 조회수의 하한을 정한다. */
const ALERT_CHAT_MEMBERS = 109;
/** 공고마다 20~35%가 확인한다. */
const MIN_READ_RATE = 0.2;
const READ_RATE_SPREAD = 0.15;
/** 대부분은 공고마다 평균 2~6시간 안에, 일부는 며칠에 걸쳐 확인한다. */
const MIN_READ_HOURS = 2;
const READ_HOURS_SPREAD = 4;
const LATE_READER_RATE = 0.15;
const LATE_READ_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;
const CLOCK_STEP_MS = 10 * 60 * 1000;

/** 같은 문자열이면 항상 같은 [0, 1) 값. FNV-1a 뒤에 비트를 한 번 더 섞어 비슷한 시드도 고르게 퍼뜨린다. */
function seeded(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 2 ** 32;
}

/**
 * 오픈채팅 알림을 보고 지금까지 공고를 확인했을 인원. 공고 ID로 인원과 각자의 확인 시각을 정하므로 누가 언제 열어도
 * 같고 시간이 지나면 늘기만 한다. 게시 시각을 모르면 모두 확인한 것으로 본다.
 */
export function alertReaderCount(postId: number, postedAt: string | null, now: number): number {
  const readers = Math.round(ALERT_CHAT_MEMBERS * (MIN_READ_RATE + seeded(`${postId}:rate`) * READ_RATE_SPREAD));
  const posted = postedAt ? Date.parse(postedAt) : Number.NaN;
  if (Number.isNaN(posted)) return readers;
  const elapsedHours = (now - posted) / HOUR_MS;
  if (elapsedHours <= 0) return 0;
  const readHours = MIN_READ_HOURS + seeded(`${postId}:hours`) * READ_HOURS_SPREAD;
  let arrived = 0;
  for (let reader = 0; reader < readers; reader++) {
    const meanHours = seeded(`${postId}:${reader}:late`) < LATE_READER_RATE ? LATE_READ_HOURS : readHours;
    if (-meanHours * Math.log(1 - seeded(`${postId}:${reader}:at`)) <= elapsedHours) arrived++;
  }
  return arrived;
}

/**
 * 공개 화면의 조회수. 실제 조회수와 오픈채팅 알림 확인 추정치 중 큰 값이다. 링크로 들어온 사람은 이미 실제 조회수에
 * 있으므로 더하지 않고, 실제 조회수가 추정치를 넘으면 실제 값만 남는다. 운영자·기획사 화면은 실제 값을 그대로 쓴다.
 */
export function publicViewCount(post: Pick<AuditionPostSummary, "id" | "viewCount" | "postedAt">, now: number): number {
  return Math.max(post.viewCount, alertReaderCount(post.id, post.postedAt, now));
}

/** 조회수 추정치를 계산할 시각. 서버 렌더링과 브라우저가 대부분 같은 값을 쓰도록 10분 단위로 자른다. */
export function viewCountClock(at: number = Date.now()): number {
  return Math.floor(at / CLOCK_STEP_MS) * CLOCK_STEP_MS;
}
