"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import type { LoginAttribution } from "@/features/analytics/events";
import { trackLoginEntry } from "@/features/analytics/events";

export function TrackedLoginLink({ analytics, onTrackedClick, onClick, ...props }: ComponentProps<typeof Link> & {
  readonly analytics: LoginAttribution;
  readonly onTrackedClick?: () => void;
}) {
  return <Link {...props} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    onTrackedClick?.();
    trackLoginEntry(analytics);
  }} />;
}
