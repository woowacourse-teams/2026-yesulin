/** 원문 URL·검색어는 저장하거나 전송하지 않고 고정된 채널명만 남긴다. */
export const ACQUISITION_CHANNELS = [
  "openchat", "naver", "google", "instagram", "other_external", "other_tagged", "direct_unknown",
] as const;
export type AcquisitionChannel = typeof ACQUISITION_CHANNELS[number];
const KEY = "yesulin:acquisition:v1";
const MAX_IDLE = 30 * 60_000;
type Entry = { channel: AcquisitionChannel; at: number };
let entry: Entry | undefined;
let observedUrl: string | undefined;
let documentObserved = false;

const domainIs = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);
const internalHost = (host: string) => domainIs(host, "yesulin.art") || host === "localhost" || host === "127.0.0.1";

export function classifyAcquisition(url: string, referrer: string): AcquisitionChannel | null {
  try {
    const current = new URL(url);
    const src = current.searchParams.get("src")?.toLowerCase();
    const utm = current.searchParams.get("utm_source")?.toLowerCase();
    if (src === "kakao_openchat" || utm === "kakao_openchat") return "openchat";
    const tag = utm || src;
    if (tag) {
      if (["naver", "google", "instagram"].includes(tag)) return tag as AcquisitionChannel;
      return "other_tagged";
    }
    if (!referrer) return null;
    const ref = new URL(referrer);
    if (!["http:", "https:"].includes(ref.protocol) || internalHost(ref.hostname) || ref.origin === current.origin) return null;
    if (domainIs(ref.hostname, "naver.com")) return "naver";
    if (["google.com", "google.co.kr"].some(domain => domainIs(ref.hostname, domain))) return "google";
    if (domainIs(ref.hostname, "instagram.com")) return "instagram";
    return "other_external";
  } catch { return null; }
}

/** 문서 최초 진입을 먼저 읽고, 내부 이동에서는 출처를 유지한다. 30분 무활동이면 새 방문이다. */
export function observeAcquisition(now = Date.now()): AcquisitionChannel {
  if (!entry) {
    try {
      const stored = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      if (stored && ACQUISITION_CHANNELS.includes(stored.channel) && typeof stored.at === "number") entry = stored;
    } catch { /* 저장소 사용 불가 시 현재 문서 안에서만 유지한다. */ }
  }
  const fresh = entry && now >= entry.at && now - entry.at < MAX_IDLE;
  const url = window.location.href;
  const channel = !documentObserved || observedUrl !== url
    ? classifyAcquisition(url, documentObserved ? "" : document.referrer) : null;
  documentObserved = true;
  observedUrl = url;
  entry = { channel: channel ?? (fresh ? entry!.channel : "direct_unknown"), at: now };
  try { sessionStorage.setItem(KEY, JSON.stringify(entry)); } catch { /* 메모리만 사용 */ }
  return entry.channel;
}

/** 경유 페이지가 주소를 정리하기 전에 읽은 오픈채팅 출처를 보존한다. */
export function rememberOpenchatAcquisition() {
  observeAcquisition();
  entry = { channel: "openchat", at: Date.now() };
  try { sessionStorage.setItem(KEY, JSON.stringify(entry)); } catch { /* 메모리만 사용 */ }
}

export function clearAcquisition() {
  entry = undefined;
  observedUrl = undefined;
  documentObserved = false;
  try { sessionStorage.removeItem(KEY); } catch { /* optional storage */ }
}
