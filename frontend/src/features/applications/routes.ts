import { APPLICATION_STEP_KEYS } from "./application-form";
import type { ApplicationStepKey, ApplicationWriteRouteKey } from "./application-form";

export function isApplicationWriteRouteKey(value: string): value is ApplicationWriteRouteKey {
  return value === "review" || APPLICATION_STEP_KEYS.includes(value as ApplicationStepKey);
}

export function applicationWriteRoute(
  postingId: string,
  step: ApplicationWriteRouteKey,
  roleIds: readonly string[] = [],
  options: { readonly prefill?: boolean; readonly resumeDraft?: boolean } = {},
) {
  const query = new URLSearchParams();
  roleIds.forEach((roleId) => query.append("roleId", roleId));
  if (options.prefill) query.set("prefill", "1");
  if (options.resumeDraft) query.set("resumeDraft", "1");
  const suffix = query.size ? `?${query.toString()}` : "";
  return `/apply/${encodeURIComponent(postingId)}/write/${step}${suffix}`;
}

