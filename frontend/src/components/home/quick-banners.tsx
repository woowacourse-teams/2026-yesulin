import Link from "next/link";
import { AUDITION_ALERT_CHAT_URL } from "@/features/audition-posts/types";
import { showRoutes } from "@/features/shows/types";

/** 홈 중간의 작은 안내 배너 세 개. 외부 링크는 새 창으로 연다. */
export function QuickBanners() {
  return <div className="home-quick-banners">
    <a href={AUDITION_ALERT_CHAT_URL} target="_blank" rel="noopener noreferrer" aria-label="카카오톡 오픈채팅에서 새 오디션 알림 받기 (새 창에서 열림)" className="home-quick-banner is-alert">
      <span className="home-quick-eyebrow">카카오톡 오픈채팅</span><strong>새 오디션 소식<br />가장 먼저 받기</strong>
    </a>
    <Link href={showRoutes.list} className="home-quick-banner is-shows">
      <span className="home-quick-eyebrow">로그인 없이 신청</span><strong>이번 주<br />무료 공연 보러 가기</strong>
    </Link>
    <Link href="/producer-service" className="home-quick-banner is-producer">
      <span className="home-quick-eyebrow">기획사·제작사</span><strong>공고 올리고<br />지원자까지 관리하기</strong>
    </Link>
  </div>;
}
