"use client";

import { CommunityError } from "@/components/community/community-ui";

export default function CommunityRouteError({ reset }: { readonly reset: () => void }) {
  return <CommunityError message="화면을 불러오지 못했어요." retry={reset} />;
}
