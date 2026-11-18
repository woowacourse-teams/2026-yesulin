"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PiX } from "react-icons/pi";
import { LoginForm } from "@/components/auth/login-form";

type LoginIntent = "write" | "participate";

const loginCopy = {
  write: { title: "로그인하고 글쓰기", description: "배우 계정으로 로그인하면 바로 글을 쓸 수 있어요." },
  participate: { title: "로그인하고 작성하기", description: "배우 계정으로 로그인한 뒤 작성하던 화면으로 돌아와요." },
} satisfies Record<LoginIntent, { title: string; description: string }>;

type LoginProps = { readonly returnTo: string; readonly intent?: LoginIntent };
type TriggerProps = LoginProps & { readonly className?: string; readonly children?: ReactNode };

export function CommunityLogin({ returnTo, intent = "participate", className = "community-pill", children }: TriggerProps) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={className} aria-haspopup="dialog" onClick={event => {
      event.currentTarget.focus();
      setOpen(true);
    }}>{children ?? loginCopy[intent].title}</button>
    {open && <CommunityLoginDialog returnTo={returnTo} intent={intent} onClose={() => setOpen(false)} />}
  </>;
}

function CommunityLoginDialog({ returnTo, intent = "participate", onClose }: LoginProps & { readonly onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();
  const copy = loginCopy[intent];
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);
  return <dialog className="community-login-dialog" ref={dialog} aria-labelledby={headingId} aria-describedby={descriptionId}
    onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="community-login-panel">
      <button className="community-login-close" type="button" aria-label="닫기" onClick={() => dialog.current?.close()}>
        <PiX size={20} aria-hidden="true" />
      </button>
      <header className="community-login-heading">
        <h2 id={headingId}>{copy.title}</h2>
        <p id={descriptionId}>{copy.description}</p>
      </header>
      <LoginForm returnTo={returnTo} />
    </div>
  </dialog>;
}
