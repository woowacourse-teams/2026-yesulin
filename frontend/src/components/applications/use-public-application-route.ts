"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ApplicationFormStep, ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { applicationStepIndex, applicationWriteRoute, isApplicationWriteRouteKey } from "@/features/applications/routes";

export function usePublicApplicationRoute({
  postingId, roleIds, steps, stepIndex, reviewing, completedStepIndexes,
  maxReachedStepIndex, storageReady, setStepIndex, setReviewing,
}: {
  readonly postingId: string;
  readonly roleIds: readonly string[];
  readonly steps: readonly ApplicationFormStep[];
  readonly stepIndex: number;
  readonly reviewing: boolean;
  readonly completedStepIndexes: readonly number[];
  readonly maxReachedStepIndex: number;
  readonly storageReady: boolean;
  readonly setStepIndex: Dispatch<SetStateAction<number>>;
  readonly setReviewing: Dispatch<SetStateAction<boolean>>;
}) {
  const updateRoute = useCallback((route: ApplicationWriteRouteKey, replace = false) => {
    const path = applicationWriteRoute(postingId, route, roleIds);
    window.history[replace ? "replaceState" : "pushState"](null, "", path);
  }, [postingId, roleIds]);

  useEffect(() => {
    if (!storageReady) return;
    updateRoute(reviewing ? "review" : steps[stepIndex]!.key, true);
  }, [reviewing, stepIndex, steps, storageReady, updateRoute]);

  useEffect(() => {
    const onPopState = () => {
      const route = window.location.pathname.split("/").at(-1) ?? "";
      if (!isApplicationWriteRouteKey(route)) return;
      if (route === "review") {
        if (completedStepIndexes.length >= steps.length) setReviewing(true);
        return;
      }
      const index = applicationStepIndex(route);
      if (index <= maxReachedStepIndex) {
        setReviewing(false);
        setStepIndex(index);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [completedStepIndexes.length, maxReachedStepIndex, setReviewing, setStepIndex, steps.length]);

  return updateRoute;
}
