import { SITE_URL } from "@/config/site";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { OPENCHAT_SOURCE, REMINDER_CAMPAIGN_PARAM, type ReminderCampaign, type ReminderTiming } from "@/features/audition-posts/openchat-reminder-tag";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { moveOpenChatPeriod } from "./openchat-period";

export const REMINDER_TIMING_LABELS: Record<ReminderTiming, string> = { d0: "오늘", d1: "내일" };

const deadlineFormat = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" });

export function reminderDeadline(today: string, timing: ReminderTiming): string {
  if (timing === "d0") return today;
  return moveOpenChatPeriod("DAY", today, 1);
}

export async function getOpenChatReminderPosts(deadline: string): Promise<AuditionPostSummary[]> {
  const matches = new Map<number, AuditionPostSummary>();
  for (let page = 0; ; page += 1) {
    const result = await getAuditionPosts({ page, sort: "deadline", includeClosed: false });
    const matchingPosts = result.posts.filter(post => post.deadline === deadline && !post.closed);
    for (const post of matchingPosts) matches.set(post.id, post);
    if (page + 1 >= result.totalPages || result.posts.some(post => !post.deadline || post.deadline > deadline)) break;
  }
  return [...matches.values()];
}

export function formatReminderDeadline(deadline: string): string {
  return deadlineFormat.format(new Date(`${deadline}T00:00:00Z`));
}

function reminderLink(postId: number, campaign: ReminderCampaign): string {
  const url = new URL(auditionPostRoutes.detail(postId), SITE_URL);
  url.searchParams.set("src", OPENCHAT_SOURCE);
  url.searchParams.set(REMINDER_CAMPAIGN_PARAM, campaign);
  return url.href;
}

export function formatReminderMessage(deadline: string, timing: ReminderTiming, posts: readonly AuditionPostSummary[]): string {
  const campaign: ReminderCampaign = `deadline_reminder_${deadline.replaceAll("-", "")}_${timing}`;
  const date = `${REMINDER_TIMING_LABELS[timing]}(${formatReminderDeadline(deadline)})`;
  return [
    `안녕하세요, 예술in 운영자입니다! 😊\n예술in에서 ${date} 마감으로 표시된 오디션 공고를 안내드립니다.`,
    ...posts.map(post => `🎭 ${post.title}\n${reminderLink(post.id, campaign)}`),
    "지원 전 공고별 마감 시간과 접수 방법을 확인해 주세요!",
  ].join("\n\n");
}
