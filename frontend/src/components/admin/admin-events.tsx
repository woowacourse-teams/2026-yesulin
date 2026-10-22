"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { EventPhaseBadge } from "@/components/events/event-screen";
import { ConfirmDialog } from "@/components/shows/manage/confirm-dialog";
import { FieldInput, FieldTextarea } from "@/components/ui/controls";
import {
  AdminApiError,
  changeEventStatus,
  createEvent,
  deleteEvent,
  fetchAdminEvents,
  updateEvent,
  uploadEventImage,
} from "@/features/admin/api";
import type { AdminEvent, AdminEventStatus, AdminEventWrite } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import {
  BANNER_RATIOS,
  bannerRatioWarning,
  draftOfEvent,
  emptyEventDraft,
  eventDraftProblem,
  writeOfEvent,
  type EventDraft,
  type EventImageSlot,
} from "@/features/events/draft";
import { eventRoutes, formatEventPeriod } from "@/features/events/types";
import { formatDateTime } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "unauthorized" | "failed";

/** 검토 전이나 숨긴 글은 공개하고, 공개 중이면 숨긴다. */
const STATUS_ACTIONS: Readonly<Record<AdminEventStatus, string>> = {
  PENDING: "공개하기",
  PUBLISHED: "숨기기",
  HIDDEN: "다시 공개",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * 이벤트 글을 쓰고 고친다. 새 글은 검토 전이라 보이지 않고, 공개해야 이벤트 화면에 보인다. 배너 노출을 켠 글은 공개 중이고
 * 노출 종료일이 지나지 않은 동안 메인 상단 배너에도 보인다.
 */
export function AdminEvents() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [events, setEvents] = useState<readonly AdminEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  /** 편집 중인 글. `"new"`면 새로 쓴다. */
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [changing, setChanging] = useState<number | null>(null);
  /** 삭제 확인 중인 글. */
  const [deleting, setDeleting] = useState<AdminEvent | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAdminEvents()
      .then((next) => {
        if (!active) return;
        setEvents(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        setError(cause instanceof Error ? cause.message : "이벤트 목록을 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  const replace = (event: AdminEvent) => setEvents((current) => [
    event, ...current.filter((item) => item.id !== event.id),
  ].sort((left, right) => right.id - left.id));

  const toggleStatus = async (event: AdminEvent) => {
    setChanging(event.id);
    setError(null);
    try {
      replace(await changeEventStatus(event.id, event.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"));
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setPhase("unauthorized");
        return;
      }
      setError(cause instanceof Error ? cause.message : "공개 상태를 바꾸지 못했습니다.");
    } finally {
      setChanging(null);
    }
  };

  const remove = async (event: AdminEvent) => {
    setRemoving(true);
    setError(null);
    try {
      await deleteEvent(event.id);
      setEvents((current) => current.filter((item) => item.id !== event.id));
      if (editing === event.id) setEditing(null);
      setDeleting(null);
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        setPhase("unauthorized");
        return;
      }
      setDeleting(null);
      setError(cause instanceof Error ? cause.message : "이벤트를 지우지 못했습니다.");
    } finally {
      setRemoving(false);
    }
  };

  async function signOut() {
    await logout().catch(() => null);
    setEvents([]);
    setPhase("unauthorized");
  }

  if (phase === "unauthorized") return <AdminSessionEnded />;

  const editingEvent = typeof editing === "number" ? events.find((event) => event.id === editing) : undefined;

  return (
    <AdminShell
      current="events"
      title="이벤트"
      description="이벤트 글을 쓰고 공개해 주세요. 배너 노출을 켜면 메인 상단 배너에도 보여요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton tone="quiet" onClick={() => void signOut()}>로그아웃</AdminActionButton>
        </>
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">이벤트 <span className="num ml-1 text-sm font-normal text-muted">{phase === "ready" ? `${events.length}건` : ""}</span></h2>
        <AdminActionButton tone="primary" onClick={() => setEditing("new")} disabled={editing === "new"}>이벤트 쓰기</AdminActionButton>
      </div>
      <p className="-mt-3 text-xs text-muted">메인 배너는 오디션 알림 배너 다음, 배우 정보 공유방 배너 앞에 순서대로 들어가고 5개까지 보여요.</p>

      {editing === "new" ? (
        <EventForm
          key="new"
          initial={emptyEventDraft()}
          submitLabel="검토 전으로 만들기"
          onCancel={() => setEditing(null)}
          onSave={async (write) => {
            replace(await createEvent(write));
            setEditing(null);
          }}
          onUnauthorized={() => setPhase("unauthorized")}
        />
      ) : null}

      {error ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {error} {phase === "failed" ? <button type="button" onClick={refresh} className="font-semibold underline">다시 시도</button> : null}
        </p>
      ) : null}
      {phase === "loading" ? <p role="status" className="text-sm text-muted">이벤트를 불러오는 중이에요.</p> : null}

      {phase === "ready" ? (
        <section aria-label="이벤트 목록" className="flex flex-col gap-4">
          {events.length === 0 && editing !== "new" ? (
            <AdminEmptyState title="첫 이벤트를 써 보세요" description="지난 모집 기록도 마감된 이벤트로 남겨 둘 수 있어요." />
          ) : null}
          {events.map((event) => editing === event.id && editingEvent ? (
            <EventForm
              key={event.id}
              initial={draftOfEvent(editingEvent)}
              submitLabel="저장"
              onCancel={() => setEditing(null)}
              onSave={async (write) => {
                replace(await updateEvent(event.id, write));
                setEditing(null);
              }}
              onUnauthorized={() => setPhase("unauthorized")}
            />
          ) : (
            <EventCard
              key={event.id}
              event={event}
              changing={changing === event.id}
              onEdit={() => setEditing(event.id)}
              onToggleStatus={() => void toggleStatus(event)}
              onDelete={() => setDeleting(event)}
            />
          ))}
        </section>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="이벤트를 지울까요?"
          destructive
          confirmLabel="이벤트 삭제"
          busy={removing}
          onClose={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
          description={(
            <>
              <strong className="font-semibold text-foreground">{deleting.title}</strong>{" "}글과 대표·배너 이미지를 지워요. 되돌릴 수 없고,
              메인 배너와 이벤트 화면에서도 바로 빠져요. 잠시 숨기기만 하려면 &quot;숨기기&quot;를 써 주세요.
            </>
          )}
        />
      ) : null}
    </AdminShell>
  );
}

function EventCard({ event, changing, onEdit, onToggleStatus, onDelete }: {
  readonly event: AdminEvent;
  readonly changing: boolean;
  readonly onEdit: () => void;
  readonly onToggleStatus: () => void;
  readonly onDelete: () => void;
}) {
  const period = formatEventPeriod(event.startsOn, event.endsOn);
  return (
    <article className="rounded-card border border-border bg-card p-4 sm:px-5">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <AuditionPostStatusBadge status={event.status} />
        <EventPhaseBadge phase={event.phase} />
        <BannerState event={event} />
        <span className="num text-muted">이벤트 {event.id}</span>
        <span className="ml-auto text-muted">{formatDateTime(event.updatedAt)} 갱신</span>
      </header>
      <h3 className="mt-3 min-w-0 break-words text-lg font-semibold">{event.title}</h3>
      <p className="mt-1 text-sm text-muted-strong">
        {[period, event.summary].filter(Boolean).join(" · ") || "기간과 요약이 비어 있어요."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
        {event.status === "PUBLISHED" ? (
          <AdminActionLink href={eventRoutes.detail(event.id)} target="_blank">공개 화면</AdminActionLink>
        ) : null}
        <AdminActionButton onClick={onEdit}>수정</AdminActionButton>
        <AdminActionButton tone="destructive" onClick={onDelete}>삭제</AdminActionButton>
        <AdminActionButton disabled={changing} onClick={onToggleStatus} className="ml-auto">
          {changing ? "바꾸는 중…" : STATUS_ACTIONS[event.status]}
        </AdminActionButton>
      </div>
    </article>
  );
}

/** 배너를 켠 글만 노출 여부를 보인다. 켰는데 안 보이면 공개 전이거나 노출 종료일이 지난 것이다. */
function BannerState({ event }: { readonly event: AdminEvent }) {
  if (!event.banner.enabled) return null;
  if (event.bannerVisible) return <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand">배너 노출 중</span>;
  const reason = event.status === "PUBLISHED" ? "노출 기간 끝남" : "공개하면 배너 노출";
  return <span className="rounded-full bg-border-soft px-2.5 py-0.5 font-bold text-muted-strong">{reason}</span>;
}

function EventForm({ initial, submitLabel, onSave, onCancel, onUnauthorized }: {
  readonly initial: EventDraft;
  readonly submitLabel: string;
  readonly onSave: (write: AdminEventWrite) => Promise<void>;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const busy = saving || uploading > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = eventDraftProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(writeOfEvent(draft));
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.status === 401) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "이벤트를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const imageProps = (slot: EventImageSlot, key: "coverImageUrl" | "bannerDesktopImageUrl" | "bannerMobileImageUrl") => ({
    slot,
    url: draft[key],
    onChange: (url: string | null) => set(key, url),
    onBusyChange: (busyNow: boolean) => setUploading((count) => count + (busyNow ? 1 : -1)),
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4 rounded-card border border-brand-line bg-card p-4 sm:p-5">
      <Field id="event-title" label="제목" required>
        <FieldInput id="event-title" value={draft.title} maxLength={100} onChange={(event) => set("title", event.target.value)} />
      </Field>
      <Field id="event-summary" label="요약" hint="목록 카드에 한두 줄로 보여요.">
        <FieldInput id="event-summary" value={draft.summary} maxLength={200} onChange={(event) => set("summary", event.target.value)} />
      </Field>
      <Field id="event-body" label="본문" required hint="줄바꿈을 그대로 보여요.">
        <FieldTextarea id="event-body" rows={8} value={draft.body} maxLength={5000} onChange={(event) => set("body", event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="event-starts-on" label="시작일" hint="비우면 시작일 없이 진행 중으로 보여요.">
          <FieldInput id="event-starts-on" type="date" value={draft.startsOn} onChange={(event) => set("startsOn", event.target.value)} />
        </Field>
        <Field id="event-ends-on" label="종료일" hint="지나면 마감으로 보여요.">
          <FieldInput id="event-ends-on" type="date" value={draft.endsOn} onChange={(event) => set("endsOn", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field id="event-apply-url" label="신청 링크" hint="상세 화면의 신청 버튼이 이 주소를 새 창으로 열어요. 마감되면 버튼을 숨겨요.">
          <FieldInput id="event-apply-url" type="url" inputMode="url" placeholder="https://forms.gle/..." value={draft.applyUrl} maxLength={500} onChange={(event) => set("applyUrl", event.target.value)} />
        </Field>
        <Field id="event-apply-label" label="버튼 문구" hint="비우면 '신청하기'">
          <FieldInput id="event-apply-label" value={draft.applyLabel} maxLength={30} onChange={(event) => set("applyLabel", event.target.value)} />
        </Field>
      </div>
      <ImageField label="대표 이미지" hint="목록 카드와 상세 위쪽에 보여요. 선택 사항이에요." {...imageProps("cover", "coverImageUrl")} />

      <fieldset className="flex flex-col gap-4 rounded-control border border-border-soft p-4">
        <legend className="px-1 text-sm font-semibold">메인 배너</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.bannerEnabled} onChange={(event) => set("bannerEnabled", event.target.checked)} className="size-4 accent-brand" />
          메인 상단 배너에 노출
        </label>
        <p className="-mt-3 text-xs text-muted">공개 중인 글만 보여요. 배너를 누르면 이 이벤트 상세로 가요.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageField label={`PC 배너 (${BANNER_RATIOS.bannerDesktop.label})`} hint="예: 2160×675. 글자는 가운데 쪽에 두세요." {...imageProps("bannerDesktop", "bannerDesktopImageUrl")} />
          <ImageField label={`모바일 배너 (${BANNER_RATIOS.bannerMobile.label})`} hint="예: 1440×1080. 640px 이하 화면에서 보여요." {...imageProps("bannerMobile", "bannerMobileImageUrl")} />
        </div>
        <Field id="event-banner-alt" label="대체 문구" hint="배너 이미지에 적힌 문구를 그대로 옮겨 주세요. 화면 낭독기가 읽어요.">
          <FieldInput id="event-banner-alt" value={draft.bannerAlt} maxLength={200} onChange={(event) => set("bannerAlt", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="event-banner-ends-on" label="노출 종료일" hint="이 날까지 보여요. 비우면 내릴 때까지 보여요.">
            <FieldInput id="event-banner-ends-on" type="date" value={draft.bannerEndsOn} onChange={(event) => set("bannerEndsOn", event.target.value)} />
          </Field>
          <Field id="event-banner-order" label="순서" hint="0~99. 작은 숫자가 먼저 보여요.">
            <FieldInput id="event-banner-order" type="number" min={0} max={99} inputMode="numeric" value={draft.bannerOrder} onChange={(event) => set("bannerOrder", event.target.value)} />
          </Field>
        </div>
      </fieldset>

      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <AdminActionButton onClick={onCancel} disabled={saving}>취소</AdminActionButton>
        <AdminActionButton type="submit" tone="primary" disabled={busy}>
          {saving ? "저장하는 중…" : uploading > 0 ? "이미지 올리는 중…" : submitLabel}
        </AdminActionButton>
      </div>
    </form>
  );
}

function Field({ id, label, required = false, hint, children }: {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="ml-1 text-xs font-normal text-muted">{required ? "필수" : "선택"}</span>
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** 이미지를 원본 그대로 올린다. 배너는 칸 비율과 크게 다르면 잘리는 쪽을 안내하지만 막지는 않는다. */
function ImageField({ slot, label, hint, url, onChange, onBusyChange }: {
  readonly slot: EventImageSlot;
  readonly label: string;
  readonly hint: string;
  readonly url: string | null;
  readonly onChange: (url: string | null) => void;
  readonly onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const titleId = `event-image-${slot}`;

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setWarning(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("JPG·PNG·WebP 이미지만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    try {
      if (slot !== "cover") {
        const size = await imageSize(file);
        setWarning(size ? bannerRatioWarning(slot, size.width, size.height) : null);
      }
      onChange(await uploadEventImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이미지를 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  };

  const aspect = slot === "bannerDesktop" ? "aspect-[3.2/1] object-cover" : slot === "bannerMobile" ? "aspect-[4/3] object-cover" : "max-h-60 object-contain";
  return (
    <div role="group" aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1.5">
      <span id={titleId} className="text-sm font-semibold">{label}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 저장소·미리 보기 주소를 그대로 보여 준다.
        <img src={url} alt="" className={`w-full rounded-control border border-border-soft bg-surface ${aspect}`} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={uploading} onChange={(event) => void choose(event)} aria-label={`${label} 파일 고르기`} />
        <AdminActionButton disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? "올리는 중…" : url ? "이미지 바꾸기" : "이미지 올리기"}
        </AdminActionButton>
        {url ? <AdminActionButton tone="quiet" disabled={uploading} onClick={() => { onChange(null); setWarning(null); }}>지우기</AdminActionButton> : null}
      </div>
      <p className="text-xs text-muted">{hint} JPG·PNG·WebP, 5MB까지 원본 그대로 올려요.</p>
      {warning ? <p className="text-xs font-semibold text-warn">{warning}</p> : null}
      {error ? <p role="alert" className="text-xs font-semibold text-fail">{error}</p> : null}
    </div>
  );
}

async function imageSize(file: File): Promise<{ readonly width: number; readonly height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}
