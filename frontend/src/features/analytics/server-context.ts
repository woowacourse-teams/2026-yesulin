import { createHmac } from "node:crypto";
import type { AnalyticsContext } from "./posthog-contract";

export function parseList(value: string | undefined) {
  return (value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

export function parseFormAttachments(value: string | undefined): Record<string, number[]> {
  if (!value) return {};
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid attachment mapping");
  for (const [id, indexes] of Object.entries(parsed)) {
    if (!/^\d+$/.test(id) || !Array.isArray(indexes) || indexes.some(i => !Number.isInteger(i) || i < 0)) {
      throw new Error("Invalid attachment mapping");
    }
  }
  return parsed as Record<string, number[]>;
}

export function buildAnalyticsContext(session: { memberId: number; role: string } | null, settings: {
  secret?: string; internalIds?: string; testObjects?: string; formAttachments?: string;
}): AnalyticsContext {
  if (session && (!Number.isSafeInteger(session.memberId) || !["APPLICANT", "PRODUCER", "ADMIN"].includes(session.role))) {
    throw new Error("Invalid analytics session");
  }
  if (session && (!settings.secret || settings.secret.length < 32)) throw new Error("Analytics identity secret missing");
  return {
    enabled: true,
    internal: session?.role === "ADMIN" || parseList(settings.internalIds).includes(String(session?.memberId)),
    actor: session ? session.role.toLowerCase() as AnalyticsContext["actor"] : "anonymous",
    identity: session ? createHmac("sha256", settings.secret!).update(`member:${session.memberId}`).digest("hex") : undefined,
    testObjects: parseList(settings.testObjects),
    formAttachments: parseFormAttachments(settings.formAttachments),
  };
}
