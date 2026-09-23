"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ApplicationFormStep, ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { applicationStepIndexIn } from "@/features/applications/application-form";
import { applicationWriteRoute, isApplicationWriteRouteKey } from "@/features/applications/routes";
import type { ApplicationType } from "@/features/applications/application-type";

export function usePublicApplicationRoute({
  applicationType, postingId, roleIds, steps, stepIndex, reviewing, completedStepIndexes,
  maxReachedStepIndex, storageReady, profilePrefilled, setStepIndex, setReviewing,
}: {
  readonly applicationType: ApplicationType;
  readonly postingId: string;
  readonly roleIds: readonly string[];
  readonly steps: readonly ApplicationFormStep[];
  readonly stepIndex: number;
  readonly reviewing: boolean;
  readonly completedStepIndexes: readonly number[];
  readonly maxReachedStepIndex: number;
  readonly storageReady: boolean;
  readonly profilePrefilled: boolean;
  readonly setStepIndex: Dispatch<SetStateAction<number>>;
  readonly setReviewing: Dispatch<SetStateAction<boolean>>;
}) {
  const updateRoute = useCallback((route: ApplicationWriteRouteKey, replace = false) => {
    if (applicationType === "OTR") return;
    const path = applicationWriteRoute(postingId, route, roleIds, { prefill: profilePrefilled });
    window.history[replace ? "replaceState" : "pushState"](null, "", path);
  }, [applicationType, postingId, profilePrefilled, roleIds]);

  useEffect(() => {
    if (!storageReady || steps.length === 0) return;
    updateRoute(reviewing ? "review" : steps[stepIndex]!.key, true);
  }, [reviewing, stepIndex, steps, storageReady, updateRoute]);

  useEffect(() => {
    if (applicationType === "OTR") return;
    const onPopState = () => {
      const route = window.location.pathname.split("/").at(-1) ?? "";
      if (!isApplicationWriteRouteKey(route)) return;
      if (route === "review") {
        if (completedStepIndexes.length >= steps.length) setReviewing(true);
        return;
      }
      const index = applicationStepIndexIn(steps, route);
      if (index <= maxReachedStepIndex) {
        setReviewing(false);
        setStepIndex(index);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applicationType, completedStepIndexes.length, maxReachedStepIndex, setReviewing, setStepIndex, steps]);

  return updateRoute;
}
