import type { ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { applicationWriteRoute } from "@/features/applications/routes";

const RETURN_TO_ORIGIN = "https://yesulin.local";

export type ApplicationReturnTarget = {
  readonly postingId: string;
  readonly roleIds: readonly string[];
  readonly safeReturnTo: string;
};

export function safeAuthReturnTo(value?: string) {
  if (!value?.startsWith("/") || value.startsWith("//")) return undefined;
  try {
    const url = new URL(value, RETURN_TO_ORIGIN);
    if (url.origin !== RETURN_TO_ORIGIN || url.hash) return undefined;
    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

export function applicationReturnTarget(value?: string): ApplicationReturnTarget | null {
  const safeReturnTo = safeAuthReturnTo(value);
  if (!safeReturnTo) return null;
  const url = new URL(safeReturnTo, RETURN_TO_ORIGIN);
  const match = /^\/apply\/([^/]+)(?:\/write\/(?:basic|additional|media|questions|review))?$/.exec(url.pathname);
  if (!match?.[1]) return null;
  try {
    return {
      postingId: decodeURIComponent(match[1]),
      roleIds: [...new Set(url.searchParams.getAll("roleId").filter(Boolean))],
      safeReturnTo,
    };
  } catch {
    return null;
  }
}

export function authSuccessReturnTo(value?: string) {
  const safeReturnTo = safeAuthReturnTo(value);
  if (!safeReturnTo) return undefined;
  const application = applicationReturnTarget(safeReturnTo);
  if (!application) return safeReturnTo;
  const url = new URL(safeReturnTo, RETURN_TO_ORIGIN);
  url.searchParams.set("prefill", "1");
  url.searchParams.set("resumeDraft", "1");
  return `${url.pathname}${url.search}`;
}

export function authCancelReturnTo(value?: string) {
  const application = applicationReturnTarget(value);
  if (!application) return undefined;
  const url = new URL(application.safeReturnTo, RETURN_TO_ORIGIN);
  url.searchParams.delete("prefill");
  url.searchParams.set("resumeDraft", "1");
  return `${url.pathname}${url.search}`;
}

export function buildApplicationAuthReturnTo(postingId: string, roleIds: readonly string[], step: ApplicationWriteRouteKey = "review") {
  const url = new URL(applicationWriteRoute(postingId, step), RETURN_TO_ORIGIN);
  url.searchParams.set("prefill", "1");
  url.searchParams.set("resumeDraft", "1");
  roleIds.forEach((roleId) => url.searchParams.append("roleId", roleId));
  return `${url.pathname}${url.search}`;
}
