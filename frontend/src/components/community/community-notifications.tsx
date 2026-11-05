"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiChecks } from "react-icons/pi";
import { useAuthSession } from "@/components/auth/auth-session";
import { groupNotices, noticePeriod, type NoticeGroup, type NoticeKind, type NoticePeriod } from "@/features/community/notice-groups";
import { communityNoticeRoute, NoticeRow, useMarkAllRead, useOpenNotice } from "./notice-row";
import { useReceivedComments, useUnreadCommentCount } from "./received-comments-context";

const filters = [
  { key: "all", label: "전체" },
  { key: "comment", label: "내 글 댓글" },
  { key: "reply", label: "내 댓글 답글" },
] as const;
type Filter = typeof filters[number]["key"];
const periods: readonly NoticePeriod[] = ["오늘", "최근 7일", "이전"];

/** 커뮤니티 안의 알림 전체 화면. 배우 계정만 받은 댓글 알림이 있다. */
export function CommunityNotifications() {
  const { session } = useAuthSession();
  if (session?.role === "APPLICANT") return <NotificationList />;
  return (
    <section className="community-notices">
      <h1>알림</h1>
      <p className="community-notices-state">내 글과 댓글에 달린 답을 보려면 배우 계정으로 로그인해 주세요.</p>
      <Link className="community-pill" href={`/login?returnTo=${encodeURIComponent(communityNoticeRoute)}`}>로그인하고 알림 보기</Link>
    </section>
  );
}

function NotificationList() {
  const { items, error, refresh } = useReceivedComments();
  const unread = useUnreadCommentCount();
  const [filter, setFilter] = useState<Filter>("all");
  const notice = useOpenNotice();
  const readAll = useMarkAllRead();
  useEffect(refresh, [refresh]);
  const groups = groupNotices(items ?? []).filter((group) => matches(group.kind, filter));
  return (
    <section className="community-notices" aria-labelledby="community-notices-title">
      <div className="community-notices-head">
        <h1 id="community-notices-title">알림</h1>
        <button type="button" onClick={() => void readAll.run()} disabled={unread === 0}>
          <PiChecks aria-hidden="true" />모두 읽음
        </button>
      </div>
      <div className="community-notices-filters" role="group" aria-label="알림 종류">
        {filters.map((item) => <button key={item.key} type="button" aria-pressed={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}
      </div>
      <ListState loading={!items && !error} error={error || notice.error || readAll.error} empty={items !== null && groups.length === 0} retry={refresh} />
      {periods.map((period) => <PeriodSection key={period} period={period} groups={groups} onOpen={notice.open} />)}
    </section>
  );
}

function matches(kind: NoticeKind, filter: Filter): boolean {
  return filter === "all" || filter === kind;
}

function PeriodSection({ period, groups, onOpen }: { readonly period: NoticePeriod; readonly groups: readonly NoticeGroup[]; readonly onOpen: (group: NoticeGroup) => void }) {
  const [now] = useState(() => new Date());
  const inPeriod = groups.filter((group) => noticePeriod(group.latest.createdAt, now) === period);
  if (inPeriod.length === 0) return null;
  return (
    <section className="community-notices-period" aria-label={period}>
      <h2>{period}</h2>
      <ul>{inPeriod.map((group) => <NoticeRow key={group.key} group={group} preview onOpen={onOpen} />)}</ul>
    </section>
  );
}

function ListState({ loading, error, empty, retry }: { readonly loading: boolean; readonly error: string; readonly empty: boolean; readonly retry: () => void }) {
  if (error) return <p role="alert" className="community-notices-state">{error} <button type="button" onClick={retry}>다시 시도</button></p>;
  if (loading) return <p role="status" className="community-notices-state">알림을 불러오는 중이에요.</p>;
  if (empty) return <p className="community-notices-state">아직 받은 알림이 없어요.</p>;
  return null;
}
