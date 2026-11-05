import type { Metadata } from "next";
import { CommunityNotifications } from "@/components/community/community-notifications";

export const metadata: Metadata = { title: "알림", robots: { index: false, follow: false } };

export default function CommunityNotificationsPage() {
  return <CommunityNotifications />;
}
