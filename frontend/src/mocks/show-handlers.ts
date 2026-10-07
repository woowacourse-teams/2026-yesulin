import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminShow, AdminShowSession } from "@/features/admin/types";
import {
  MAX_RESERVATION_MEMO_LENGTH,
  MAX_SHOW_GUIDES,
  MAX_SHOW_HOST_NAME_LENGTH,
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
  type ShowGuide,
  type ShowLink,
  type ShowStatus,
  type ShowVenue,
} from "@/features/shows/types";
import { externalReservationUrlError, showGuideError, showLinkError } from "@/features/shows/show-form";
import { producerProfile } from "./auditions/producer-profile";

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
  runningMinutes: number;
  ageRating: string;
  inquiryPhone: string;
  hostName: string;
  links: ShowLink[];
  guides: ShowGuide[];
  remainingSeatsVisible: boolean;
  externalReservationUrl: string;
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
  memo: string;
  createdAt: string;
  canceledAt: string | null;
};

const PHONE_PATTERN = /^\d{3}-\d{4}-\d{4}$/;
const INQUIRY_PHONE_PATTERN = /^\d{2,4}-\d{3,4}(-\d{4})?$/;
const CODE_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const KST_OFFSET_HOURS = 9;
const MOCK_COMPANY_NAME = "극단 예술in";

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
    runningMinutes: 100,
    ageRating: "8세 이상",
    inquiryPhone: "02-123-4567",
    hostName: "",
    links: [
      { label: "공연사 인스타그램 보기", url: "https://www.instagram.com/" },
      { label: "공연사 홈페이지", url: "https://yesulin.art/" },
    ],
    guides: [
      { title: "주차 안내", content: "주차 공간이 협소하여 가급적 대중교통 이용을 부탁드립니다." },
      { title: "찾아오는 길", content: "혜화역 2번 출구에서 도보 약 5분 거리입니다.\n건물 정문이 아닌 오른쪽 골목에 위치한 공연장 전용 입구를 이용해 주세요." },
      { title: "휠체어 관람", content: "공연장 입구에 경사로가 있어요. 휠체어로 관람하시면 예매 후 문의 전화로 알려 주세요." },
    ],
    remainingSeatsVisible: true,
    externalReservationUrl: "",
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
    runningMinutes: 70,
    ageRating: "전체관람가",
    inquiryPhone: "010-2345-6789",
    hostName: "",
    links: [],
    guides: [],
    remainingSeatsVisible: true,
    externalReservationUrl: "",
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
    runningMinutes: 60,
    ageRating: "",
    inquiryPhone: "02-123-4567",
    hostName: "",
    links: [],
    guides: [],
    remainingSeatsVisible: true,
    externalReservationUrl: "",
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
    runningMinutes: 80,
    ageRating: "12세 이상",
    inquiryPhone: "02-765-4321",
    hostName: "2026 골목길 낭독 프로젝트",
    links: [{ label: "극단 인스타그램", url: "https://www.instagram.com/" }],
    guides: [{ title: "추가 안내", content: "건물 정문이 아닌 오른쪽 골목의 공연장 전용 입구를 이용해 주세요." }],
    remainingSeatsVisible: false,
    externalReservationUrl: "",
    poster: image(9007, "/images/performances/nightfall.jpg"),
    images: [],
    status: "OPEN",
    createdAt: kstAt(-3, 10),
  },
  {
    id: "seed_show_external",
    title: "숲속 버스킹 연극",
    genre: "PLAY",
    description: "운영자가 등록한 공연으로 네이버 폼에서 예매받습니다. 예매하기를 누르면 외부 예매 페이지가 새 창으로 열립니다.",
    venue: venue("서울숲 야외무대", "서울특별시 성동구 뚝섬로 273"),
    runningMinutes: 50,
    ageRating: "전체관람가",
    inquiryPhone: "010-3456-7890",
    hostName: "서울숲 거리극 모임",
    links: [],
    guides: [],
    remainingSeatsVisible: true,
    externalReservationUrl: "https://form.naver.com/response/example",
    poster: image(9008, "/images/performances/summerplay.jpg"),
    images: [],
    status: "OPEN",
    createdAt: kstAt(-2, 10),
  },
  {
    id: "seed_show_draft",
    title: "준비 중인 가을 공연",
    genre: "MUSICAL",
    description: "",
    venue: venue("대학로 예술인 소극장", "서울특별시 종로구 대학로 12"),
    runningMinutes: 90,
    ageRating: "",
    inquiryPhone: "02-123-4567",
    hostName: "",
    links: [],
    guides: [],
    remainingSeatsVisible: true,
    externalReservationUrl: "",
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
  { id: 501, showId: "seed_show_external", startsAt: kstAt(-2, 18), capacity: 0 },
  { id: 502, showId: "seed_show_external", startsAt: kstAt(8, 18), capacity: 0 },
  { id: 503, showId: "seed_show_external", startsAt: kstAt(9, 16), capacity: 0 },
];

const reservations: MockReservation[] = [];
let nextSessionId = 1000;
let nextReservationId = 1;
let nextFileId = 10_000;
const uploadedImageUrls = new Map<number, string>();
/** 운영자 공연에서 관객이 예매하기로 외부 예매 페이지에 간 횟수. */
const externalReservationVisits = new Map<string, number>([["seed_show_external", 12]]);

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
      memo: "",
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

// 관객별 메모 예시. 기획사 화면의 다가오는 첫 회차에서 보인다.
const memoSeeds = reservations.filter((reservation) => reservation.sessionId === 102);
memoSeeds[0]!.memo = "휠체어 이용. 입구 경사로 쪽으로 안내";
memoSeeds[1]!.memo = "7세 아이 동반, 통로 쪽 자리 요청";

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

/** 실제 백엔드처럼 공연에 따로 적은 이름이 없으면 기획사 계정의 회사명을 쓴다. 목 로그인은 회사명이 비어 있을 수 있다. */
const companyName = () => producerProfile().companyName || MOCK_COMPANY_NAME;
const hostNameOf = (show: MockShow) => show.hostName || companyName();

function toPublicSummary(show: MockShow): PublicShowSummary {
  return {
    id: show.id,
    hostName: hostNameOf(show),
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
    hostName: hostNameOf(show),
    title: show.title,
    genre: show.genre,
    description: show.description,
    posterUrl: show.poster.url,
    imageUrls: show.images.map((item) => item.url),
    venue: show.venue,
    guides: show.guides,
    runningMinutes: show.runningMinutes,
    ageRating: show.ageRating,
    inquiryPhone: show.inquiryPhone,
    links: show.links,
    externalReservationUrl: show.externalReservationUrl,
    status: show.status === "CLOSED" ? "CLOSED" : "OPEN",
    maxTicketsPerReservation: MAX_TICKETS_PER_RESERVATION,
    sessions: showSessions(show.id).map((session) => {
      // 외부 예매는 잔여석을 알 수 없어 숫자를 내보내지 않고 시작 전 회차만 예매 가능으로 둔다.
      if (show.externalReservationUrl) {
        return {
          id: session.id,
          startsAt: session.startsAt,
          remainingSeats: null,
          maxTicketCount: 0,
          bookable: show.status === "OPEN" && isBookable(session),
        };
      }
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
    runningMinutes: show.runningMinutes,
    ageRating: show.ageRating,
    inquiryPhone: show.inquiryPhone,
    hostName: show.hostName,
    defaultHostName: companyName(),
    links: show.links,
    guides: show.guides,
    remainingSeatsVisible: show.remainingSeatsVisible,
    externalReservationUrl: show.externalReservationUrl,
    externalReservationVisits: externalReservationVisits.get(show.id) ?? 0,
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
    memo: reservation.memo,
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
  if (!Number.isInteger(body.runningMinutes) || body.runningMinutes < 1 || body.runningMinutes > 1440) {
    return "공연 시간은 1분 이상 1440분 이하로 입력해 주세요.";
  }
  if ((body.ageRating?.trim().length ?? 0) > 50) return "관람 연령은 50자를 넘을 수 없습니다.";
  if (!INQUIRY_PHONE_PATTERN.test(body.inquiryPhone?.trim() ?? "")) {
    return "문의 전화번호는 02-123-4567 형식으로 입력해 주세요.";
  }
  if ((body.hostName?.trim().length ?? 0) > MAX_SHOW_HOST_NAME_LENGTH) {
    return `주최 이름은(는) ${MAX_SHOW_HOST_NAME_LENGTH}자를 넘을 수 없습니다.`;
  }
  const links = body.links ?? [];
  if (links.length > MAX_SHOW_LINKS) return `안내 링크는 최대 ${MAX_SHOW_LINKS}개까지 등록할 수 있습니다.`;
  const invalidLink = links.map((link) => showLinkError(link)).find(Boolean);
  if (invalidLink) return invalidLink;
  const guides = body.guides ?? [];
  if (guides.length > MAX_SHOW_GUIDES) return `추가 안내는 최대 ${MAX_SHOW_GUIDES}개까지 등록할 수 있습니다.`;
  const invalidGuide = guides.map((guide) => showGuideError(guide)).find(Boolean);
  if (invalidGuide) return invalidGuide;
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
  show.runningMinutes = body.runningMinutes;
  show.ageRating = body.ageRating?.trim() ?? "";
  show.inquiryPhone = body.inquiryPhone.trim();
  show.hostName = body.hostName?.trim() ?? "";
  show.links = (body.links ?? []).map((link) => ({ label: link.label.trim(), url: link.url.trim() }));
  show.guides = (body.guides ?? []).map((guide) => ({ title: guide.title.trim(), content: guide.content.trim() }));
  show.remainingSeatsVisible = body.remainingSeatsVisible ?? true;
  show.poster = image(body.posterFileId, imageUrl(body.posterFileId) ?? "");
  show.images = (body.imageFileIds ?? []).map((fileId) => image(fileId, imageUrl(fileId) ?? ""));
}

/** 외부 링크 공연의 회차는 정원이 없어(0) 정원을 검사하지 않는다. */
function validateSession(body: SaveShowSession, withCapacity: boolean): string | null {
  if (!body.startsAt || Number.isNaN(Date.parse(body.startsAt))) return "회차 시작 시각을 입력해 주세요.";
  if (Date.parse(body.startsAt) <= Date.now()) return "회차 시작 시각은 현재 이후로 입력해 주세요.";
  if (withCapacity && (!Number.isInteger(body.capacity) || body.capacity! < 1)) return "회차 정원은 1명 이상이어야 합니다.";
  return null;
}

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

/** 운영자가 공연의 주최 이름을 대신 고친다. 없는 공연이면 null. */
export function changeMockShowHostName(showId: string, hostName: string) {
  const show = findShow(showId);
  if (!show) return null;
  show.hostName = hostName.trim();
  return { showId: show.id, hostName: show.hostName, companyName: companyName() };
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
        companyName: isAdminShow(show) ? null : companyName(),
        hostName: show.hostName,
        externalReservationUrl: show.externalReservationUrl,
        externalReservationVisits: externalReservationVisits.get(show.id) ?? 0,
        createdAt: show.createdAt,
        totalCapacity: total((session) => session.capacity),
        reservedTickets: total((session) => session.reservedTickets),
        reservationCount: total((session) => session.reservationCount),
        canceledReservationCount: total((session) => session.canceledReservationCount),
        sessions: adminSessions,
      };
    });
}

/** 운영자가 등록한 공연은 외부 예매 주소가 있다. 기획사 화면에서는 보이지 않는다. */
const isAdminShow = (show: MockShow) => show.externalReservationUrl !== "";

/** 기획사 관리 API와 운영자 공연 관리 API가 같은 공연·회차 규칙을 쓰도록 범위만 바꿔 끼운다. */
type ManagementScope = {
  readonly basePath: string;
  readonly imagesPath: string;
  /** 실제 백엔드로 넘길 때 true. */
  readonly bypass: () => boolean;
  /** 권한이 없으면 오류 응답을 돌려준다. */
  readonly reject: () => Response | null;
  readonly find: (showId: string) => MockShow | undefined;
  readonly includes: (show: MockShow) => boolean;
  readonly validate: (body: SaveShow) => string | null;
  readonly apply: (show: MockShow, body: SaveShow) => void;
  /** 운영자 공연 목록은 운영 대시보드 조회(`GET /api/v1/admin/shows`)가 맡는다. */
  readonly listable: boolean;
  /** 운영자 공연(외부 링크)의 회차는 정원이 없다. */
  readonly withCapacity: boolean;
};

const producerScope: ManagementScope = {
  basePath: "/api/v1/shows",
  imagesPath: "/api/v1/show-images",
  bypass: () => realProducerApiEnabled,
  reject: () => null,
  find: (showId) => {
    const show = findShow(showId);
    return show && !isAdminShow(show) ? show : undefined;
  },
  includes: (show) => !isAdminShow(show),
  validate: validateShow,
  apply: applyShow,
  listable: true,
  withCapacity: true,
};

/** 운영자 공연은 기획사 계정이 없어 주최 이름이 필수이고, 외부 예매 주소로만 예매받는다. */
function validateAdminShow(body: SaveShow): string | null {
  const invalid = validateShow(body);
  if (invalid) return invalid;
  if (!body.hostName?.trim()) return "주최 이름은 필수입니다.";
  return externalReservationUrlError(body.externalReservationUrl ?? "")
    ? "외부 예매 링크는 https://로 시작하는 올바른 주소로 입력해 주세요."
    : null;
}

/** 운영 대시보드 목에서 ADMIN 세션 확인과 실제 백엔드 전환 여부를 받아 운영자 공연 관리 API를 만든다. */
export function adminShowHandlers(reject: () => Response | null, bypass: () => boolean) {
  return showManagementRoutes({
    basePath: "/api/v1/admin/shows",
    imagesPath: "/api/v1/admin/show-images",
    bypass,
    reject,
    find: (showId) => {
      const show = findShow(showId);
      return show && isAdminShow(show) ? show : undefined;
    },
    includes: isAdminShow,
    validate: validateAdminShow,
    apply: (show, body) => {
      applyShow(show, body);
      show.externalReservationUrl = body.externalReservationUrl?.trim() ?? "";
    },
    listable: false,
    withCapacity: false,
  });
}

function showManagementRoutes(scope: ManagementScope) {
  const { basePath, imagesPath } = scope;
  const guard = () => scope.reject();
  const listRoutes = scope.listable ? [
    http.get(basePath, async () => {
      if (scope.bypass()) return passthrough();
      await delay(200);
      return guard() ?? HttpResponse.json({
        shows: shows.filter(scope.includes)
          .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map(toProducerSummary),
      });
    }),
  ] : [];
  return [
    ...listRoutes,

    http.post(basePath, async ({ request }) => {
      if (scope.bypass()) return passthrough();
      await delay(300);
      const rejected = guard();
      if (rejected) return rejected;
      const body = (await request.json()) as SaveShow;
      const invalid = scope.validate(body);
      if (invalid) return invalidShow(invalid);
      const show: MockShow = {
        id: crypto.randomUUID(),
        title: "",
        genre: body.genre,
        description: "",
        venue: body.venue,
        runningMinutes: 0,
        ageRating: "",
        inquiryPhone: "",
        hostName: "",
        links: [],
        guides: [],
        remainingSeatsVisible: true,
        externalReservationUrl: "",
        poster: image(0, ""),
        images: [],
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      };
      scope.apply(show, body);
      shows.push(show);
      return HttpResponse.json(toProducerShow(show), { status: 201 });
    }),

    http.get(`${basePath}/:showId`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(200);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      return show ? HttpResponse.json(toProducerShow(show)) : showNotFound();
    }),

    http.put(`${basePath}/:showId`, async ({ params, request }) => {
      if (scope.bypass()) return passthrough();
      await delay(300);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      if (!show) return showNotFound();
      const body = (await request.json()) as SaveShow;
      const invalid = scope.validate(body);
      if (invalid) return invalidShow(invalid);
      scope.apply(show, body);
      return HttpResponse.json(toProducerShow(show));
    }),

    http.delete(`${basePath}/:showId`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      if (!show) return showNotFound();
      if (showSessions(show.id).some((session) => hasAnyReservation(session.id))) {
        return apiError(409, "SHOW_HAS_RESERVATIONS", "예매 기록이 있는 공연은 삭제할 수 없습니다. 예매를 마감해 주세요.");
      }
      shows.splice(shows.indexOf(show), 1);
      for (const session of showSessions(show.id)) sessions.splice(sessions.indexOf(session), 1);
      return new HttpResponse(null, { status: 204 });
    }),

    http.post(`${basePath}/:showId/opening`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      if (!show) return showNotFound();
      if (show.status !== "OPEN" && !showSessions(show.id).some(isBookable)) {
        return apiError(409, "SHOW_NOT_OPENABLE", "예매 가능한 회차가 있어야 공연을 공개할 수 있습니다.");
      }
      show.status = "OPEN";
      return HttpResponse.json(toProducerShow(show));
    }),

    http.post(`${basePath}/:showId/closing`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      if (!show) return showNotFound();
      if (show.status === "DRAFT") return apiError(409, "SHOW_INVALID_STATUS", "예매 중인 공연만 마감할 수 있습니다.");
      show.status = "CLOSED";
      return HttpResponse.json(toProducerShow(show));
    }),

    http.post(`${basePath}/:showId/sessions`, async ({ params, request }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      if (!show) return showNotFound();
      const body = (await request.json()) as SaveShowSession;
      const invalid = validateSession(body, scope.withCapacity);
      if (invalid) return invalidShow(invalid);
      sessions.push({ id: nextSessionId, showId: show.id, startsAt: body.startsAt, capacity: scope.withCapacity ? body.capacity! : 0 });
      nextSessionId += 1;
      return HttpResponse.json(toProducerShow(show), { status: 201 });
    }),

    http.put(`${basePath}/:showId/sessions/:sessionId`, async ({ params, request }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      const session = sessions.find((item) => item.id === Number(params.sessionId) && item.showId === show?.id);
      if (!show) return showNotFound();
      if (!session) return sessionNotFound();
      const body = (await request.json()) as SaveShowSession;
      const invalid = validateSession(body, scope.withCapacity);
      if (invalid) return invalidShow(invalid);
      if (scope.withCapacity) {
        const reserved = reservedTickets(session.id);
        if (body.capacity! < reserved) {
          return apiError(409, "SHOW_SESSION_CAPACITY_BELOW_RESERVED", `정원은 이미 예매된 ${reserved}매보다 적을 수 없습니다.`);
        }
        session.capacity = body.capacity!;
      }
      session.startsAt = body.startsAt;
      return HttpResponse.json(toProducerShow(show));
    }),

    http.delete(`${basePath}/:showId/sessions/:sessionId`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(250);
      const rejected = guard();
      if (rejected) return rejected;
      const show = scope.find(String(params.showId));
      const session = sessions.find((item) => item.id === Number(params.sessionId) && item.showId === show?.id);
      if (!show) return showNotFound();
      if (!session) return sessionNotFound();
      if (hasAnyReservation(session.id)) {
        return apiError(409, "SHOW_SESSION_HAS_RESERVATIONS", "예매 기록이 있는 회차는 삭제할 수 없습니다.");
      }
      sessions.splice(sessions.indexOf(session), 1);
      return HttpResponse.json(toProducerShow(show));
    }),

    http.post(`${imagesPath}/upload-requests`, async () => {
      if (scope.bypass()) return passthrough();
      await delay(150);
      const rejected = guard();
      if (rejected) return rejected;
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

    http.patch(`${imagesPath}/:fileId/completion`, async ({ params }) => {
      if (scope.bypass()) return passthrough();
      await delay(100);
      const rejected = guard();
      if (rejected) return rejected;
      return uploadedImageUrls.has(Number(params.fileId))
        ? new HttpResponse(null, { status: 204 })
        : apiError(409, "FILE_NOT_UPLOADED", "파일 업로드가 끝나지 않았습니다.");
    }),
  ];
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

  http.post("/api/v1/public/shows/:showId/external-reservation-visits", async ({ params }) => {
    await delay(100);
    const show = findShow(String(params.showId));
    if (!show || show.status === "DRAFT") return showNotFound();
    if (show.status !== "OPEN") return apiError(409, "SHOW_NOT_OPEN", "예매 중인 공연이 아닙니다.");
    if (!isAdminShow(show)) return apiError(409, "SHOW_INVALID_STATUS", "외부 링크로 예매받는 공연이 아닙니다.");
    externalReservationVisits.set(show.id, (externalReservationVisits.get(show.id) ?? 0) + 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/public/shows/:showId/sessions/:sessionId/reservations", async ({ params, request }) => {
    await delay(400);
    const show = findShow(String(params.showId));
    const session = sessions.find((item) => item.id === Number(params.sessionId));
    if (!session || !show || session.showId !== show.id) return show ? sessionNotFound() : showNotFound();
    if (show.status !== "OPEN") return apiError(409, "SHOW_NOT_OPEN", "예매 중인 공연이 아닙니다.");
    if (show.externalReservationUrl) {
      return apiError(409, "SHOW_EXTERNAL_RESERVATION", "이 공연은 외부 예매 페이지에서 예매할 수 있습니다.");
    }
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
      memo: "",
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

  ...showManagementRoutes(producerScope),

  http.put("/mock-uploads/show-images/:fileId", async ({ params, request }) => {
    uploadedImageUrls.set(Number(params.fileId), URL.createObjectURL(await request.blob()));
    return new HttpResponse(null, { status: 200 });
  }),

  http.get("/api/v1/shows/:showId/sessions/:sessionId/reservations", async ({ params }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(200);
    const show = producerScope.find(String(params.showId));
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

  http.put("/api/v1/reservations/:reservationId/ticket-count", async ({ params, request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(250);
    const reservation = reservations.find((item) => item.id === Number(params.reservationId));
    if (!reservation) return apiError(404, "RESERVATION_NOT_FOUND", "예매를 찾을 수 없습니다.");
    const { ticketCount } = (await request.json()) as { readonly ticketCount: number };
    if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > MAX_TICKETS_PER_RESERVATION) {
      return apiError(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.");
    }
    if (reservation.status !== "CONFIRMED") {
      return apiError(409, "RESERVATION_NOT_CHANGEABLE", "취소된 예매는 매수를 바꿀 수 없습니다.");
    }
    const session = sessions.find((item) => item.id === reservation.sessionId);
    const available = session ? session.capacity - reservedTickets(session.id) + reservation.ticketCount : 0;
    if (ticketCount > available) {
      return apiError(409, "SHOW_SESSION_NOT_ENOUGH_SEATS",
        `남은 좌석이 부족해 최대 ${available}매까지 바꿀 수 있습니다. 회차 정원을 먼저 늘려 주세요.`);
    }
    reservation.ticketCount = ticketCount;
    return HttpResponse.json(toProducerReservation(reservation));
  }),

  http.put("/api/v1/reservations/:reservationId/memo", async ({ params, request }) => {
    if (realProducerApiEnabled) return passthrough();
    await delay(200);
    const reservation = reservations.find((item) => item.id === Number(params.reservationId));
    if (!reservation) return apiError(404, "RESERVATION_NOT_FOUND", "예매를 찾을 수 없습니다.");
    const { memo } = (await request.json()) as { readonly memo: string };
    if (typeof memo !== "string" || memo.trim().length > MAX_RESERVATION_MEMO_LENGTH) {
      return apiError(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.");
    }
    reservation.memo = memo.trim();
    return HttpResponse.json(toProducerReservation(reservation));
  }),
];
