"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { PublishedActorPage } from "@/features/actor-pages/owner-api";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { PrimaryLink, SecondaryButton, TextButton } from "@/components/ui/controls";

/** 공개 API 성공 뒤에만 부모가 연다. QR 생성이나 공유 실패가 공개 성공을 취소하지 않는다. */
export function ActorPagePublished({ result, onEdit, onPhotos }: { readonly result: PublishedActorPage; readonly onEdit: () => void; readonly onPhotos: () => void }) {
  const handle = result.settings.handle!;
  const url = new URL(actorPageRoutes.detail(handle), window.location.origin).toString();
  const name = result.profile.answers.find((answer) => answer.key === "NAME")?.value;
  const photo = result.profile.photoLibrary.find((item) => item.visibility === "PUBLIC" && item.publicCopyUrl);
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    document.getElementById("profile-published-title")?.focus();
  }, []);
  useEffect(() => {
    let active = true;
    void import("qrcode").then(({ default: code }) => code.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 4, width: 256 })).then((svg) => {
      if (active) { setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); setQrFailed(false); }
    }).catch(() => { if (active) setQrFailed(true); });
    return () => { active = false; };
  }, [url, retry]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setMessage("주소를 복사했어요."); }
    catch { setMessage("복사하지 못했어요. 아래 주소를 길게 눌러 복사해 주세요."); }
  };
  const share = async () => {
    setMessage("");
    if (typeof navigator.share !== "function") { await copy(); return; }
    try { await navigator.share({ title: `${typeof name === "string" ? name : "배우"} | 예술in`, url }); }
    catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setMessage("공유하지 못했어요. 주소 복사로 전달해 주세요."); }
  };
  return <section className="workspace-panel mx-auto max-w-2xl" aria-labelledby="profile-published-title">
    <p className="text-sm font-semibold text-brand">공개 완료</p>
    <h1 id="profile-published-title" tabIndex={-1} className="mt-2 text-2xl font-bold outline-none">내 배우 페이지가 생겼어요</h1>
    <p className="mt-3 text-sm leading-6 text-muted-strong">QR이나 링크로 바로 소개해 보세요. 경력과 영상은 나중에 추가해도 괜찮아요.</p>
    <div className="mt-6 flex items-center gap-4 border-y border-border-soft py-5">
      {photo ? <Image src={photo.publicCopyUrl!} alt="페이지 대표사진" width={72} height={96} unoptimized className="h-24 w-[72px] shrink-0 rounded-control object-cover" /> : null}
      <div className="min-w-0"><h3 className="break-words text-xl font-bold">{typeof name === "string" ? name : "배우"}</h3><p className="mt-1 break-all text-sm text-muted-strong">@{handle}</p><a href={url} className="mt-2 block break-all text-sm text-brand underline">{url}</a></div>
    </div>
    {result.failedPhotoIds.length ? <div role="alert" className="mt-4 rounded-control bg-warn-bg p-4 text-sm leading-6">사진 {result.failedPhotoIds.length}장은 아직 페이지에 올라가지 않았어요. 나머지 사진으로 공개됐어요.<button type="button" onClick={onPhotos} className="block min-h-11 font-semibold underline">사진 다시 확인하기</button></div> : null}
    <div className="mt-6 flex flex-col items-center gap-2 rounded-card bg-surface p-5">
      {qr ? <>
        {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 생성한 QR SVG. */}
        <img src={qr} width={192} height={192} alt="내 배우 페이지로 연결되는 QR 코드" className="bg-white" />
        <a href={qr} download={`yesulin-actor-${handle}.svg`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand underline">QR 저장하기</a>
      </> : qrFailed ? <p role="alert" className="text-sm">QR을 만들지 못했어요. 링크는 사용할 수 있어요.<button type="button" onClick={() => { setQrFailed(false); setRetry((value) => value + 1); }} className="block min-h-11 font-semibold underline">QR 다시 만들기</button></p> : <p role="status" className="py-12 text-sm text-muted">QR을 만드는 중…</p>}
    </div>
    <div className="mt-5 grid grid-cols-2 gap-2"><SecondaryButton onClick={() => void copy()}>주소 복사</SecondaryButton><SecondaryButton onClick={() => void share()}>페이지 공유</SecondaryButton></div>
    <p role="status" className="mt-2 text-sm text-muted-strong">{message}</p>
    <PrimaryLink href={actorPageRoutes.detail(handle)} className="mt-4 w-full">내 페이지 보기</PrimaryLink>
    <TextButton onClick={onEdit} className="mt-2 w-full">나중에 더 채우기 · 작성 화면으로</TextButton>
  </section>;
}
