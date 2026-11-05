import { isCommunityTopic, type CommunityTopic, type CommunityAuthorMode } from "./types";

const PREFIX = "yesulin.community.draft:";
const LIFETIME = 30 * 60 * 1000;
export type MemberDraft = { topic?: CommunityTopic; title: string; body: string; authorMode: CommunityAuthorMode; requestId: string };

export function saveCommunityDraft(scope: string, member: number, draft: MemberDraft, now = Date.now()) {
  sessionStorage.setItem(`${PREFIX}${member}:${scope}`, JSON.stringify({ ...draft, savedAt: now }));
}

export function readCommunityDraft(scope: string, member: number, now = Date.now()): MemberDraft | null {
  try {
    const key = `${PREFIX}${member}:${scope}`;
    const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!validDraft(value) || now - value.savedAt >= LIFETIME || value.savedAt > now) {
      sessionStorage.removeItem(key);
      return null;
    }
    return value;
  } catch { return null; }
}

function validDraft(value: unknown): value is MemberDraft & { savedAt: number } {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  return (draft.topic === undefined || isCommunityTopic(draft.topic)) && typeof draft.title === "string" && typeof draft.body === "string" && typeof draft.requestId === "string"
    && typeof draft.savedAt === "number" && Number.isFinite(draft.savedAt)
    && (draft.authorMode === "ANONYMOUS" || draft.authorMode === "PROFILE");
}

export function removeCommunityDraft(scope: string, member: number) {
  try { sessionStorage.removeItem(`${PREFIX}${member}:${scope}`); } catch {}
}

export function clearCommunityDrafts() {
  try {
    Object.keys(sessionStorage).filter(key => key.startsWith(PREFIX)).forEach(key => sessionStorage.removeItem(key));
  } catch {}
}
