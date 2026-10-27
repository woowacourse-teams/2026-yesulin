const STORAGE_KEY = "yesulin.community.owner";
const HEADER = "X-Community-Key";

export function readIdentity(): Record<string, string> {
  try {
    const secret = localStorage.getItem(STORAGE_KEY);
    if (secret && /^[a-f0-9]{64}$/.test(secret)) return { [HEADER]: secret };
    return {};
  } catch {
    return {};
  }
}

function loadOrCreateIdentity(): Record<string, string> {
  try {
    const existing = readIdentity();
    if (existing[HEADER]) return existing;
    const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(STORAGE_KEY, secret);
    return { [HEADER]: secret };
  } catch {
    throw new Error("브라우저 저장 공간을 사용할 수 없어요. 저장을 허용한 뒤 다시 시도해 주세요.");
  }
}

export async function writeIdentity(): Promise<Record<string, string>> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(STORAGE_KEY, loadOrCreateIdentity);
  }
  return loadOrCreateIdentity();
}
