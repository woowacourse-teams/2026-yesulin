import { AUDITION_POST_STATUS_LABELS } from "@/features/audition-posts/editing";
import type { ProducerAuditionPost } from "@/features/audition-posts/producer-api";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { otrAuditionRoutes, type OtrAudition } from "@/features/otr-auditions/types";
import type { ReviewSummary } from "@/features/pdf-reviews/types";
import { formatShowTime } from "@/features/shows/format";
import { showRoutes, type ProducerShowSummary } from "@/features/shows/types";

export const PDF_REVIEW_LIST_PATH = "/producers/pdf-reviews";
export const PDF_REVIEW_CREATE_PATH = `${PDF_REVIEW_LIST_PATH}?create=1`;
export const RECENT_WORK_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
const ROW_LIMIT = 2;

export function isRecruitingPost(post: ProducerAuditionPost) {
  return post.status === "PUBLISHED" && !post.closed;
}

export function isPublicProducerShow(show: ProducerShowSummary) {
  return !show.hidden && show.status !== "DRAFT";
}

export function hasStartedShowSession(shows: readonly ProducerShowSummary[], previous: number, now: number) {
  return shows.filter(isPublicProducerShow).some((show) => {
    const startsAt = Date.parse(show.nextSessionStartsAt ?? "");
    return startsAt > previous && startsAt <= now;
  });
}

export type DashboardRow = {
  readonly key: string;
  readonly kind: "post" | "pdf" | "deadline" | "show";
  readonly title: string;
  readonly detail: string;
  readonly at: number;
  readonly dateTime: string;
  readonly href: string;
  readonly action: string;
};

function postLabel(post: ProducerAuditionPost) {
  if (post.status === "PUBLISHED" && post.closed) return "모집 마감";
  return AUDITION_POST_STATUS_LABELS[post.status];
}

function updatedPost(post: ProducerAuditionPost): DashboardRow {
  return {
    key: `post-${post.id}`, kind: "post", title: post.title, detail: postLabel(post),
    at: Date.parse(post.updatedAt), dateTime: post.updatedAt,
    href: producerAuditionPostRoutes.edit(post.id), action: "공고 수정",
  };
}

function createdReview(review: ReviewSummary): DashboardRow {
  return {
    key: `pdf-${review.id}`, kind: "pdf", title: review.title, detail: `PDF 심사함 · 지원서 항목 ${review.entryCount}건`,
    at: Date.parse(review.createdAt), dateTime: review.createdAt,
    href: PDF_REVIEW_LIST_PATH, action: "심사함 목록",
  };
}

export function getRecentDashboardWork(posts: readonly ProducerAuditionPost[], reviews: readonly ReviewSummary[], now: number) {
  const earliest = now - RECENT_WORK_DAYS * DAY_MS;
  return [...posts.map(updatedPost), ...reviews.map(createdReview)]
    .filter(({ at }) => at >= earliest && at <= now)
    .sort((left, right) => right.at - left.at)
    .slice(0, ROW_LIMIT);
}

function intakeDeadline(audition: OtrAudition): DashboardRow {
  return {
    key: `deadline-${audition.id}`, kind: "deadline", title: audition.title, detail: "지원 마감",
    at: Date.parse(`${audition.deadline}T23:59:59.999+09:00`), dateTime: audition.deadline,
    href: otrAuditionRoutes.screening(audition.id), action: "지원서 보기",
  };
}

function showSession(show: ProducerShowSummary): DashboardRow {
  const dateTime = show.nextSessionStartsAt ?? "";
  return {
    key: `show-${show.id}`, kind: "show", title: show.title, detail: `공연 회차 · ${formatShowTime(dateTime)}`,
    at: Date.parse(dateTime), dateTime, href: showRoutes.manageDetail(show.id), action: "회차·예매 관리",
  };
}

export function getUpcomingDashboardSchedule(auditions: readonly OtrAudition[], shows: readonly ProducerShowSummary[], now: number) {
  const sessions = shows.filter(isPublicProducerShow).filter((show) => show.nextSessionStartsAt !== null).map(showSession);
  return [...auditions.map(intakeDeadline), ...sessions]
    .filter(({ at, kind }) => at > now || (kind === "deadline" && at === now))
    .sort((left, right) => left.at - right.at)
    .slice(0, ROW_LIMIT);
}
