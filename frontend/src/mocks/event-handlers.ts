import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminEvent, AdminEventStatus, AdminEventWrite } from "@/features/admin/types";
import type { EventBanner, EventPhase, PublicEvent, PublicEventSummary } from "@/features/events/types";
import { mockSessionRole } from "./auth-handlers";

/**
 * 이벤트 화면과 운영자 이벤트 관리 확인용 메모리 목. 운영자가 공개한 글만 이벤트 화면에 보이고, 배너를 켠 글은 노출 종료일까지
 * 메인 배너에도 보인다. 새로고침하면 초기화된다.
 */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const realLoginEnabled = frontendEnvironment.producerLoginEnabled;
const MOCK_STORAGE = "/mock-storage/event-images";
const mockImages = new Map<string, Blob>();
const now = new Date().toISOString();

const events: Mutable<AdminEvent>[] = [
  {
    id: 1,
    title: "예술in 1기 서포터즈 모집",
    summary: "1기 서포터즈 모집을 마쳤어요. 함께해 주신 분들께 감사드려요.",
    body: "예술in과 함께 공연예술 오디션 소식을 알릴 1기 서포터즈를 모집했어요.\n\n· 신청 마감: 10월 16일\n· 활동 혜택: 활동을 마치면 3만 원 상당 기프티콘\n\n다음 기수 모집도 이곳에서 알려 드릴게요.",
    startsOn: null,
    endsOn: "2026-10-16",
    applyUrl: "https://forms.gle/5g4qGphqcugfMYFc6",
    applyLabel: "서포터즈 신청하기",
    coverImageUrl: null,
    banner: { enabled: false, desktopImageUrl: null, mobileImageUrl: null, alt: null, endsOn: null, order: 0 },
    bannerVisible: false,
    status: "PUBLISHED",
    phase: "ENDED",
    createdAt: now,
    updatedAt: now,
  },
];

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

function rejectNonAdmin() {
  const role = mockSessionRole();
  if (!role) return apiError(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
  if (role !== "ADMIN") return apiError(403, "AUTH_FORBIDDEN", "접근 권한이 없습니다.");
  return null;
}

/** 서버처럼 한국 날짜로 단계와 배너 노출을 다시 계산한다. */
function koreaToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function phaseOf(event: AdminEvent, today: string): EventPhase {
  if (event.startsOn && today < event.startsOn) return "UPCOMING";
  if (event.endsOn && today > event.endsOn) return "ENDED";
  return "ONGOING";
}

function refreshed(event: Mutable<AdminEvent>): AdminEvent {
  const today = koreaToday();
  event.phase = phaseOf(event, today);
  event.bannerVisible = event.status === "PUBLISHED" && event.banner.enabled
    && (!event.banner.endsOn || today <= event.banner.endsOn);
  return { ...event };
}

function toSummary(event: AdminEvent): PublicEventSummary {
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    startsOn: event.startsOn,
    endsOn: event.endsOn,
    phase: event.phase,
    coverImageUrl: event.coverImageUrl,
  };
}

function toPublic(event: AdminEvent): PublicEvent {
  return { ...toSummary(event), body: event.body, applyUrl: event.applyUrl, applyLabel: event.applyLabel };
}

function toBanner(event: AdminEvent): EventBanner {
  return {
    eventId: event.id,
    title: event.title,
    alt: event.banner.alt ?? "",
    desktopImageUrl: event.banner.desktopImageUrl ?? "",
    mobileImageUrl: event.banner.mobileImageUrl ?? "",
  };
}

function invalidWrite(write: AdminEventWrite): string | null {
  if (!write.title?.trim() || !write.body?.trim()) return "제목과 본문은 필수입니다.";
  if (write.startsOn && write.endsOn && write.endsOn < write.startsOn) return "종료일은 시작일보다 앞설 수 없습니다.";
  if (write.applyUrl && !/^https?:\/\//i.test(write.applyUrl)) return "신청 링크는 http:// 또는 https://로 시작하는 주소여야 합니다.";
  const banner = write.banner;
  if (banner?.enabled && (!banner.desktopImageUrl || !banner.mobileImageUrl || !banner.alt?.trim())) {
    return "배너를 노출하려면 PC·모바일 배너 이미지와 대체 문구가 모두 필요합니다.";
  }
  return null;
}

function apply(target: Mutable<AdminEvent>, write: AdminEventWrite) {
  target.title = write.title.trim();
  target.summary = write.summary?.trim() || null;
  target.body = write.body.trim();
  target.startsOn = write.startsOn || null;
  target.endsOn = write.endsOn || null;
  target.applyUrl = write.applyUrl?.trim() || null;
  target.applyLabel = target.applyUrl ? write.applyLabel?.trim() || null : null;
  target.coverImageUrl = write.coverImageUrl || null;
  target.banner = {
    enabled: Boolean(write.banner?.enabled),
    desktopImageUrl: write.banner?.desktopImageUrl || null,
    mobileImageUrl: write.banner?.mobileImageUrl || null,
    alt: write.banner?.alt?.trim() || null,
    endsOn: write.banner?.endsOn || null,
    order: write.banner?.order ?? 0,
  };
  target.updatedAt = new Date().toISOString();
}

const published = () => events.filter((event) => event.status === "PUBLISHED").map(refreshed);

export const eventHandlers = [
  http.get("/api/v1/public/events", async () => {
    await delay(120);
    return HttpResponse.json({ events: published().sort((left, right) => right.id - left.id).map(toSummary) });
  }),

  // `:eventId`보다 먼저 둬야 `banners`를 이벤트 번호로 읽지 않는다.
  http.get("/api/v1/public/events/banners", async () => {
    await delay(80);
    const banners = published()
      .filter((event) => event.bannerVisible)
      .sort((left, right) => left.banner.order - right.banner.order || right.id - left.id)
      .slice(0, 5)
      .map(toBanner);
    return HttpResponse.json({ banners });
  }),

  http.get("/api/v1/public/events/:eventId", async ({ params }) => {
    await delay(120);
    const event = published().find((candidate) => candidate.id === Number(params.eventId));
    return event ? HttpResponse.json(toPublic(event)) : apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
  }),

  http.post("/api/v1/admin/event-images/uploads", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const upload = await request.json() as { readonly contentType: string; readonly size: number };
    if (!["image/jpeg", "image/png", "image/webp"].includes(upload.contentType)) {
      return apiError(400, "EVENT_INVALID_INPUT", "이미지는 JPG·PNG·WebP만 올릴 수 있습니다.");
    }
    if (upload.size <= 0 || upload.size > 5 * 1024 * 1024) return apiError(400, "EVENT_INVALID_INPUT", "이미지는 5MB까지 올릴 수 있습니다.");
    const key = crypto.randomUUID();
    return HttpResponse.json({
      url: `${MOCK_STORAGE}/${key}`,
      method: "PUT",
      headers: { "Content-Type": upload.contentType },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      imageUrl: `${MOCK_STORAGE}/${key}`,
    }, { status: 201 });
  }),

  http.put(`${MOCK_STORAGE}/:key`, async ({ params, request }) => {
    mockImages.set(String(params.key), await request.blob());
    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${MOCK_STORAGE}/:key`, ({ params }) => {
    const image = mockImages.get(String(params.key));
    return image
      ? new HttpResponse(image, { headers: { "Content-Type": image.type } })
      : new HttpResponse(null, { status: 404 });
  }),

  http.get("/api/v1/admin/events", async () => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    return HttpResponse.json({ events: [...events].sort((left, right) => right.id - left.id).map(refreshed) });
  }),

  http.post("/api/v1/admin/events", async ({ request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(150);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const write = await request.json() as AdminEventWrite;
    const invalid = invalidWrite(write);
    if (invalid) return apiError(400, "EVENT_INVALID_INPUT", invalid);
    const timestamp = new Date().toISOString();
    const created: Mutable<AdminEvent> = {
      ...events[0],
      id: Math.max(0, ...events.map((event) => event.id)) + 1,
      status: "PENDING",
      createdAt: timestamp,
    };
    apply(created, write);
    events.push(created);
    return HttpResponse.json(refreshed(created), { status: 201 });
  }),

  http.get("/api/v1/admin/events/:eventId", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const event = events.find((candidate) => candidate.id === Number(params.eventId));
    return event ? HttpResponse.json(refreshed(event)) : apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
  }),

  http.put("/api/v1/admin/events/:eventId", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(150);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const event = events.find((candidate) => candidate.id === Number(params.eventId));
    if (!event) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    const write = await request.json() as AdminEventWrite;
    const invalid = invalidWrite(write);
    if (invalid) return apiError(400, "EVENT_INVALID_INPUT", invalid);
    apply(event, write);
    return HttpResponse.json(refreshed(event));
  }),

  http.delete("/api/v1/admin/events/:eventId", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const index = events.findIndex((candidate) => candidate.id === Number(params.eventId));
    if (index < 0) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    events.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch("/api/v1/admin/events/:eventId/status", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const event = events.find((candidate) => candidate.id === Number(params.eventId));
    if (!event) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    const { status } = await request.json() as { readonly status: AdminEventStatus };
    if (status === "PENDING" && event.status !== "PENDING") {
      return apiError(400, "EVENT_INVALID_INPUT", "공개 여부를 정한 이벤트는 검토 전으로 돌릴 수 없습니다.");
    }
    event.status = status;
    event.updatedAt = new Date().toISOString();
    return HttpResponse.json(refreshed(event));
  }),
];
