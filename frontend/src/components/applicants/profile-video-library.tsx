"use client";

import { useState } from "react";
import {
  addApplicantProfileVideo,
  deleteApplicantProfileVideo,
  moveApplicantProfileVideo,
} from "@/features/applicants/profile-api";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { youtubeVideoId } from "@/features/applications/application-form-state";
import { useToast } from "@/components/auditions/toast";
import { FieldInput, PrimaryButton, TextButton } from "@/components/ui/controls";

const MAX_LIBRARY_VIDEOS = 10;

export function ProfileVideoLibrary({ profile, onSaved }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void }) {
  const toast = useToast();
  const [videos, setVideos] = useState(profile.videoLibrary);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const persist = async (action: (current: ApplicantProfileResponse) => Promise<ApplicantProfileResponse>, message: string) => {
    setSaving(true);
    setError("");
    try {
      const saved = await action({ ...profile, videoLibrary: videos });
      setVideos(saved.videoLibrary);
      onSaved(saved);
      notifyApplicantProfileChanged();
      toast(message, { type: "success" });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "영상 보관함을 저장하지 못했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    const youtubeId = youtubeVideoId(url.trim());
    if (!youtubeId) { setError("올바른 YouTube 링크를 입력해 주세요."); return; }
    if (videos.some((video) => video.youtubeId === youtubeId)) { setError("이미 보관 중인 영상이에요."); return; }
    if (videos.length >= MAX_LIBRARY_VIDEOS) { setError("영상은 최대 10개까지 보관할 수 있어요."); return; }
    if (await persist(
      (current) => addApplicantProfileVideo(current, url.trim(), youtubeId),
      "영상을 보관함에 추가했어요.",
    )) setUrl("");
  };

  const remove = (id: string) => persist(
    (current) => deleteApplicantProfileVideo(current, id),
    "영상을 보관함에서 삭제했어요.",
  );
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= videos.length) return;
    const video = videos[index];
    if (!video) return;
    void persist(
      (current) => moveApplicantProfileVideo(current, video.id, target),
      "영상 순서를 변경했어요.",
    );
  };

  return <div className="mt-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold">영상 보관함</h3><p className="mt-1 text-sm leading-6 text-muted">YouTube 공개 또는 일부공개 링크를 최대 10개까지 보관할 수 있어요.</p></div><span className="num rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">{videos.length} / {MAX_LIBRARY_VIDEOS}</span></div>
    {videos.length < MAX_LIBRARY_VIDEOS ? <div className="mt-5 rounded-card border border-border bg-surface p-4"><label htmlFor="profile-video-url" className="text-sm font-semibold">YouTube 링크</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><FieldInput id="profile-video-url" type="url" value={url} onChange={(event) => { setUrl(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void add(); } }} placeholder="https://youtu.be/..." /><PrimaryButton disabled={saving || !url.trim()} onClick={() => void add()} className="shrink-0 px-5">{saving ? "저장 중…" : "영상 추가"}</PrimaryButton></div><p className="mt-2 text-xs text-muted">링크를 추가하면 즉시 저장되고 아래에서 재생할 수 있어요.</p></div> : null}
    {videos.length ? <div className="mt-5 grid gap-4 md:grid-cols-2">{videos.map((video, index) => <article key={video.id} className="overflow-hidden rounded-card border border-border bg-surface"><div className="aspect-video bg-sidebar"><iframe src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`} title={`보관한 연기 영상 ${index + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full border-0" /></div><div className="p-3"><p className="truncate text-xs text-muted-strong">{video.url}</p><div className="mt-2 grid grid-cols-3 gap-1"><button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)} className="min-h-10 rounded-md text-xs font-semibold text-muted-strong hover:bg-card disabled:text-muted-soft" aria-label={`영상 ${index + 1} 앞으로 이동`}>← 앞으로</button><button type="button" disabled={saving || index === videos.length - 1} onClick={() => move(index, 1)} className="min-h-10 rounded-md text-xs font-semibold text-muted-strong hover:bg-card disabled:text-muted-soft" aria-label={`영상 ${index + 1} 뒤로 이동`}>뒤로 →</button><TextButton disabled={saving} onClick={() => void remove(video.id)} className="min-h-10 px-2 text-xs text-fail hover:bg-fail-bg hover:text-fail">삭제</TextButton></div></div></article>)}</div> : <div className="mt-5 rounded-card border border-dashed border-border bg-surface px-5 py-10 text-center"><strong>보관한 영상이 없어요</strong><p className="mt-2 text-sm text-muted">YouTube 링크를 추가하면 영상이 이곳에 임베드됩니다.</p></div>}
    {error ? <p role="alert" className="mt-4 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
  </div>;
}
