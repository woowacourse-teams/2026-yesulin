import { redirect } from "next/navigation";

/** 받은 댓글은 커뮤니티 알림 화면으로 옮겼다. 예전 주소로 들어오면 그곳으로 보낸다. */
export default function ReceivedCommentsPage() {
  redirect("/community/notifications");
}
