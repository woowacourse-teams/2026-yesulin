import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminShow, AdminShowSession } from "@/features/admin/types";
import {
  MAX_DIRECTIONS_NOTE_LENGTH,
  MAX_SHOW_IMAGES,
  MAX_SHOW_LINKS,
  SHOW_GENRES,
  MAX_TICKETS_PER_RESERVATION,
  type ProducerReservation,
  type ProducerShow,
  type ProducerShowImage,
  type ProducerShowSummary,
  type CreateReservation,
  type PublicShow,
  type PublicShowSummary,
  type ReservationStatus,
  type SaveShow,
  type SaveShowSession,
  type ShowGenre,
  type ShowLink,
  type ShowStatus,
  type ShowVenue,
} from "@/features/shows/types";
import { showLinkError } from "@/features/shows/show-form";

/**
 * 백엔드 domain/show, domain/reservation 규칙을 따라가는 메모리 목. 새로고침하면 seed로 돌아간다.
 * 기획사 API는 목 기획사 한 명의 공연만 있다고 보고 소유자를 따로 검사하지 않는다.
 * 실제 기획사 API 플래그가 켜지면 OTR 목처럼 실제 백엔드로 넘긴다.
 */
const realProducerApiEnabled = frontendEnvironment.producerApiEnabled;

type MockShow = {
  id: string;
  title: string;
  genre: ShowGenre;
  description: string;
  venue: ShowVenue;
  directionsNote: string;
  runningMinutes: number;
  ageRating: string;
  inquiryPhone: string;
  links: ShowLink[];
  remainingSeatsVisible: boolean;
  poster: ProducerShowImage;
  images: ProducerShowImage[];
  status: ShowStatus;
  createdAt: string;
};

type MockSession = { id: number; showId: string; startsAt: string; capacity: number };

type MockReservation = {
  id: number;
  code: string;
  sessionId: number;
  bookerName: string;
  bookerPhone: string;
  ticketCount: number;
  status: ReservationStatus;
  createdAt: string;
  canceledAt: string | null;
};

const PHONE_PATTERN = /^\d{3}-\d{4}-\d{4}$/;
const INQUIRY_PHONE_PATTERN = /^\d{2,4}-\d{3,4}(-\d{4})?$/;
const CODE_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const KST_OFFSET_HOURS = 9;

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });
const showNotFound = () => apiError(404, "SHOW_NOT_FOUND", "공연을 찾을 수 없습니다.");
const sessionNotFound = () => apiError(404, "SHOW_SESSION_NOT_FOUND", "공연 회차를 찾을 수 없습니다.");
const invalidShow = (message: string) => apiError(400, "SHOW_INVALID_INPUT", message);
const invalidReservation = (message: string) => apiError(400, "RESERVATION_INVALID_INPUT", message);

/** 오늘 기준 n일 뒤 한국 시각 hh:mm을 UTC ISO 문자열로 만든다. */
function kstAt(daysFromToday: number, hour: number, minute = 0) {
  const nowInKst = new Date(Date.now() + KST_OFFSET_HOURS * 3_600_000);
  return new Date(Date.UTC(
    nowInKst.getUTCFullYear(),
    nowInKst.getUTCMonth(),
    nowInKst.getUTCDate() + daysFromToday,
    hour - KST_OFFSET_HOURS,
    minute,
  )).toISOString();
}

const venue = (name: string, roadAddress: string): ShowVenue => ({
  name, roadAddress, detailAddress: "", zonecode: "", latitude: null, longitude: null,
});
const image = (fileId: number, url: string): ProducerShowImage => ({ fileId, url });

const shows: MockShow[] = [
  {
    id: "seed_show_moonlight",
    title: "달빛 아래 소극장",
    genre: "MUSICAL",
    description: "예술in이 준비한 무료 창작 뮤지컬입니다.\n공연 시작 10분 전까지 입장해 주세요.",
    venue: venue("대학로 예술인 소극장", "서울특별시 종로구 대학로 12"),
    directionsNote: "주차 공간이 협소하여 가급적 대중교통 이용을 부탁드립니다.\n혜화역 2번 출구에서 도보 약 5분 거리입니다.\n건물 정문이 아닌 오른쪽 골목에 위치한 공연장 전용 입구를 이용해 주세요.",
    runningMinutes: 100,
    ageRating: "8세 이상",
    inquiryPhone: "02-123-4567",
    links: [
      { label: "공연사 인스타그램 보기", url: "https://www.instagram.com/" },
      { label: "공연사 홈페이지", url: "https://yesulin.art/" },
    ],
    remainingSeatsVisible: true,
    poster: image(9001, "/images/performances/moonlight.jpg"),
    images: [image(9002, "/images/performances/nightfall.jpg"), image(9003, "/images/performances/summerplay.jpg")],
    status: "OPEN",
    createdAt: kstAt(-7, 10),
  },
  {
    id: "seed_show_summer",
    title: "여름밤의 연극",
    genre: "PLAY",
    description: "단 하루, 한 회차만 열리는 낭독 연극입니다.",
    venue: venue("성수 블랙박스 극장", "서울특별시 성동구 성수이로 20"),
    directionsNote: "",
    runningMinutes: 70,
    ageRating: "전체관람가",
    inquiryPhone: "010-2345-6789",
    links: [],
    remainingSeatsVisible: true,
    poster: image(9004, "/images/performances/summerplay.jpg"),
    images: [],
    status: "OPEN",
    createdAt: kstAt(-5, 10),
  },
  {
    id: "seed_show_nightfall",
    title: "해 질 녘 낭독회",
    genre: "PLAY",
    description: "예매가 끝난 공연입니다.",
    venue: venue("예술in 라운지", "서울특별시 마포구 와우산로 30"),
    directionsNote: "",
    runningMinutes: 60,
    ageRating: "",
    inquiryPhone: "02-123-4567",
    links: [],
    remainingSeatsVisible: true,
    poster: image(9005, "/images/performances/nightfall.jpg"),
    images: [],
    status: "CLOSED",
    createdAt: kstAt(-20, 10),
  },
  {
    id: "seed_show_hidden_seats",
    title: "골목길 낭독극",
    genre: "PLAY",
    description: "잔여석을 공개하지 않는 공연입니다. 회차에는 예매 가능·매진만 표시됩니다.",
    venue: venue("혜화 골목 스튜디오", "서울특별시 종로구 동숭길 25"),
    directionsNote: "건물 정문이 아닌 오른쪽 골목의 공연장 전용 입구를 이용해 주세요.",
    runningMinutes: 80,
    ageRating: "12세 이상",
    inquiryPhone: "02-765-4321",
    links: [{ label: "극단 인스타그램", url: "https://www.instagram.com/" }],
    remainingSeatsVisible: false,
    poster: image(9007, "/images/performances/nightfall.jpg"),
    images: [],
    status: "OPEN",
    createdAt: kstAt(-3, 10),
  },
  {
    id: "seed_show_draft",
    title: "준비 중인 가을 공연",
    genre: "MUSICAL",
    description: "",
    venue: venue("대학로 예술인 소극장", "서울특별시 종로구 대학로 12"),
    directionsNote: "",
    runningMinutes: 90,
    ageRating: "",
    inquiryPhone: "02-123-4567",
    links: [],
    remainingSeatsVisible: true,
    poster: image(9006, "/images/performances/moonlight.jpg"),
    images: [],
    status: "DRAFT",
    createdAt: kstAt(-1, 10),
  },
];

const sessions: MockSession[] = [
  { id: 101, showId: "seed_show_moonlight", startsAt: kstAt(-1, 19, 30), capacity: 60 },
  { id: 102, showId: "seed_show_moonlight", startsAt: kstAt(3, 19, 30), capacity: 60 },
  { id: 103, showId: "seed_show_moonlight", startsAt: kstAt(4, 15), capacity: 60 },
  { id: 201, showId: "seed_show_summer", startsAt: kstAt(10, 20), capacity: 30 },
  { id: 301, showId: "seed_show_nightfall", startsAt: kstAt(-3, 19), capacity: 40 },
  { id: 401, showId: "seed_show_hidden_seats", startsAt: kstAt(5, 19), capacity: 50 },
  { id: 402, showId: "seed_show_hidden_seats", startsAt: kstAt(6, 15), capacity: 20 },
  { id: 403, showId: "seed_show_hidden_seats", startsAt: kstAt(6, 19), capacity: 10 },
];

const reservations: MockReservation[] = [];
let nextSessionId = 1000;
let nextReservationId = 1;
let nextFileId = 10_000;
const uploadedImageUrls = new Map<number, string>();

/** seed 회차에 확정 예매를 채워 넣는다. 한 건은 최대 10매다. */
function seedReservations(sessionId: number, tickets: number) {
  let remaining = tickets;
  while (remaining > 0) {
    const count = Math.min(remaining, MAX_TICKETS_PER_RESERVATION);
    const id = nextReservationId;
    nextReservationId += 1;
    reservations.push({
      id,
      code: generateCode(),
      sessionId,
      bookerName: `관객 ${id}`,
      bookerPhone: `010-0000-${String(id).padStart(4, "0")}`,
      ticketCount: count,
      status: "CONFIRMED",
      createdAt: kstAt(-2, 12),
      canceledAt: null,
    });
    remaining -= count;
  }
}

seedReservations(101, 52);
seedReservations(102, 45);
seedReservations(103, 58);
seedReservations(201, 30);
seedReservations(301, 40);
seedReservations(401, 12);
seedReservations(402, 17);
seedReservations(403, 10);

function generateCode(): string {
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)];
  }
  return reservations.some((reservation) => reservation.code === code) ? generateCode() : code;
}

const findShow = (showId: string) => shows.find((show) => show.id === showId);
const showSessions = (showId: string) => sessions
  .filter((session) => session.showId === showId)
  .sort((left, right) => left.startsAt.localeCompare(right.startsAt) || left.id - right.id);
const reservedTickets = (sessionId: number) => reservations
  .filter((reservation) => reservation.sessionId === sessionId && reservation.status === "CONFIRMED")
  .reduce((sum, reservation) => sum + reservation.ticketCount, 0);
const hasAnyReservation = (sessionId: number) =>
  reservations.some((reservation) => reservation.sessionId === sessionId);
const isBookable = (session: MockSession) => Date.now() < Date.parse(session.startsAt);
const nextSessionStartsAt = (showId: string) =>
  showSessions(showId).find(isBookable)?.startsAt ?? null;

function toPublicSummary(show: MockShow): PublicShowSummary {
  return {
    id: show.id,
    title: show.title,
    genre: show.genre,
    posterUrl: show.poster.url,
    venueName: show.venue.name,
    nextSessionStartsAt: nextSessionStartsAt(show.id),
    runningMinutes: show.runningMinutes,
  };
}

function toPublicShow(show: MockShow): PublicShow {
  return {
    id: show.id,
    title: show.title,
    genre: show.genre,
    description: show.description,
    posterUrl: show.poster.url,
    imageUrls: show.images.map((item) => item.url),
    venue: show.venue,
    directionsNote: show.directionsNote,
    runningMinutes: show.runningMinutes,
    ageRating: show.ageRating,
    inquiryPhone: show.inquiryPhone,
    links: show.links,
    status: show.status === "CLOSED" ? "CLOSED" : "OPEN",
    maxTicketsPerReservation: MAX_TICKETS_PER_RESERVATION,
    sessions: showSessions(show.id).map((session) => {
      const remainingSeats = Math.max(0, session.capacity - reservedTickets(session.id));
      return {
        id: session.id,
        startsAt: session.startsAt,
        remainingSeats: show.remainingSeatsVisible ? remainingSeats : null,
        maxTicketCount: Math.min(MAX_TICKETS_PER_RESERVATION, remainingSeats),
        bookable: show.status === "OPEN" && isBookable(session) && remainingSeats > 0,
      };
    }),
  };
}

function toProducerSummary(show: MockShow): ProducerShowSummary {
  const ownSessions = showSessions(show.id);
  return {
    id: show.id,
    title: show.title,
    genre: show.genre,
    posterUrl: show.poster.url,
    status: show.status,
    sessionCount: ownSessions.length,
    reservedTickets: ownSessions.reduce((sum, session) => sum + reservedTickets(session.id), 0),
    nextSessionStartsAt: nextSessionStartsAt(show.id),
    createdAt: show.createdAt,
  };
}

function toProducerShow(show: MockShow): ProducerShow {
  const ownSessions = showSessions(show.id);
  return {
    id: show.id,
    title: show.title,
    genre: show.genre,
    description: show.description,
    venue: show.venue,
    directionsNote: show.directionsNote,
    runningMinutes: show.runningMinutes,
    ageRating: show.ageRating,
    inquiryPhone: show.inquiryPhone,
    links: show.links,
    remainingSeatsVisible: show.remainingSeatsVisible,
    poster: show.poster,
    images: show.images,
    status: show.status,
    hasReservations: ownSessions.some((session) => hasAnyReservation(session.id)),
    sessions: ownSessions.map((session) => ({
      id: session.id,
      startsAt: session.startsAt,
      capacity: session.capacity,
      reservedTickets: reservedTickets(session.id),
      hasReservations: hasAnyReservation(session.id),
    })),
    createdAt: show.createdAt,
  };
}

function toProducerReservation(reservation: MockReservation): ProducerReservation {
  return {
    id: reservation.id,
    code: reservation.code,
    bookerName: reservation.bookerName,
    bookerPhone: reservation.bookerPhone,
    ticketCount: reservation.ticketCount,
    status: reservation.status,
    createdAt: reservation.createdAt,
    canceledAt: reservation.canceledAt,
  };
}

function imageUrl(fileId: number) {
  return uploadedImageUrls.get(fileId)
    ?? shows.flatMap((show) => [show.poster, ...show.images]).find((item) => item.fileId === fileId)?.url
    ?? null;
}

/** 백엔드 Show 생성자와 같은 순서로 검증하고 첫 번째 오류만 돌려준다. */
function validateShow(body: SaveShow): string | null {
  const title = body.title?.trim() ?? "";
  if (!title || title.length > 200) return "공연명은 1~200자로 입력해 주세요.";
  if (!SHOW_GENRES.includes(body.genre)) return "공연 장르를 선택해 주세요.";
  if ((body.description?.trim().length ?? 0) > 2000) return "공연 소개는 2000자를 넘을 수 없습니다.";
  if (!body.venue?.name?.trim() || !body.venue.roadAddress?.trim()) return "공연 장소명과 주소를 입력해 주세요.";
  if ((body.directionsNote?.trim().length ?? 0) > MAX_DIRECTIONS_NOTE_LENGTH) {
    return `오시는 길 추가 안내은(는) ${MAX_DIRECTIONS_NOTE_LENGTH}자를 넘을 수 없습니다.`;
  }
  if (!Number.isInteger(body.runningMinutes) || body.runningMinutes < 1 || body.runningMinutes > 1440) {
    return "공연 시간은 1분 이상 1440분 이하로 입력해 주세요.";
  }
  if ((body.ageRating?.trim().length ?? 0) > 50) return "관람 연령은 50자를 넘을 수 없습니다.";
  if (!INQUIRY_PHONE_PATTERN.test(body.inquiryPhone?.trim() ?? "")) {
    return "문의 전화번호는 02-123-4567 형식으로 입력해 주세요.";
  }
  const links = body.links ?? [];
  if (links.length > MAX_SHOW_LINKS) return `안내 링크는 최대 ${MAX_SHOW_LINKS}개까지 등록할 수 있습니다.`;
  const invalidLink = links.map((link) => showLinkError(link)).find(Boolean);
  if (invalidLink) return invalidLink;
  if (!body.posterFileId || imageUrl(body.posterFileId) === null) return "포스터를 등록해 주세요.";
  const imageFileIds = body.imageFileIds ?? [];
  if (imageFileIds.length > MAX_SHOW_IMAGES || new Set(imageFileIds).size !== imageFileIds.length
    || imageFileIds.some((fileId) => imageUrl(fileId) === null)) {
    return "서로 다른 상세 이미지를 최대 3장까지 등록해 주세요.";
  }
  return null;
}

function applyShow(show: MockShow, body: SaveShow) {
  show.title = body.title.trim();
  show.genre = body.genre;
  show.description = body.description?.trim() ?? "";
  show.venue = body.venue;
  show.directionsNote = body.directionsNote?.trim() ?? "";
  show.runningMinutes = body.runningMinutes;
  show.ageRating = body.ageRating?.trim() ?? "";
  show.inquiryPhone = body.inquiryPhone.trim();
  show.links = (body.links ?? []).map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
  show.remainingSeatsVisible = body.remainingSeatsVisible ?? true;
  show.poster = image(body.posterFileId, imageUrl(body.posterFileId) ?? "");
  show.images = (body.imageFileIds ?? []).map((fileId) => image(fileId, imageUrl(fileId) ?? ""));
}

function validateSession(body: SaveShowSession): string | null {
  if (!body.startsAt || Number.isNaN(Date.parse(body.startsAt))) return "회차 시작 시각을 입력해 주세요.";
  if (Date.parse(body.startsAt) <= Date.now()) return "회차 시작 시각은 현재 이후로 입력해 주세요.";
  if (!Number.isInteger(body.capacity) || body.capacity < 1) return "회차 정원은 1명 이상이어야 합니다.";
  return null;
}

const MOCK_COMPANY_NAME = "극단 예술in";

const countReservations = (sessionId: number, status: ReservationStatus) => reservations
  .filter((reservation) => reservation.sessionId === sessionId && reservation.status === status)
  .length;

function toAdminSession(session: MockSession): AdminShowSession {
  return {
    sessionId: session.id,
    startsAt: session.startsAt,
    capacity: session.capacity,
    reservedTickets: reservedTickets(session.id),
    reservationCount: countReservations(session.id, "CONFIRMED"),
    canceledReservationCount: countReservations(session.id, "CANCELED"),
  };
}

/** 운영 대시보드 목이 같은 메모리 상태에서 공연별 예매 집계를 읽는다. 예매자 정보는 담지 않는다. */
export function listAdminShows(status?: ShowStatus): AdminShow[] {
  return shows
    .filter((show) => !status || show.status === status)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map((show) => {
      const adminSessions = showSessions(show.id).map(toAdminSession);
      const total = (pick: (session: AdminShowSession) => number) =>
        adminSessions.reduce((sum, session) => sum + pick(session), 0);
      return {
        showId: show.id,
        title: show.title,
        status: show.status,
        companyName: MOCK_COMPANY_NAME,
        createdAt: show.createdAt,
        totalCapacity: total((session) => session.capacity),
        reservedTickets: total((session) => session.reservedTickets),
        reservationCount: total((session) => session.reservationCount),
        canceledReservationCount: total((session) => session.canceledReservationCount),
        sessions: adminSessions,
      };
    });
}

export const showHandlers = [
  http.get("/api/v1/public/shows", async () => {
    await delay(200);
    return HttpResponse.json({
      shows: shows
        .filter((show) => show.status === "OPEN")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(toPublicSummary),
    });
  }),

  http.get("/api/v1/public/shows/:showId", async ({ params }) => {
    await delay(200);
    const show = findShow(String(params.showId));
    if (!show || show.status === "DRAFT") return showNotFound();
    return HttpResponse.json(toPublicShow(show));
  }),

  http.post("/api/v1/public/shows/:showId/sessions/:sessionId/reservations", async ({ params, request }) => {
    await delay(400);
    const show = findShow(String(params.showId));
    const session = sessions.find((item) => item.id === Number(params.sessionId));
    if (!session || !show || session.showId !== show.id) return show ? sessionNotFound() : showNotFound();
    if (show.status !== "OPEN") return apiError(409, "SHOW_NOT_OPEN", "예매 중인 공연이 아닙니다.");
    const body = (await request.json()) as CreateReservation;
    const bookerName = body.bookerName?.trim() ?? "";
    const bookerPhone = body.bookerPhone?.trim() ?? "";
    if (!body.privacyAgreed) return invalidReservation("개인정보 수집·이용에 동의해 주세요.");
    if (!bookerName || bookerName.length > 50) return invalidReservation("예매자 이름을 50자 이내로 입력해 주세요.");
    if (!PHONE_PATTERN.test(bookerPhone)) return invalidReservation("휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.");
    if (!Number.isInteger(body.ticketCount) || body.ticketCount < 1
      || body.ticketCount > MAX_TICKETS_PER_RESERVATION) {
      return invalidReservation("한 번에 1매 이상 10매 이하로 예매해 주세요.");
    }
    if (reservations.some((item) => item.sessionId === session.id && item.bookerPhone === bookerPhone
      && item.status === "CONFIRMED")) {
      return apiError(409, "RESERVATION_DUPLICATE", "이 휴대폰 번호로 이미 예매한 회차입니다.");
    }
    if (!isBookable(session)) return apiError(409, "SHOW_SESSION_BOOKING_CLOSED", "예매가 마감된 회차입니다.");
    const remainingSeats = Math.max(0, session.capacity - reservedTickets(session.id));
    if (body.ticketCount > remainingSeats) {
      return apiError(409, "SHOW_SESSION_NOT_ENOUGH_SEATS", `남은 좌석은 ${remainingSeats}매입니다.`);
    }
    const reservation: MockReservation = {
      id: nextReservationId,
      code: generateCode(),
      sessionId: session.id,
      bookerName,
      bookerPhone,
      ticketCount: body.ticketCount,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
      canceledAt: null,
    };
    nextReservationId += 1;
    reservations.push(reservation);
    return HttpResponse.json({
      code: reservation.code,
      showTitle: show.title,
      startsAt: session.startsAt,
      ticketCount: reservation.ticketCount,
      bookerName: reservation.bookerName,
    }, { status: 201 });
  }),

  http.get("/api/v1/shows", async () => {
    if (realProducerApiEnabled) return passthrough();
    await delay(200);
    return HttpResponse.json({
      shows: [...shows].sort((left, right) => right.createdAt.localeCompare(left.createdAt)).map(toProducerSummary),
    });
  }),

  http.post("/api/v1/shows", async ({ request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(300);
    const body = (await request.json()) as SaveShow;
    const invalid = validateShow(body);
    if (invalid) return invalidShow(invalid);
    const show: MockShow = {
      id: crypto.randomUUID(),
      title: "",
      genre: body.genre,
      description: "",
      venue: body.venue,
      directionsNote: "",
      runningMinutes: 0,
      ageRating: "",
      inquiryPhone: "",
      links: [],
      remainingSeatsVisible: true,
      poster: image(0, ""),
      images: [],
      status: "DRAFT",
      createdAt: new Date().toISOString(),
    };
    applyShow(show, body);
    shows.push(show);
    return HttpResponse.json(toProducerShow(show), { status: 201 });
  }),

  http.get("/api/v1/shows/:showId", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(200);
    const show = findShow(String(params.showId));
    return show ? HttpResponse.json(toProducerShow(show)) : showNotFound();
  }),

  http.put("/api/v1/shows/:showId", async ({ params, request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(300);
    const show = findShow(String(params.showId));
    if (!show) return showNotFound();
    const body = (await request.json()) as SaveShow;
    const invalid = validateShow(body);
    if (invalid) return invalidShow(invalid);
    applyShow(show, body);
    return HttpResponse.json(toProducerShow(show));
  }),

  http.delete("/api/v1/shows/:showId", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    if (!show) return showNotFound();
    if (showSessions(show.id).some((session) => hasAnyReservation(session.id))) {
      return apiError(409, "SHOW_HAS_RESERVATIONS", "예매 기록이 있는 공연은 삭제할 수 없습니다. 예매를 마감해 주세요.");
    }
    shows.splice(shows.indexOf(show), 1);
    for (const session of showSessions(show.id)) sessions.splice(sessions.indexOf(session), 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/shows/:showId/opening", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    if (!show) return showNotFound();
    if (show.status !== "OPEN" && !showSessions(show.id).some(isBookable)) {
      return apiError(409, "SHOW_NOT_OPENABLE", "예매 가능한 회차가 있어야 공연을 공개할 수 있습니다.");
    }
    show.status = "OPEN";
    return HttpResponse.json(toProducerShow(show));
  }),

  http.post("/api/v1/shows/:showId/closing", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    if (!show) return showNotFound();
    if (show.status === "DRAFT") return apiError(409, "SHOW_INVALID_STATUS", "예매 중인 공연만 마감할 수 있습니다.");
    show.status = "CLOSED";
    return HttpResponse.json(toProducerShow(show));
  }),

  http.post("/api/v1/shows/:showId/sessions", async ({ params, request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    if (!show) return showNotFound();
    const body = (await request.json()) as SaveShowSession;
    const invalid = validateSession(body);
    if (invalid) return invalidShow(invalid);
    sessions.push({ id: nextSessionId, showId: show.id, startsAt: body.startsAt, capacity: body.capacity });
    nextSessionId += 1;
    return HttpResponse.json(toProducerShow(show), { status: 201 });
  }),

  http.put("/api/v1/shows/:showId/sessions/:sessionId", async ({ params, request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    const session = sessions.find((item) => item.id === Number(params.sessionId) && item.showId === show?.id);
    if (!show) return showNotFound();
    if (!session) return sessionNotFound();
    const body = (await request.json()) as SaveShowSession;
    const invalid = validateSession(body);
    if (invalid) return invalidShow(invalid);
    const reserved = reservedTickets(session.id);
    if (body.capacity < reserved) {
      return apiError(409, "SHOW_SESSION_CAPACITY_BELOW_RESERVED", `정원은 이미 예매된 ${reserved}매보다 적을 수 없습니다.`);
    }
    session.startsAt = body.startsAt;
    session.capacity = body.capacity;
    return HttpResponse.json(toProducerShow(show));
  }),

  http.delete("/api/v1/shows/:showId/sessions/:sessionId", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const show = findShow(String(params.showId));
    const session = sessions.find((item) => item.id === Number(params.sessionId) && item.showId === show?.id);
    if (!show) return showNotFound();
    if (!session) return sessionNotFound();
    if (hasAnyReservation(session.id)) {
      return apiError(409, "SHOW_SESSION_HAS_RESERVATIONS", "예매 기록이 있는 회차는 삭제할 수 없습니다.");
    }
    sessions.splice(sessions.indexOf(session), 1);
    return HttpResponse.json(toProducerShow(show));
  }),

  http.get("/api/v1/shows/:showId/sessions/:sessionId/reservations", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(200);
    const show = findShow(String(params.showId));
    const session = sessions.find((item) => item.id === Number(params.sessionId) && item.showId === show?.id);
    if (!show) return showNotFound();
    if (!session) return sessionNotFound();
    return HttpResponse.json({
      reservations: reservations
        .filter((reservation) => reservation.sessionId === session.id)
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id - right.id)
        .map(toProducerReservation),
    });
  }),

  http.post("/api/v1/reservations/:reservationId/cancellation", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const reservation = reservations.find((item) => item.id === Number(params.reservationId));
    if (!reservation) return apiError(404, "RESERVATION_NOT_FOUND", "예매를 찾을 수 없습니다.");
    if (reservation.status === "CONFIRMED") {
      reservation.status = "CANCELED";
      reservation.canceledAt = new Date().toISOString();
    }
    return HttpResponse.json(toProducerReservation(reservation));
  }),

  http.post("/api/v1/show-images/upload-requests", async () => {
    if (realProducerApiEnabled) return passthrough();
    await delay(150);
    const fileId = nextFileId;
    nextFileId += 1;
    return HttpResponse.json({
      fileId,
      uploadUrl: `/mock-uploads/show-images/${fileId}`,
      method: "PUT",
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      headers: {},
    }, { status: 201 });
  }),

  http.put("/mock-uploads/show-images/:fileId", async ({ params, request }) => {
    uploadedImageUrls.set(Number(params.fileId), URL.createObjectURL(await request.blob()));
    return new HttpResponse(null, { status: 200 });
  }),

  http.patch("/api/v1/show-images/:fileId/completion", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(100);
    return uploadedImageUrls.has(Number(params.fileId))
      ? new HttpResponse(null, { status: 204 })
      : apiError(409, "FILE_NOT_UPLOADED", "파일 업로드가 끝나지 않았습니다.");
  }),
];
