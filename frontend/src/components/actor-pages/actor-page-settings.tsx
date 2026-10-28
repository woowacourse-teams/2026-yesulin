"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { PrimaryButton, SecondaryButton, SegmentButton } from "@/components/ui/controls";
import {
  changeActorHandle,
  changeActorPageFieldVisibilities,
  getActorHandleAvailability,
  getActorPageSettings,
  unpublishActorPage,
  type PublishedActorPage,
} from "@/features/actor-pages/owner-api";
import {
  ACTOR_HANDLE_CONTACT_EMAIL,
  ACTOR_PAGE_FIELDS,
  PRODUCER_ONLY_VIDEO_GUIDE,
  actorPageAddress,
  autoHiddenMessage,
  canPublish,
  handleUnavailableMessage,
  missingFieldLabel,
  pageRepresentativePhoto,
  profileHasValue,
  publishBlockers,
  showsUnlockedNotice,
  type ActorHandleAvailability,
  type ActorPageField,
  type ActorPageSettings,
} from "@/features/actor-pages/settings";
import { ACTOR_PAGE_INQUIRY_URL, actorPageRoutes, isActorHandleAddress, normalizeActorHandle } from "@/features/actor-pages/types";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import { changeApplicantProfileVideoVisibility } from "@/features/applicants/profile-api";
import {
  changeApplicantProfilePhotoVisibility,
  prepareApplicantPhotoPublicCopies,
  reloadApplicantProfilePhotos,
} from "@/features/applicants/profile-photo-api";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "@/features/applicants/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { ActorPagePublishDialog } from "./actor-page-publish-dialog";

export type ActorPageSettingsState = {
  readonly settings: ActorPageSettings | null;
  readonly error: string;
  /** 화면을 비우지 않고 다시 읽는다. 실패하면 null이고 직전 설정을 그대로 둔다. */
  readonly refresh: () => Promise<ActorPageSettings | null>;
  readonly update: (settings: ActorPageSettings) => void;
};

type LoadedSettings = { readonly settings: ActorPageSettings | null; readonly error: string };

async function loadSettings(): Promise<LoadedSettings> {
  try {
    return { settings: await getActorPageSettings(), error: "" };
  } catch (cause) {
    console.error("[배우 페이지 설정 조회 실패]", cause);
    return { settings: null, error: errorMessage(cause, "배우 페이지 설정을 불러오지 못했어요.") };
  }
}

/**
 * 프로필·사진을 바꾸면 자동 비공개나 공개 조건이 달라질 수 있어 편집 화면이 함께 다시 읽는다. 여러 조회가 겹치면 늦게 도착한
 * 옛 응답이 더 새 조회나 공개·변경 응답으로 받은 설정을 덮지 않도록 마지막 요청만 반영한다.
 */
export function useActorPageSettings(): ActorPageSettingsState {
  const [state, setState] = useState<LoadedSettings>({ settings: null, error: "" });
  const latestRequest = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++latestRequest.current;
    const result = await loadSettings();
    if (request === latestRequest.current) {
      setState((current) => ({ settings: result.settings ?? current.settings, error: result.error }));
    }
    return result.settings;
  }, []);
  const update = useCallback((settings: ActorPageSettings) => {
    latestRequest.current += 1;
    setState({ settings, error: "" });
  }, []);
  useEffect(() => {
    const request = ++latestRequest.current;
    void loadSettings().then((result) => { if (request === latestRequest.current) setState(result); });
    return () => { latestRequest.current += 1; };
  }, []);
  return { settings: state.settings, error: state.error, refresh, update };
}

/** 일부 사진의 공개 사본을 만들지 못했으면 그 사실을 함께 알린다. */
export function publishedActorPageToast(toast: ReturnType<typeof useToast>, result: PublishedActorPage) {
  const failed = result.failedPhotoIds.length;
  toast(failed
    ? `배우 페이지를 공개했어요. 사진 ${failed}장은 올리지 못했어요. 배우 페이지 탭의 사진에서 다시 시도해 주세요.`
    : "배우 페이지를 공개했어요.", { type: failed ? "error" : "success" });
}

const NOTICE_TONES = {
  danger: "border-fail/25 bg-fail-bg text-fail",
  warning: "border-warn/30 bg-warn-bg text-foreground",
  info: "border-brand-line bg-brand-soft text-foreground",
} as const;

function Notice({ tone, children }: { readonly tone: keyof typeof NOTICE_TONES; readonly children: ReactNode }) {
  return <div role={tone === "info" ? "status" : "alert"} className={`rounded-control border px-4 py-3 text-sm leading-6 ${NOTICE_TONES[tone]}`}>{children}</div>;
}

export function ActorPageSettingsPanel({
  profile,
  actorPage,
  onProfileChange,
}: {
  readonly profile: ApplicantProfileResponse;
  readonly actorPage: ActorPageSettingsState;
  readonly onProfileChange: (profile: ApplicantProfileResponse) => void;
}) {
  const toast = useToast();
  const { settings, error, refresh, update } = actorPage;
  const [publishOpen, setPublishOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  if (!settings) {
    return error
      ? <div className="mt-6"><ScreenError message={error} onRetry={() => void refresh()} /></div>
      : <div role="status" aria-label="배우 페이지 설정 불러오는 중" className="mt-6 grid animate-pulse gap-4"><div className="h-36 rounded-card bg-border-soft" /><div className="h-24 rounded-card bg-border-soft" /><div className="h-64 rounded-card bg-border-soft" /></div>;
  }

  const blockers = publishBlockers(settings, profile.photoLibrary);
  const hiddenMessage = autoHiddenMessage(settings, blockers);
  const isPublic = settings.status === "PUBLIC";

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    setActionError("");
    try {
      await action();
    } catch (cause) {
      console.error("[배우 페이지 설정 저장 실패]", cause);
      setActionError(errorMessage(cause, failure));
    } finally {
      setBusy(false);
    }
  };

  const changeProfile = (next: ApplicantProfileResponse) => {
    onProfileChange(next);
    notifyApplicantProfileChanged();
  };

  const toggleField = (field: ActorPageField, label: string, publicNow: boolean) => run(async () => {
    update(await changeActorPageFieldVisibilities({ [field]: publicNow ? "PRIVATE" : "PUBLIC" }));
    toast(`${label}을(를) ${publicNow ? "비공개로" : "공개로"} 바꿨어요.`, { type: "success" });
  }, "공개 설정을 저장하지 못했어요.");

  /** 공개 중인 페이지에 사진을 더 보이려면 그 사진의 공개 사본이 있어야 한다. */
  const togglePhoto = (photo: ApplicantProfilePhoto) => run(async () => {
    const makePublic = photo.visibility !== "PUBLIC";
    let next = await changeApplicantProfilePhotoVisibility(profile, photo.id, makePublic ? "PUBLIC" : "PRIVATE");
    let failed = false;
    if (makePublic && isPublic) {
      const prepared = await prepareApplicantPhotoPublicCopies(next);
      next = prepared.profile;
      failed = prepared.failedPhotoIds.length > 0;
    }
    changeProfile(next);
    await refresh();
    toast(failed ? "사진을 공개로 바꿨지만 페이지에 올리지 못했어요. 사진에서 다시 시도해 주세요." : `사진을 ${makePublic ? "공개로" : "비공개로"} 바꿨어요.`, { type: failed ? "error" : "success" });
  }, "사진 공개 설정을 저장하지 못했어요.");

  const retryPhotoCopies = () => run(async () => {
    const prepared = await prepareApplicantPhotoPublicCopies(profile);
    changeProfile(prepared.profile);
    await refresh();
    if (prepared.failedPhotoIds.length) throw new Error("사진을 페이지에 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    toast("사진을 페이지에 올렸어요.", { type: "success" });
  }, "사진을 페이지에 올리지 못했어요.");

  const changeVideo = (videoId: string, visibility: "PUBLIC" | "PRODUCER") => run(async () => {
    changeProfile(await changeApplicantProfileVideoVisibility(profile, videoId, visibility));
    toast(visibility === "PUBLIC" ? "영상을 전체 공개로 바꿨어요." : "영상을 공연사만 보도록 바꿨어요.", { type: "success" });
  }, "영상 공개 범위를 저장하지 못했어요.");

  const unpublish = () => run(async () => {
    update(await unpublishActorPage());
    changeProfile(await reloadApplicantProfilePhotos(profile));
    toast("배우 페이지를 비공개로 바꿨어요.", { type: "success" });
  }, "비공개로 바꾸지 못했어요.");

  const published = (result: PublishedActorPage) => {
    setPublishOpen(false);
    update(result.settings);
    changeProfile(result.profile);
    publishedActorPageToast(toast, result);
  };

  return <div className="mt-6 grid gap-8">
    <section aria-labelledby="actor-page-status-title" className="rounded-card border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="actor-page-status-title" className="font-bold">내 배우 페이지</h3>
          <p className="mt-1 text-sm leading-6 text-muted">누구나 볼 수 있는 내 프로필 페이지예요. 공개하면 배우 목록과 검색엔진에도 나와요.</p>
        </div>
        <StatusBadge settings={settings} />
      </div>
      <p className="mt-3 break-all text-sm font-semibold">{settings.handle ? actorPageAddress(settings.handle) : "아이디를 정하면 페이지 주소가 생겨요."}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {settings.handle ? <CopyAddressButton handle={settings.handle} /> : null}
        <Link href={applicantRoutes.actorPagePreview} className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold hover:border-brand-line">미리보기</Link>
        {isPublic && settings.handle ? (
          <a href={actorPageRoutes.detail(settings.handle)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold hover:border-brand-line">
            내 페이지 열기<span className="sr-only"> (새 창에서 열림)</span>
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        {settings.locked ? (
          <Notice tone="danger">
            <p className="font-semibold">운영자가 배우 페이지를 잠갔어요. 잠금이 풀릴 때까지 공개할 수 없어요.</p>
            {settings.lockReason ? <p className="mt-1 whitespace-pre-line break-words">사유: {settings.lockReason}</p> : null}
            <a href={ACTOR_PAGE_INQUIRY_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center font-semibold underline">카카오톡으로 문의하기<span className="sr-only"> (새 창에서 열림)</span></a>
          </Notice>
        ) : null}
        {showsUnlockedNotice(settings) ? <Notice tone="info">잠금이 풀렸어요. 내용을 확인하고 다시 공개해 주세요.</Notice> : null}
        {hiddenMessage ? <Notice tone="warning">{hiddenMessage}</Notice> : null}
        {!isPublic && !settings.locked && !canPublish(blockers) ? <PublishChecklist missing={blockers.missing} underAge={blockers.underAge} /> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border-soft pt-4">
        {isPublic ? (
          <SecondaryButton onClick={() => void unpublish()} disabled={busy}>비공개로 바꾸기</SecondaryButton>
        ) : (
          <PrimaryButton onClick={() => setPublishOpen(true)} disabled={busy || !canPublish(blockers)}>공개하기</PrimaryButton>
        )}
        <p className="min-w-0 flex-1 text-xs leading-5 text-muted">{isPublic ? "비공개로 바꾸면 페이지와 목록에서 바로 사라져요." : "공개할 때마다 공개 동의를 받아요."}</p>
      </div>
    </section>

    {actionError ? <p role="alert" className="rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{actionError}</p> : null}

    <HandleSection settings={settings} onChanged={(next) => { update(next); toast("아이디를 저장했어요.", { type: "success" }); }} />

    <section aria-labelledby="actor-page-fields-title">
      <h3 id="actor-page-fields-title" className="font-bold">공개할 항목</h3>
      <p className="mt-1 text-sm leading-6 text-muted">이름, 성별, 출생연도·나이와 입력한 키·몸무게는 항상 보여요. 연락처, 주소, 생년월일, 병역은 보이지 않아요.</p>
      <ul className="mt-4 divide-y divide-border-soft rounded-card border border-border bg-card">
        {ACTOR_PAGE_FIELDS.map(({ field, label, answerKey }) => {
          const publicNow = settings.fieldVisibilities[field] === "PUBLIC";
          const empty = !profileHasValue(profile, answerKey);
          return <li key={field} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{label}</p>
              {empty ? <p className="text-xs text-muted">입력한 내용이 없어 공개해도 보이지 않아요.</p> : null}
            </div>
            <VisibilitySwitch label={label} checked={publicNow} disabled={busy} onChange={() => void toggleField(field, label, publicNow)} />
          </li>;
        })}
      </ul>
    </section>

    <PhotoSection photos={profile.photoLibrary} pagePublic={isPublic} busy={busy} onToggle={(photo) => void togglePhoto(photo)} onRetry={() => void retryPhotoCopies()} />

    <section aria-labelledby="actor-page-videos-title">
      <h3 id="actor-page-videos-title" className="font-bold">영상</h3>
      <p className="mt-1 text-sm leading-6 text-muted">&lsquo;공연사만&rsquo;으로 둔 영상은 배우 페이지에 보이지 않아요. {PRODUCER_ONLY_VIDEO_GUIDE}</p>
      {profile.videoLibrary.length ? <ul className="mt-4 grid gap-3">
        {profile.videoLibrary.map((video, index) => {
          const visibility = video.visibility ?? "PRODUCER";
          return <li key={video.id} className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-3">
            <Image src={`https://i.ytimg.com/vi/${video.youtubeId}/mqdefault.jpg`} alt="" width={96} height={54} unoptimized className="h-[54px] w-24 shrink-0 rounded-md bg-surface object-cover" />
            <p className="min-w-0 flex-1 truncate text-sm text-muted-strong">영상 {index + 1} · {video.url}</p>
            <div role="group" aria-label={`영상 ${index + 1} 공개 범위`} className="inline-flex overflow-hidden rounded-control border border-border">
              <SegmentButton pressed={visibility === "PUBLIC"} disabled={busy} onClick={() => { if (visibility !== "PUBLIC") void changeVideo(video.id, "PUBLIC"); }}>전체 공개</SegmentButton>
              <SegmentButton pressed={visibility === "PRODUCER"} disabled={busy} onClick={() => { if (visibility !== "PRODUCER") void changeVideo(video.id, "PRODUCER"); }} className="border-l border-border">공연사만</SegmentButton>
            </div>
          </li>;
        })}
      </ul> : <EmptyLibrary>보관한 영상이 없어요. 영상 탭에서 YouTube 링크를 추가해 주세요.</EmptyLibrary>}
    </section>

    {publishOpen ? (
      <ActorPagePublishDialog mode="publish" settings={settings} profile={profile} onClose={() => setPublishOpen(false)} onPublished={published} />
    ) : null}
  </div>;
}

function StatusBadge({ settings }: { readonly settings: ActorPageSettings }) {
  const [label, tone] = settings.locked
    ? ["잠김", "bg-fail-bg text-fail"]
    : settings.status === "PUBLIC" ? ["공개 중", "bg-brand text-white"] : ["비공개", "bg-border-soft text-muted-strong"];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${tone}`}>{label}</span>;
}

/** 각 항목을 어디서 채우는지 함께 알려 준다. */
const MISSING_GUIDES = {
  HANDLE: "아래에서 아이디를 정해 주세요.",
  NAME: "기본정보 탭에서 입력해 주세요.",
  GENDER: "기본정보 탭에서 입력해 주세요.",
  BIRTH_DATE: "기본정보 탭에서 입력해 주세요.",
  PUBLIC_PHOTO: "아래 사진에서 한 장 이상 공개로 바꿔 주세요.",
} as const;

function PublishChecklist({ missing, underAge }: { readonly missing: ActorPageSettings["readiness"]["missing"]; readonly underAge: boolean }) {
  if (underAge) return <Notice tone="warning">만 14세 미만은 배우 페이지를 공개할 수 없어요.</Notice>;
  return <Notice tone="warning">
    <p className="font-semibold">공개하려면 다음 항목이 필요해요.</p>
    <ul className="mt-1 grid gap-0.5">
      {missing.map((field) => <li key={field}><strong className="font-semibold">{missingFieldLabel(field)}</strong> · {MISSING_GUIDES[field]}</li>)}
    </ul>
  </Notice>;
}

function VisibilitySwitch({ label, checked, disabled, onChange }: { readonly label: string; readonly checked: boolean; readonly disabled: boolean; readonly onChange: () => void }) {
  return <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={`${label} 공개`}
    disabled={disabled}
    onClick={onChange}
    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control px-1 text-sm font-semibold text-muted-strong disabled:opacity-60"
  >
    <span aria-hidden="true">{checked ? "공개" : "비공개"}</span>
    <span aria-hidden="true" className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-brand" : "bg-border"}`}>
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`} />
    </span>
  </button>;
}

function PhotoSection({
  photos,
  pagePublic,
  busy,
  onToggle,
  onRetry,
}: {
  readonly photos: readonly ApplicantProfilePhoto[];
  readonly pagePublic: boolean;
  readonly busy: boolean;
  readonly onToggle: (photo: ApplicantProfilePhoto) => void;
  readonly onRetry: () => void;
}) {
  const pageRepresentative = pageRepresentativePhoto(photos);
  return <section aria-labelledby="actor-page-photos-title">
    <h3 id="actor-page-photos-title" className="font-bold">사진</h3>
    <p className="mt-1 text-sm leading-6 text-muted">
      공개로 바꾼 사진 중 맨 앞 사진이 페이지 대표 사진이에요. 지원서에 쓰는 대표 사진(보관함 맨 앞)과 다를 수 있어요. 순서는 사진 탭에서 바꿔요.
      {pagePublic ? " 공개 사진을 모두 비공개로 바꾸면 페이지도 비공개로 바뀌어요." : ""}
    </p>
    {photos.length ? <ul className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
      {photos.map((photo) => {
        const publicNow = photo.visibility === "PUBLIC";
        const notOnPage = pagePublic && publicNow && !photo.publicCopyUrl;
        return <li key={photo.id} className={`min-w-0 overflow-hidden rounded-card border bg-card ${photo.id === pageRepresentative?.id ? "border-brand ring-2 ring-brand-soft" : "border-border"}`}>
          <div className="relative aspect-[3/4]">
            <Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 768px) 200px, 45vw" className="object-cover" />
            <div className="absolute left-2 top-2 flex flex-wrap gap-1">
              {photo.id === pageRepresentative?.id ? <span className="rounded-full bg-brand px-2 py-1 text-xs font-semibold text-white">페이지 대표</span> : null}
              {photo.representative ? <span className="rounded-full bg-foreground/80 px-2 py-1 text-xs font-semibold text-white">지원서 대표</span> : null}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <p className="min-w-0 truncate text-xs font-medium">{photo.name}</p>
            <VisibilitySwitch label={photo.name} checked={publicNow} disabled={busy} onChange={() => onToggle(photo)} />
          </div>
          {notOnPage ? <div className="border-t border-border-soft px-3 py-2 text-xs leading-5 text-fail">
            페이지에 아직 올라가지 않았어요.{" "}
            <button type="button" disabled={busy} onClick={onRetry} className="inline-flex min-h-9 items-center font-semibold underline disabled:opacity-60">다시 시도</button>
          </div> : null}
        </li>;
      })}
    </ul> : <EmptyLibrary>보관한 사진이 없어요. 사진 탭에서 사진을 추가해 주세요.</EmptyLibrary>}
  </section>;
}

function EmptyLibrary({ children }: { readonly children: ReactNode }) {
  return <p className="mt-4 rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">{children}</p>;
}

type CopyStatus = "idle" | "copied" | "failed";

function CopyAddressButton({ handle }: { readonly handle: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(actorPageRoutes.detail(handle), window.location.origin).toString());
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };
  return <span className="inline-flex flex-wrap items-center gap-2">
    <SecondaryButton onClick={() => void copy()}>주소 복사</SecondaryButton>
    <span role="status" className="text-xs text-muted-strong">{status === "copied" ? "주소를 복사했어요." : status === "failed" ? "복사하지 못했어요. 주소를 직접 복사해 주세요." : ""}</span>
  </span>;
}

type HandleCheck = ActorHandleAvailability | { readonly handle: string; readonly failed: true };

/** 입력을 멈추면 사용 가능 여부를 묻는다. 형식이 틀리면 서버에 묻지 않고 바로 알려 준다. 최종 판단은 저장 API가 한다. */
function HandleSection({ settings, onChanged }: { readonly settings: ActorPageSettings; readonly onChanged: (settings: ActorPageSettings) => void }) {
  const inputId = useId();
  const statusId = useId();
  const [value, setValue] = useState(settings.handle ?? "");
  const [check, setCheck] = useState<HandleCheck | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const normalized = normalizeActorHandle(value);
  const unchanged = normalized === (settings.handle ?? "");
  const validFormat = isActorHandleAddress(normalized);

  useEffect(() => {
    if (!settings.handleEditable || !normalized || unchanged || !validFormat) return;
    let active = true;
    const timer = window.setTimeout(() => {
      getActorHandleAvailability(normalized)
        .then((result) => { if (active) setCheck(result); })
        .catch((cause) => {
          console.error("[배우 아이디 확인 실패]", cause);
          if (active) setCheck({ handle: normalized, failed: true });
        });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [normalized, unchanged, validFormat, settings.handleEditable]);

  if (!settings.handleEditable) {
    return <section aria-labelledby="actor-page-handle-title">
      <h3 id="actor-page-handle-title" className="font-bold">아이디</h3>
      <p className="mt-2 text-base font-semibold">@{settings.handle}</p>
      <p className="mt-1 text-sm leading-6 text-muted">
        처음 공개한 뒤에는 아이디를 직접 바꿀 수 없어요. 아이디 변경은 카카오톡 문의 또는{" "}
        <a href={`mailto:${ACTOR_HANDLE_CONTACT_EMAIL}`} className="font-semibold text-brand hover:underline">{ACTOR_HANDLE_CONTACT_EMAIL}</a>로 요청해 주세요.
      </p>
      <a href={ACTOR_PAGE_INQUIRY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">카카오톡으로 문의하기<span className="sr-only"> (새 창에서 열림)</span></a>
    </section>;
  }

  const current = check && check.handle === normalized ? check : null;
  const status = !normalized ? { tone: "muted", text: "영문 소문자, 숫자, 마침표(.), 밑줄(_)로 30자까지 쓸 수 있어요." }
    : unchanged ? { tone: "muted", text: "지금 쓰고 있는 아이디예요." }
      : !validFormat ? { tone: "fail", text: handleUnavailableMessage("INVALID_FORMAT") }
        : !current ? { tone: "muted", text: "확인하는 중…" }
          : "failed" in current ? { tone: "fail", text: "사용할 수 있는지 확인하지 못했어요. 잠시 후 다시 입력해 주세요." }
            : current.available ? { tone: "ok", text: "쓸 수 있는 아이디예요." }
              : { tone: "fail", text: handleUnavailableMessage(current.reason ?? "INVALID_FORMAT") };
  const savable = Boolean(current && !("failed" in current) && current.available) && !unchanged;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      onChanged(await changeActorHandle(normalized));
      setValue(normalized);
    } catch (cause) {
      console.error("[배우 아이디 저장 실패]", cause);
      setError(errorMessage(cause, "아이디를 저장하지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  return <section aria-labelledby="actor-page-handle-title">
    <h3 id="actor-page-handle-title" className="font-bold">아이디</h3>
    <p className="mt-1 text-sm leading-6 text-muted">페이지 주소에 쓰여요. 처음 공개하기 전까지만 직접 바꿀 수 있어요.</p>
    <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (savable && !saving) void save(); }}>
      <label htmlFor={inputId} className="sr-only">아이디</label>
      <div className="flex min-h-12 min-w-0 flex-1 items-center rounded-control border border-border bg-card px-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand-soft">
        <span aria-hidden="true" className="text-muted">@</span>
        <input
          id={inputId}
          value={value}
          onChange={(event) => { setValue(event.target.value); setError(""); }}
          maxLength={30}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={statusId}
          aria-invalid={status.tone === "fail" || undefined}
          className="min-w-0 flex-1 bg-transparent px-1 text-base outline-none"
          placeholder="actor.name"
        />
      </div>
      <PrimaryButton type="submit" disabled={!savable || saving} className="min-h-12 shrink-0 px-5">{saving ? "저장 중…" : "아이디 저장"}</PrimaryButton>
    </form>
    <p id={statusId} aria-live="polite" className={`mt-2 text-sm ${status.tone === "fail" ? "text-fail" : status.tone === "ok" ? "font-semibold text-brand" : "text-muted"}`}>{status.text}</p>
    {normalized && validFormat ? <p className="mt-1 break-all text-xs text-muted">페이지 주소: {actorPageAddress(normalized)}</p> : null}
    {error ? <p role="alert" className="mt-2 text-sm font-medium text-fail">{error}</p> : null}
  </section>;
}
