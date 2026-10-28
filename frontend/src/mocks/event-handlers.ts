import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminEvent, AdminEventRegistration, AdminEventStatus, AdminEventWrite } from "@/features/admin/types";
import { MAX_EVENT_DETAIL_IMAGES, registrationClosedMessage } from "@/features/events/types";
import type { EventBanner, EventPhase, EventRegistrationStatus, EventRegistrationWrite, PublicEvent, PublicEventSummary } from "@/features/events/types";
import { mockSessionRole } from "./auth-handlers";
import { registrationSnsProblem } from "@/features/events/registration-draft";

/**
 * 이벤트 화면과 운영자 이벤트 관리 확인용 메모리 목. 운영자가 공개한 글만 이벤트 화면에 보이고, 배너를 켠 글은 노출 종료일까지
 * 메인 배너에도 보인다. 참가 신청서를 켠 글은 로그인 없이 신청을 받고 운영자가 신청자를 본다. 새로고침하면 초기화된다.
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
    detailBody: null,
    detailImageUrls: [],
    startsOn: null,
    endsOn: "2026-10-16",
    applyUrl: "https://forms.gle/5g4qGphqcugfMYFc6",
    applyLabel: "서포터즈 신청하기",
    registrationEnabled: false,
    registrationCapacity: null,
    registrationCount: 0,
    registrationClosed: false,
    registrationStatus: "DISABLED",
    registrationNotice: null,
    registrationConfirmationEnabled: false,
    registrationConfirmationMessage: null,
    businessCardClosesAt: null,
    coverImageUrl: null,
    banner: { enabled: false, desktopImageUrl: null, mobileImageUrl: null, alt: null, endsOn: null, order: 0 },
    bannerVisible: false,
    status: "PUBLISHED",
    phase: "ENDED",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    title: "월요살롱 vol.1 배우·제작자 교류의 밤",
    summary: "공연 없는 월요일, 샤로수길 남극장에서 배우와 공연 제작자가 만나요.",
    body: "극장이 쉬는 월요일 저녁, 배우와 공연을 만드는 사람들이 한자리에 모여요.\n\n· 일시: 11월 9일(월) 17:00~19:00\n· 장소: 남극장 (서울 관악로14나길 13, 4층)\n· 참가비 무료, 저녁 식사(피자) 제공",
    detailBody: null,
    detailImageUrls: [],
    startsOn: null,
    endsOn: "2026-11-09",
    applyUrl: null,
    applyLabel: "참가 신청하기",
    registrationEnabled: true,
    registrationCapacity: null,
    registrationCount: 0,
    registrationClosed: false,
    registrationStatus: "OPEN",
    registrationNotice: "노쇼 방지를 위해 보증금 5,000원을 받습니다. 11월 9일 현장에 오시면 그대로 돌려드립니다.\n입금 계좌: (추후 안내)",
    registrationConfirmationEnabled: true,
    registrationConfirmationMessage: "참가 신청 후 신청서 위의 보증금 안내를 확인해 주세요.\n행사 소식은 남겨 주신 휴대폰 번호로 안내합니다.",
    businessCardClosesAt: "2026-11-02T00:00:00.000Z",
    coverImageUrl: null,
    banner: { enabled: false, desktopImageUrl: null, mobileImageUrl: null, alt: null, endsOn: null, order: 0 },
    bannerVisible: false,
    status: "PUBLISHED",
    phase: "ONGOING",
    createdAt: now,
    updatedAt: now,
  },
];

const registrations: AdminEventRegistration[] = [];
const registrationEventIds = new Map<number, number>();
const pendingPhotoKeys = new Set<string>();

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

const MAX_BANNERS = 5;

/** 서버처럼 공개 중·배너 켬·노출 종료일 전인 후보를 순서대로 줄 세워 앞의 5개만 메인에 보인다. */
function shownBanners(today: string): readonly AdminEvent[] {
  return events
    .filter((event) => event.status === "PUBLISHED" && event.banner.enabled && (!event.banner.endsOn || today <= event.banner.endsOn))
    .sort((left, right) => left.banner.order - right.banner.order || right.id - left.id)
    .slice(0, MAX_BANNERS);
}

function refreshed(event: Mutable<AdminEvent>): AdminEvent {
  const today = koreaToday();
  event.phase = phaseOf(event, today);
  event.registrationCount = countOf(event.id);
  event.registrationStatus = registrationStatusOf(event);
  event.bannerVisible = shownBanners(today).some((shown) => shown.id === event.id);
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
    registrationStatus: registrationStatusOf(event),
  };
}

function countOf(eventId: number): number {
  return registrations.filter((registration) => registrationEventIds.get(registration.id) === eventId).length;
}

function registrationStatusOf(event: AdminEvent): EventRegistrationStatus {
  if (event.status !== "PUBLISHED" || !event.registrationEnabled) return "DISABLED";
  if (event.phase === "ENDED") return "ENDED";
  if (event.registrationClosed) return "CLOSED";
  if (event.registrationCapacity !== null && countOf(event.id) >= event.registrationCapacity) return "FULL";
  return "OPEN";
}

function acceptsRegistrations(event: AdminEvent): boolean {
  return registrationStatusOf(event) === "OPEN";
}

function toPublic(event: AdminEvent): PublicEvent {
  return {
    ...toSummary(event),
    body: event.body,
    detailBody: event.detailBody,
    detailImageUrls: event.detailImageUrls,
    applyUrl: event.applyUrl,
    applyLabel: event.applyLabel,
    registrationEnabled: event.registrationEnabled,
    registrationOpen: acceptsRegistrations(event),
    registrationCapacity: event.registrationCapacity,
    registrationCount: countOf(event.id),
    registrationClosed: event.registrationClosed,
    registrationNotice: event.registrationNotice,
    registrationConfirmationEnabled: event.registrationConfirmationEnabled,
    registrationConfirmationMessage: event.registrationConfirmationMessage,
    businessCardClosesAt: event.businessCardClosesAt,
    businessCardOpen: acceptsBusinessCards(event),
  };
}

function acceptsBusinessCards(event: AdminEvent): boolean {
  return acceptsRegistrations(event) && (!event.businessCardClosesAt || Date.now() < Date.parse(event.businessCardClosesAt));
}

/** 서버처럼 구분에 맞는 칸만 확인한다. 문제가 없으면 null이다. */
function invalidRegistration(write: EventRegistrationWrite): string | null {
  if (!["ACTOR", "PRODUCER", "GENERAL"].includes(write.participantType)) return "참가 구분을 선택해 주세요.";
  if (!write.name?.trim() || !/^01[016789]-\d{3,4}-\d{4}$/.test(write.phone ?? "")) return "이름과 휴대폰 번호를 확인해 주세요.";
  if (write.participantType === "ACTOR" && write.businessCardRequested) {
    const snsProblem = registrationSnsProblem(write.snsPlatform ?? null, write.snsHandle ?? null);
    if (snsProblem) return snsProblem;
    if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(write.email ?? "")) return "이메일 주소를 확인해 주세요.";
    if (!write.birthDate || !write.photoUploadKey || !pendingPhotoKeys.has(write.photoUploadKey)) return "생년월일과 프로필 사진을 확인해 주세요.";
    if (!write.activityFields?.length) return "활동 분야를 하나 이상 골라 주세요.";
    if (write.activityFields.includes("OTHER") && !write.otherActivity?.trim()) return "기타 분야를 입력해 주세요.";
    if (write.noCareer ? write.careers?.length : !write.careers?.length) return "경력을 한 줄 이상 적거나 경력 없음을 골라 주세요.";
  }
  if (write.participantType === "PRODUCER" && !write.affiliation?.trim()) return "소속과 하는 일을 입력해 주세요.";
  if (!write.privacyAgreed) return "개인정보 수집·이용에 동의해 주세요.";
  return null;
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
  if ((write.detailBody?.length ?? 0) > 5000) return "상세 설명은 5000자 이내여야 합니다.";
  const detailUrls = write.detailImageUrls ?? [];
  if (detailUrls.length > MAX_EVENT_DETAIL_IMAGES || detailUrls.some((url) => !url?.trim()) || new Set(detailUrls).size !== detailUrls.length) return "상세 이미지 개수와 중복을 확인해 주세요.";
  if (write.startsOn && write.endsOn && write.endsOn < write.startsOn) return "종료일은 시작일보다 앞설 수 없습니다.";
  if (write.applyUrl && !/^https?:\/\//i.test(write.applyUrl)) return "신청 링크는 http:// 또는 https://로 시작하는 주소여야 합니다.";
  if (write.registrationCapacity != null && (!Number.isInteger(write.registrationCapacity) || write.registrationCapacity < 1 || write.registrationCapacity > 2147483647)) return "모집 정원은 1명 이상의 정수여야 합니다.";
  if (write.registrationEnabled && write.registrationConfirmationEnabled) {
    if (!write.registrationConfirmationMessage?.trim()) return "신청 전 팝업 안내 내용을 입력해 주세요.";
    if (write.registrationConfirmationMessage.length > 2000) return "신청 전 팝업 안내는 2000자 이내여야 합니다.";
  }
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
  target.detailBody = write.detailBody?.trim() || null;
  target.detailImageUrls = [...(write.detailImageUrls ?? [])];
  target.startsOn = write.startsOn || null;
  target.endsOn = write.endsOn || null;
  target.applyUrl = write.applyUrl?.trim() || null;
  target.registrationEnabled = Boolean(write.registrationEnabled);
  target.registrationCapacity = write.registrationCapacity ?? null;
  target.registrationNotice = target.registrationEnabled ? write.registrationNotice?.trim() || null : null;
  target.registrationConfirmationEnabled = target.registrationEnabled && Boolean(write.registrationConfirmationEnabled);
  target.registrationConfirmationMessage = target.registrationConfirmationEnabled ? write.registrationConfirmationMessage?.trim().replace(/\r\n?/g, "\n") || null : null;
  target.businessCardClosesAt = target.registrationEnabled ? write.businessCardClosesAt || null : null;
  target.applyLabel = target.applyUrl || target.registrationEnabled ? write.applyLabel?.trim() || null : null;
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
    return HttpResponse.json({ banners: shownBanners(koreaToday()).map(toBanner) });
  }),

  http.get("/api/v1/public/events/:eventId", async ({ params }) => {
    await delay(120);
    const event = published().find((candidate) => candidate.id === Number(params.eventId));
    return event ? HttpResponse.json(toPublic(event)) : apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
  }),

  http.post("/api/v1/public/events/:eventId/registrations/photo-uploads", async ({ params, request }) => {
    await delay(120);
    const event = published().find((candidate) => candidate.id === Number(params.eventId));
    if (!event) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    if (!acceptsRegistrations(event)) return apiError(409, "EVENT_REGISTRATION_CLOSED", registrationClosedMessage(registrationStatusOf(event)));
    if (!acceptsBusinessCards(event)) return apiError(409, "EVENT_BUSINESS_CARD_CLOSED", "프로필 명함 제작 신청 기간이 끝났습니다. 명함 희망을 끄고 신청해 주십시오.");
    const upload = await request.json() as { readonly contentType: string; readonly size: number };
    if (!["image/jpeg", "image/png", "image/webp"].includes(upload.contentType)) {
      return apiError(400, "EVENT_INVALID_INPUT", "사진은 JPG·PNG·WebP만 올릴 수 있습니다.");
    }
    if (upload.size <= 0 || upload.size > 5 * 1024 * 1024) return apiError(400, "EVENT_INVALID_INPUT", "사진은 5MB까지 올릴 수 있습니다.");
    const key = crypto.randomUUID();
    pendingPhotoKeys.add(key);
    return HttpResponse.json({
      url: `${MOCK_STORAGE}/${key}`,
      method: "PUT",
      headers: { "Content-Type": upload.contentType },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      uploadKey: key,
    }, { status: 201 });
  }),

  http.post("/api/v1/public/events/:eventId/registrations", async ({ params, request }) => {
    await delay(150);
    const event = published().find((candidate) => candidate.id === Number(params.eventId));
    if (!event) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    if (!acceptsRegistrations(event)) return apiError(409, "EVENT_REGISTRATION_CLOSED", registrationClosedMessage(registrationStatusOf(event)));
    const write = await request.json() as EventRegistrationWrite;
    if (!acceptsRegistrations(event)) return apiError(409, "EVENT_REGISTRATION_CLOSED", registrationClosedMessage(registrationStatusOf(event)));
    const invalid = invalidRegistration(write);
    if (invalid) return apiError(400, "EVENT_INVALID_INPUT", invalid);
    if (registrations.some((item) => registrationEventIds.get(item.id) === event.id && item.phone === write.phone)) {
      return apiError(409, "EVENT_REGISTRATION_DUPLICATE", "이미 이 휴대폰 번호로 신청했습니다.");
    }
    const actor = write.participantType === "ACTOR";
    const card = actor && write.businessCardRequested;
    if (card && !acceptsBusinessCards(event)) {
      return apiError(409, "EVENT_BUSINESS_CARD_CLOSED", "프로필 명함 제작 신청 기간이 끝났습니다. 명함 희망을 끄고 신청해 주십시오.");
    }
    if (card && write.photoUploadKey) pendingPhotoKeys.delete(write.photoUploadKey);
    const id = Math.max(0, ...registrations.map((item) => item.id)) + 1;
    registrations.push({
      id,
      participantType: write.participantType,
      name: write.name.trim(),
      phone: write.phone,
      businessCardRequested: card,
      email: card ? write.email?.trim() || null : null,
      snsHandle: card ? write.snsHandle?.trim() || null : null,
      snsPlatform: card && write.snsHandle?.trim() ? write.snsPlatform ?? null : null,
      birthDate: card ? write.birthDate : null,
      affiliation: write.participantType === "PRODUCER" ? write.affiliation?.trim() || null : null,
      photoUrl: card ? `${MOCK_STORAGE}/${write.photoUploadKey}` : null,
      activityFields: card ? write.activityFields : [],
      otherActivity: card && write.activityFields.includes("OTHER") ? write.otherActivity : null,
      noCareer: card && write.noCareer,
      careers: card && !write.noCareer ? write.careers : [],
      intro: card ? write.intro?.trim() || null : null,
      createdAt: new Date().toISOString(),
      paymentStatus: "PENDING",
      paymentConfirmedAt: null,
    });
    registrationEventIds.set(id, event.id);
    return HttpResponse.json({ id }, { status: 201 });
  }),

  http.patch("/api/v1/admin/events/:eventId/registration-status", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    const rejected = rejectNonAdmin(); if (rejected) return rejected;
    const event = events.find((item) => item.id === Number(params.eventId));
    if (!event) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    const write = await request.json() as { closed: boolean };
    if (typeof write.closed !== "boolean" || !event.registrationEnabled) return apiError(400, "EVENT_INVALID_INPUT", "모집 상태를 확인해 주세요.");
    event.registrationClosed = write.closed;
    event.updatedAt = new Date().toISOString();
    return HttpResponse.json(refreshed(event));
  }),

  http.patch("/api/v1/admin/events/:eventId/registrations/:registrationId/payment-status", async ({ params, request }) => {
    if (realLoginEnabled) return passthrough();
    const rejected = rejectNonAdmin(); if (rejected) return rejected;
    if (!events.some((item) => item.id === Number(params.eventId))) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    const index = registrations.findIndex((item) => item.id === Number(params.registrationId) && registrationEventIds.get(item.id) === Number(params.eventId));
    if (index < 0) return apiError(404, "EVENT_REGISTRATION_NOT_FOUND", "참가 신청을 찾을 수 없습니다.");
    const write = await request.json() as { paymentStatus: "PENDING" | "CONFIRMED" };
    if (!["PENDING", "CONFIRMED"].includes(write.paymentStatus)) return apiError(400, "EVENT_INVALID_INPUT", "입금 상태를 선택해 주세요.");
    const current = registrations[index];
    if (current.paymentStatus !== write.paymentStatus) registrations[index] = { ...current, paymentStatus: write.paymentStatus, paymentConfirmedAt: write.paymentStatus === "CONFIRMED" ? new Date().toISOString() : null };
    return HttpResponse.json(registrations[index]);
  }),

  http.get("/api/v1/admin/events/:eventId/registrations", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const eventId = Number(params.eventId);
    if (!events.some((event) => event.id === eventId)) return apiError(404, "EVENT_NOT_FOUND", "이벤트를 찾을 수 없습니다.");
    return HttpResponse.json({ registrations: registrations.filter((item) => registrationEventIds.get(item.id) === eventId) });
  }),

  // 목에서는 zip 대신 명함 희망자 JSON만 내려 준다. 실제 서버는 CSV·JSON·사진을 묶은 zip을 준다.
  http.get("/api/v1/admin/events/:eventId/registrations/business-card-archive", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const eventId = Number(params.eventId);
    const cards = registrations.filter((item) => registrationEventIds.get(item.id) === eventId && item.businessCardRequested);
    return new HttpResponse(JSON.stringify(cards, null, 2), { headers: { "Content-Type": "application/zip" } });
  }),

  http.delete("/api/v1/admin/events/:eventId/registrations/:registrationId", async ({ params }) => {
    if (realLoginEnabled) return passthrough();
    await delay(120);
    const rejected = rejectNonAdmin();
    if (rejected) return rejected;
    const index = registrations.findIndex((item) => item.id === Number(params.registrationId)
      && registrationEventIds.get(item.id) === Number(params.eventId));
    if (index < 0) return apiError(404, "EVENT_REGISTRATION_NOT_FOUND", "참가 신청을 찾을 수 없습니다.");
    registrations.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
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
