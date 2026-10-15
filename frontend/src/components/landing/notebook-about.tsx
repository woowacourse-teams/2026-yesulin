import Image from "next/image";
import Link from "next/link";
import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { showRoutes } from "@/features/shows/types";

export function NotebookAbout() {
  return <div className="public-notebook"><a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <main id="main" className="notebook-container">
      <section className="notebook-about-hero"><div><p className="mb-4 text-sm font-semibold">예술in 소개</p><h1>뮤지컬·연극 오디션과<br />무료 공연을 한곳에서</h1><p>예술in은 배우와 관객을 위한 공연예술 정보 서비스입니다.</p></div><div className="notebook-about-photo"><Image src="/images/performances/moonlight.jpg" alt="조명 아래 무대에 서 있는 배우" width={768} height={1152} /></div></section>
      <section className="notebook-about-story"><h2>여러 곳에 흩어진 공고를<br />모아 보여드립니다</h2><p>모집 공고를 찾아 여러 곳을 오가고, 조건과 지원 방법을 하나씩 확인하는 일. 예술in은 배우들이 필요한 정보를 한곳에서 살펴볼 수 있도록 오디션 공고를 모아 안내합니다.</p><p>공연을 보고 싶은 분들은 무료 공연의 일정과 예매 방법을 확인할 수 있습니다. 기획사·제작사를 위한 공고 관리와 지원서 심사 기능도 제공합니다.</p></section>
      <section aria-label="예술in의 서비스" className="notebook-about-services"><article><h2>오디션 공고</h2><p>모집 공고와 마감일, 지원 방법을 확인하고 자신의 다음 무대를 준비합니다.</p><Link href={auditionPostRoutes.list()} className="notebook-text-link">오디션 살펴보기</Link></article><article><h2>무료 공연</h2><p>무료 공연을 통해 평소 만나지 못했던 작품을 가까이에서 만납니다.</p><Link href={showRoutes.list} className="notebook-text-link">무료 공연 살펴보기</Link></article><article><h2>기획사·제작사 서비스</h2><p>공고를 등록하고 지원자 정보를 확인하며 전형별로 심사합니다.</p><Link href="/producer-service" className="notebook-text-link">서비스 알아보기</Link></article></section>
      <section className="notebook-about-contact"><div><h2>의견을 보내주세요</h2><p>사용하면서 불편했던 점이나 필요한 기능을 알려주세요.<br />실제 이용자의 경험을 바탕으로 더 편한 서비스를 만들어가겠습니다.</p></div><a href="mailto:contact@yesulin.art" className="notebook-text-link">contact@yesulin.art</a></section>
    </main><NotebookFooter /></div>;
}
