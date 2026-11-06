"use client";

import { useEffect } from "react";
import { communityDraftNavigation } from "@/features/community/draft-navigation";

export function CommunityNavigationGuard() {
  useEffect(() => { communityDraftNavigation(); }, []);
  return null;
}
