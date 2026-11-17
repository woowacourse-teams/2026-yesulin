"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { PiBookOpen, PiFileText, PiPlus, PiTicket, PiTray } from "react-icons/pi";
import { useOtrAuditions } from "@/components/otr-auditions/otr-audition-context";
import { PrimaryLink, SecondaryLink } from "@/components/ui/controls";
import { fetchMyAuditionPosts } from "@/features/audition-posts/producer-api";
import { producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { listPdfReviews } from "@/features/pdf-reviews/api";
import { getRecentDashboardWork, getUpcomingDashboardSchedule, hasStartedShowSession, isPublicProducerShow, isRecruitingPost, PDF_REVIEW_CREATE_PATH, PDF_REVIEW_LIST_PATH, RECENT_WORK_DAYS } from "@/features/producer-dashboard/activity";
import { getProducerShows } from "@/features/shows/producer-api";
import { showRoutes, type ProducerShowSummary } from "@/features/shows/types";
import { ProducerDashboardGuide } from "./producer-dashboard-guide";
import { DashboardList, DashboardMetric } from "./producer-dashboard-sections";
import styles from "./producer-dashboard.module.css";

function useScheduleClock(shows: readonly ProducerShowSummary[] | null, reloadShows: () => void) {
  const [now, setNow] = useState(Date.now);
  const update = useEffectEvent(() => {
    const current = Date.now();
    if (shows && hasStartedShowSession(shows, now, current)) reloadShows();
    setNow(current);
  });
  useEffect(() => {
    const refreshTime = () => update();
    const timer = window.setInterval(refreshTime, 60_000);
    window.addEventListener("focus", refreshTime);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshTime); };
  }, []);
  return now;
}

export function ProducerDashboard() {
  const posts = useAuditionQuery("dashboard-posts", fetchMyAuditionPosts, "공고를 불러오지 못했어요.");
  const reviews = useAuditionQuery("dashboard-pdf", listPdfReviews, "심사함을 불러오지 못했어요.");
  const shows = useAuditionQuery("dashboard-shows", getProducerShows, "공연을 불러오지 못했어요.");
  const now = useScheduleClock(shows.data, shows.reload);
  const intakes = useOtrAuditions();
  const firstUse = !intakes.loading && !intakes.error && intakes.auditions.length === 0
    && [posts.data?.length, reviews.data?.length, shows.data?.length].every((count) => count === 0);
  const recent = getRecentDashboardWork(posts.data ?? [], reviews.data ?? [], now);
  const schedule = getUpcomingDashboardSchedule(availableIntakes(intakes), shows.data ?? [], now);
  const postSource = { ...posts, label: "모집 중인 공고" };
  const reviewSource = { ...reviews, label: "PDF 심사함" };
  const showSource = { ...shows, label: "공개 무료 공연" };

  return (
    <div className={`${styles.dashboard} mx-auto w-full max-w-[1192px] px-4 pt-6 pb-10 sm:px-6 lg:px-8 lg:pt-9`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-5">
        <h1 className="text-[27px] font-bold tracking-tight sm:text-[34px]">대시보드</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryLink href="#dashboard-guide" className={`${styles.guideJump} gap-1.5 px-2.5`}><PiBookOpen aria-hidden="true" />기능 가이드</SecondaryLink>
          {!firstUse && <PostCreateLink />}
        </div>
      </header>
      {!firstUse && (
        <section aria-label="업무 현황" className="mb-4 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-3.5">
          <DashboardMetric source={postSource} count={posts.data?.filter(isRecruitingPost).length} unit="건" href={producerAuditionPostRoutes.list} icon={PiFileText} />
          <DashboardMetric source={reviewSource} count={reviews.data?.length} unit="개" href={PDF_REVIEW_LIST_PATH} icon={PiTray} />
          <DashboardMetric source={showSource} count={shows.data?.filter(isPublicProducerShow).length} unit="개" href={showRoutes.manageList} icon={PiTicket} />
        </section>
      )}
      <div className={`${styles.sections} grid items-start gap-4 sm:gap-5`}>
        {firstUse && <DashboardStart />}
        {!firstUse && (
          <section className={`${styles.recent} min-w-0 rounded-card border border-border bg-card`} aria-labelledby="dashboard-recent">
            <h2 id="dashboard-recent" className="border-b border-border px-5 py-4 text-lg font-bold">최근 작업</h2>
            <DashboardList rows={recent} sources={[{ ...posts, label: "오디션 공고" }, reviewSource]} emptyTitle="최근 작업이 없어요" emptyDescription={`최근 ${RECENT_WORK_DAYS}일에 업데이트한 공고나 새로 만든 PDF 심사함이 여기에 표시돼요.`} />
          </section>
        )}
        <ProducerDashboardGuide />
        {!firstUse && (
          <section className={`${styles.schedule} min-w-0`} aria-labelledby="dashboard-schedule">
            <h2 id="dashboard-schedule" className="mb-2 text-base font-bold">다가오는 일정</h2>
            <div className="rounded-card border border-border bg-card">
              <DashboardList rows={schedule} sources={[{ ...intakes, label: "지원 마감" }, { ...shows, label: "공연 회차" }]} emptyTitle="다가오는 일정이 없어요" emptyDescription="예정된 지원 마감일이나 공연 회차가 있으면 여기에 표시돼요." />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function availableIntakes(intakes: ReturnType<typeof useOtrAuditions>) {
  if (intakes.error || intakes.loading) return [];
  return intakes.auditions;
}

function PostCreateLink() {
  return <PrimaryLink href={producerAuditionPostRoutes.create} className="gap-1.5 px-3"><PiPlus aria-hidden="true" />공고 올리기</PrimaryLink>;
}

function DashboardStart() {
  return (
    <section className={`${styles.recent} rounded-card border border-border bg-card p-5 sm:p-6`} aria-labelledby="dashboard-start">
      <h2 id="dashboard-start" className="text-xl font-bold">어떤 작업을 시작할까요?</h2>
      <p className="mt-2 text-sm text-muted-strong">오디션을 알리려면 공고를 올리고, 받은 PDF 지원서가 있다면 심사함을 만들어 보세요.</p>
      <div className="mt-4 flex flex-wrap gap-2"><PostCreateLink /><SecondaryLink href={PDF_REVIEW_CREATE_PATH}>PDF 심사함 만들기</SecondaryLink></div>
    </section>
  );
}
