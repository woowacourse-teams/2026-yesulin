import { APPLICATION_STEP_KEYS } from "./application-form";
import type { ApplicationStepKey, ApplicationWriteRouteKey } from "./application-form";

export function isApplicationWriteRouteKey(value: string): value is ApplicationWriteRouteKey {
  return value === "review" || APPLICATION_STEP_KEYS.includes(value as ApplicationStepKey);
}

export function applicationWriteRoute(postingId: string, step: ApplicationWriteRouteKey, roleIds: readonly string[] = []) {
  const query = new URLSearchParams();
  roleIds.forEach((roleId) => query.append("roleId", roleId));
  const suffix = query.size ? `?${query.toString()}` : "";
  return `/apply/${encodeURIComponent(postingId)}/write/${step}${suffix}`;
}

export function applicationStepIndex(step: ApplicationWriteRouteKey) {
  return step === "review" ? APPLICATION_STEP_KEYS.length - 1 : APPLICATION_STEP_KEYS.indexOf(step);
}
