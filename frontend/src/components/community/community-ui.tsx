"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PiChatCircle } from "react-icons/pi";
import { fullTime, relativeTime } from "@/features/community/time";

const POST_WRITER = "익명1";

export function AnonymousAvatar({ author, small = false }: { readonly author?: string; readonly small?: boolean }) {
  let className = "community-avatar";
  if (small) className += " community-avatar-small";
  return <span className={className} aria-hidden="true">{avatarLabel(author)}</span>;
}

function avatarLabel(author?: string) {
  if (!author) return "익";
  return author.replace("익명", "익");
}

export function EntryRail({ author, threaded, small = false }: { readonly author: string; readonly threaded: boolean; readonly small?: boolean }) {
  return <div className="community-rail"><AnonymousAvatar author={author} small={small} />{threaded && <span className="community-rail-line" />}</div>;
}

type BylineProps = { readonly author: string; readonly createdAt: string; readonly updatedAt: string; readonly markWriter?: boolean };

export function CommunityByline({ author, createdAt, updatedAt, markWriter = false }: BylineProps) {
  return <div className="community-byline"><strong>{author}</strong>
    {markWriter && author === POST_WRITER && <span className="community-writer">글쓴이</span>}
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
