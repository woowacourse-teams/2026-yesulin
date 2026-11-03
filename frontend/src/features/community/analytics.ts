"use client";

import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import type { CommunityEntry } from "./types";

export function trackListViewed() {
  void trackProductEvent("community_list_viewed");
}

export function trackPostViewed() {
  void trackProductEvent("community_post_viewed");
}

export function trackComposeStarted() {
  void trackProductEvent("community_compose_started");
}

export function trackPostCreated() {
  void trackProductEvent("community_post_created");
}

export function trackCommentCreated() {
  void trackProductEvent("community_comment_created");
}

export function trackLikeToggled(liked: boolean) {
  void trackProductEvent("community_like_toggled", { liked });
}

export function trackReportSubmitted(entry: CommunityEntry) {
  void trackProductEvent("community_report_submitted", { community_target: reportTarget(entry) });
}

function reportTarget(entry: CommunityEntry) {
  if (entry.title === null) return "comment";
  return "post";
}

export function useTrackOnce(ready: boolean, track: () => void) {
  const tracked = useRef(false);
  useEffect(() => {
    if (!ready || tracked.current) return;
    tracked.current = true;
    track();
  }, [ready, track]);
}

export function useAbandonTracking(active: boolean, unsaved: boolean) {
  const latest = useRef(unsaved);
  useEffect(() => { latest.current = unsaved; }, [unsaved]);
  useEffect(() => () => {
    if (active && latest.current) void trackProductEvent("community_compose_abandoned");
  }, [active]);
}
