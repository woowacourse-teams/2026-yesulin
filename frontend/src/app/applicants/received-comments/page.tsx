import type { Metadata } from "next";
import { CommunityInbox } from "@/components/community/community-inbox";

export const metadata: Metadata = { title: "받은 댓글" };

export default function ReceivedCommentsPage() {
  return <CommunityInbox />;
}
