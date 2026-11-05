"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { PiChatCircle } from "react-icons/pi";
import { avatarHue } from "@/features/community/avatar";
import { fullTime, relativeTime } from "@/features/community/time";

type PhotoProps = { readonly photoUrl?: string | null; readonly small?: boolean; readonly label?: string; readonly seed?: string };

/** 사진이 없으면 글 번호와 이름으로 색을 정한 별 마스코트를 보인다. label이 없으면 아무것도 그리지 않는다. */
export function CommunityPhoto({ photoUrl, small = false, label, seed }: PhotoProps) {
  let className = "community-avatar";
  if (small) className += " community-avatar-small";
  if (photoUrl) return <Image className={className} src={photoUrl} alt="" width={40} height={40} unoptimized />;
  if (!label) return null;
  return <span className={`${className} community-avatar-star`} style={{ filter: `hue-rotate(${avatarHue(seed ?? label)}deg)` }} aria-hidden="true">
    <Image src="/images/community-star-chat.png" alt="" width={40} height={37} /></span>;
}

type BylineProps = { readonly author: string; readonly createdAt: string; readonly updatedAt: string; readonly showProfileBadge?: boolean; readonly markWriter?: boolean; readonly authorPath?: string | null };

export function CommunityByline({ author, createdAt, updatedAt, markWriter = false, authorPath, showProfileBadge }: BylineProps) {
  return <div className="community-byline"><strong>{authorPath && <Link href={authorPath}>{author}{showProfileBadge && <span className="community-profile-badge">프로필</span>}</Link>}{!authorPath && author}</strong>
    {markWriter && <span className="community-writer">글쓴이</span>}
    <CommunityTime createdAt={createdAt} updatedAt={updatedAt} /></div>;
}

function CommunityTime({ createdAt, updatedAt }: { readonly createdAt: string; readonly updatedAt: string }) {
  return <span className="community-time"><time dateTime={createdAt} title={fullTime(createdAt)}>{relativeTime(createdAt)}</time>
    {createdAt !== updatedAt && " · 수정됨"}</span>;
}

export function CommunityError({ message, retry }: { readonly message: string; readonly retry?: () => void }) {
  if (!message) return null;
  return <div className="community-error" role="alert"><p>{message}</p>
    {retry && <button type="button" className="community-error-retry" onClick={retry}>다시 시도</button>}</div>;
}

export function CommunityMissing() {
  return <section className="community-empty"><PiChatCircle size={36} aria-hidden="true" /><h1>글을 찾을 수 없어요</h1>
    <p>삭제되었거나 주소가 올바르지 않아요.</p><Link className="community-pill" href="/community">목록으로</Link></section>;
}

export function PlainText({ text }: { readonly text: string }) {
  return <div className="community-body">{text.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => <TextPart key={index} text={part} />)}</div>;
}

function TextPart({ text }: { readonly text: string }) {
  if (/^https?:\/\//.test(text)) {
    return <a href={text} target="_blank" rel="noopener noreferrer nofollow ugc">{text}</a>;
  }
  return <>{text}</>;
}

export function useCommunityToast() {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function show(next: string) {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(""), 2500);
  }
  return { message, show };
}

export function CommunityToast({ message }: { readonly message: string }) {
  return <p className="community-toast" role="status" data-visible={Boolean(message)}>{message}</p>;
}
