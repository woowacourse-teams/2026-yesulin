import Link from "next/link";
import type { ReactNode } from "react";
import { PiUser, PiChatCircle } from "react-icons/pi";
import { CommunityShell } from "./community-shell";

export function CommunityScreen({ children }: { readonly children: ReactNode }) {
  return <CommunityShell>{children}</CommunityShell>;
}

export function AnonymousAvatar({ small = false }: { readonly small?: boolean }) {
  let className = "community-avatar";
  if (small) className += " community-avatar-small";
  return <span className={className} aria-hidden="true"><PiUser size={23} /></span>;
}

export function CommunityAuthor({ createdAt, updatedAt }: { readonly createdAt: string; readonly updatedAt: string }) {
  return <div className="community-author"><AnonymousAvatar /><div className="community-author-copy"><strong>익명</strong>
    <CommunityMeta createdAt={createdAt} updatedAt={updatedAt} /></div></div>;
}

export function CommunityError({ message, retry }: { readonly message: string; readonly retry?: () => void }) {
  if (!message) return null;
  return <div className="community-error" role="alert"><p>{message}</p>
    {retry && <button type="button" className="community-button" onClick={retry}>다시 시도</button>}</div>;
}

export function CommunityMissing() {
  return <section className="community-empty"><PiChatCircle size={38} aria-hidden="true" /><h1>글을 찾을 수 없어요</h1>
    <p>삭제되었거나 주소가 올바르지 않아요.</p><Link className="community-button" href="/community">목록으로</Link></section>;
}

export function CommunityMeta({ createdAt, updatedAt }: { readonly createdAt: string; readonly updatedAt: string }) {
  const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(createdAt));
  return <p className="community-meta"><time dateTime={createdAt} title={date}>{date}</time>{createdAt !== updatedAt && " · 수정됨"}</p>;
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

export function BrowserOwnershipNotice() {
  return <p className="community-hint">로그인 없이 익명으로 올릴 수 있어요. 수정·삭제는 작성한 브라우저에서만 가능해요.
    브라우저 데이터를 지우거나 시크릿 창을 닫으면 수정·삭제할 수 없어요.</p>;
}
