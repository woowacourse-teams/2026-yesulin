import { Suspense } from "react";
import { CommunityList, FeedSkeleton } from "@/components/community/community-list";

export default function CommunityPage() {
  return <Suspense fallback={<FeedSkeleton />}><CommunityList /></Suspense>;
}
