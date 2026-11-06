import { request } from "@/features/auditions/api-client";

const STORAGE_KEY = "yesulin.community.owner";
const IDENTITY_PATH = "/v1/public/community/identity";
let pending = Promise.resolve();

function legacyIdentity(): string | null | undefined {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return undefined; }
}

async function confirm(headers?: Record<string, string>) {
  const state = await request<{ ready: boolean }>(IDENTITY_PATH, { cache: "no-store", headers });
  if (!state.ready) throw new Error("브라우저 쿠키를 저장하지 못했어요. 쿠키를 허용한 뒤 다시 시도해 주세요.");
}

async function migrate(legacy: string) {
  const headers = { "X-Community-Legacy-Key": legacy };
  await request(IDENTITY_PATH, { method: "POST", headers });
  await confirm(headers);
  if (localStorage.getItem(STORAGE_KEY) === legacy) localStorage.removeItem(STORAGE_KEY);
}

async function prepare(create: boolean) {
  const legacy = legacyIdentity();
  if (legacy) return migrate(legacy);
  const state = await request<{ ready: boolean }>(IDENTITY_PATH, { cache: "no-store" });
  if (state.ready || !create) return;
  if (legacy === undefined) throw new Error("기존 관리 정보를 확인할 수 없어요. 브라우저 저장 공간을 허용해 주세요.");
  await request(IDENTITY_PATH, { method: "POST" });
  await confirm();
}

export async function prepareIdentity(create: boolean): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(STORAGE_KEY, () => prepare(create));
  }
  const operation = pending.then(() => prepare(create));
  pending = operation.catch(() => {});
  return operation;
}
