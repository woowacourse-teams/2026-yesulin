"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { landingPosters } from "./landing-posters";
import { BackstageTechnology } from "./backstage-technology";
import { ServiceGuide } from "./service-guide";
import styles from "./theatre-landing.module.css";

const STAGE_IMAGE = "/images/landing/audition-room-v2.webp";
const LAMP_ANCHOR = { x: 0.7808014354, y: 0.6424017003 };
const team = [
  { nickname: "피노", name: "문해찬" },
  { nickname: "이프", name: "김지환" },
  { nickname: "대길", name: "강민준", representative: true },
  { nickname: "맥스", name: "심호경" },
  { nickname: "무빙", name: "이동건" },
];

function Arrow() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.4" /></svg>;
}

function Logo({ priority = false }: { priority?: boolean }) {
  return <Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={104} height={61} priority={priority} className={styles.logoImage} />;
}

function clampProgress(value: number) {
  return Math.max(0, Math.min(1, value));
}

function sceneProgress(reducedMotion: boolean, scene: HTMLElement, stage: HTMLDivElement) {
  if (reducedMotion) return 1;
  const bounds = scene.getBoundingClientRect();
  return clampProgress(-bounds.top / Math.max(1, bounds.height - stage.offsetHeight));
}

function motionMode(reducedMotion: boolean) {
  if (reducedMotion) return "reduced";
  return "full";
}

function galleryOffset(staticGallery: boolean, progress: number, distance: number) {
  if (staticGallery) return 0;
  return -progress * distance;
}

export function TheatreLanding() {
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const teamDialogRef = useRef<HTMLDialogElement>(null);
  const teamButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const scene = sceneRef.current;
    const stage = stageRef.current;
    const image = imageRef.current;
    const gallery = galleryRef.current;
    const track = trackRef.current;
    const teamButton = teamButtonRef.current;
    if (!root || !scene || !stage || !image || !gallery || !track || !teamButton) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)");
    let frame = 0;
    let galleryDistance = "";
    const update = () => {
      frame = 0;
      const progress = sceneProgress(reducedMotion.matches, scene, stage);
      scene.style.setProperty("--scene", String(progress));
      scene.style.setProperty("--title", String(clampProgress(progress * 1.8)));
      scene.dataset.teamVisible = String(progress > 0.58);
      root.dataset.scrolled = String(window.scrollY > 50);
      root.dataset.motion = motionMode(reducedMotion.matches);

      if (image.naturalWidth && image.naturalHeight) {
        const imageBox = image.getBoundingClientRect();
        const stageBox = stage.getBoundingClientRect();
        const scale = Math.max(imageBox.width / image.naturalWidth, imageBox.height / image.naturalHeight);
        const photoWidth = image.naturalWidth * scale;
        const photoHeight = image.naturalHeight * scale;
        const x = imageBox.right - photoWidth + photoWidth * LAMP_ANCHOR.x - stageBox.left;
        const y = imageBox.top + (imageBox.height - photoHeight) / 2 + photoHeight * LAMP_ANCHOR.y - stageBox.top;
        teamButton.style.left = `${x}px`;
        teamButton.style.top = `${y}px`;
      }

      const distance = Math.max(0, track.scrollWidth - gallery.clientWidth);
      const scrollDistance = `${Math.max(window.innerHeight * 1.2, distance * 0.9)}px`;
      if (galleryDistance !== scrollDistance) {
        gallery.style.setProperty("--gallery-scroll", scrollDistance);
        galleryDistance = scrollDistance;
      }
      const galleryBox = gallery.getBoundingClientRect();
      const galleryProgress = clampProgress(-galleryBox.top / Math.max(1, galleryBox.height - window.innerHeight));
      track.style.setProperty("--gallery-x", `${galleryOffset(mobile.matches || reducedMotion.matches, galleryProgress, distance)}px`);
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.setAttribute("data-visible", "true");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12 });
    root.querySelectorAll("[data-reveal]").forEach((element) => observer.observe(element));
    update();
    image.addEventListener("load", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    reducedMotion.addEventListener("change", schedule);
    mobile.addEventListener("change", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      image.removeEventListener("load", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      reducedMotion.removeEventListener("change", schedule);
      mobile.removeEventListener("change", schedule);
    };
  }, []);

  return (
    <div className={styles.landing} ref={rootRef} id="landing-top">
      <a className={styles.skipLink} href="#our-stage">서비스 소개로 건너뛰기</a>
      <header className={styles.header}>
        <Link href="/" className={styles.logo} aria-label="예술in 메인으로"><Logo priority /></Link>
        <nav aria-label="랜딩페이지 메뉴" className={styles.nav}><a href="#our-stage">우리의 무대</a><a href="#opportunities">오디션</a><a href="#how-to">이용 방법</a><a href="#backstage">무대 뒤의 기술</a></nav>
        <Link className={styles.headerCta} href="/">예술in 시작하기</Link>
      </header>

      <main>
        <section className={styles.scene} ref={sceneRef} aria-labelledby="landing-title">
          <div className={styles.stage} ref={stageRef}>
            <div className={styles.auditorium}><Image ref={imageRef} src={STAGE_IMAGE} alt="" fill sizes="100vw" priority unoptimized className={styles.stageImage} /></div>
            <div className={styles.stageShade} />
            <div className={styles.heroCopy}><h1 id="landing-title"><span className={styles.heroLine}><span>당신의 다음 무대</span></span><span className={styles.heroLine}><span><em>여기서 막이 오릅니다</em></span></span></h1></div>
            <div className={`${styles.curtain} ${styles.curtainLeft}`} aria-hidden="true" />
            <div className={`${styles.curtain} ${styles.curtainRight}`} aria-hidden="true" />
            <div className={styles.topShadow} aria-hidden="true" />
            <div className={styles.stageDust} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--i": index } as React.CSSProperties} />)}</div>
            <a href="#our-stage" className={styles.scrollCue} aria-label="스크롤해서 막을 열고 서비스 소개 보기"><span className={styles.scrollLine} aria-hidden="true" /><span aria-hidden="true">↓</span></a>
            <button ref={teamButtonRef} className={styles.teamTrigger} onClick={() => teamDialogRef.current?.showModal()} aria-label="세 번째 노트북의 불빛, 예술in 팀 소개 열기"><span aria-hidden="true" /></button>
          </div>
        </section>

        <section id="our-stage" className={styles.introduction} aria-labelledby="intro-title">
          <h2 id="intro-title" data-reveal>오디션을 찾고<br /><span>다음 무대를 준비하는 곳</span></h2>
          <div className={styles.serviceLinks} data-reveal><Link href="/auditions">배우를 위한 오디션 공고</Link><Link href="/shows">관객을 위한 무료 공연 예매</Link><Link href="/producer-service">공연사를 위한 모집과 심사</Link></div>
        </section>

        <section id="opportunities" className={styles.gallery} ref={galleryRef} aria-labelledby="gallery-title">
          <div className={styles.galleryPin}>
            <div className={styles.galleryHeading}><h2 id="gallery-title">다음 장면을 만나보세요</h2><Link href="/auditions" className={styles.textLink}>공고 전체 보기</Link></div>
            <div className={styles.posterViewport} tabIndex={0} role="region" aria-label="예술in 공고 아카이브, 가로로 스크롤할 수 있어요">
              <div className={styles.posterTrack} ref={trackRef}>
                {landingPosters.map((poster) => <Link href={`/posts/${poster.id}`} className={styles.poster} key={poster.id}><div className={styles.posterImage}><Image src={poster.image} alt={`${poster.caption} 오디션 포스터`} fill sizes="(max-width: 760px) 72vw, 330px" /><span className={styles.posterVisit}><Arrow /></span></div><h3>{poster.caption}</h3></Link>)}
              </div>
            </div>
          </div>
        </section>

        <ServiceGuide />

        <BackstageTechnology />
        <section className={styles.finale} aria-labelledby="finale-title"><h2 id="finale-title" data-reveal>준비한 마음이<br /><em>무대에 닿는 순간까지</em></h2><Link href="/" className={styles.finaleCta}>예술in에서 시작하기</Link></section>
      </main>

      <footer className={styles.footer}><Link href="/" className={styles.logo}><Logo /></Link><div><Link href="/privacy">개인정보처리방침</Link><Link href="/terms">이용약관</Link><a href="#landing-top">맨 위로</a></div></footer>

      <dialog ref={teamDialogRef} className={styles.teamDialog} aria-labelledby="team-title" onClick={(event) => { if (event.target === event.currentTarget) teamDialogRef.current?.close(); }} onClose={() => teamButtonRef.current?.focus()}>
        <button className={styles.dialogClose} onClick={() => teamDialogRef.current?.close()} aria-label="팀 소개 닫기">×</button>
        <div className={styles.teamPhoto}><Image src={STAGE_IMAGE} alt="어두운 객석에서 다음 무대를 준비하는 예술in 팀 다섯 명을 표현한 이미지" fill sizes="(max-width: 760px) 95vw, 1180px" unoptimized /></div>
        <div className={styles.teamWords}><div className={styles.teamHeading}><h2 id="team-title">무대 뒤의 예술in</h2><span className={styles.achievement}>모두의 창업 2차 1라운드 진출</span></div><ul className={styles.teamMembers}>{team.map((member) => <li key={member.nickname}><span className={styles.memberNickname}>{member.nickname}{member.representative && <small>팀 대표</small>}</span><span className={styles.memberName}>{member.name}</span></li>)}</ul></div>
      </dialog>
    </div>
  );
}
