/** 무료 공연 예매의 공개·기획사 API 계약. 공연 id는 공개 UUID, 회차·예매 id는 숫자다. */

export type ShowStatus = "DRAFT" | "OPEN" | "CLOSED";
export type ShowGenre = "MUSICAL" | "PLAY";

export const SHOW_GENRES: readonly ShowGenre[] = ["MUSICAL", "PLAY"];
export const SHOW_GENRE_LABELS: Record<ShowGenre, string> = { MUSICAL: "뮤지컬", PLAY: "연극" };
export type ReservationStatus = "CONFIRMED" | "CANCELED";

export const MAX_SHOW_IMAGES = 3;
export const MAX_SHOW_LINKS = 3;
export const MAX_SHOW_DESCRIPTION_LENGTH = 2000;
export const MAX_SHOW_LINK_LABEL_LENGTH = 30;
export const MAX_SHOW_LINK_URL_LENGTH = 500;
export const MAX_SHOW_GUIDES = 5;
export const MAX_SHOW_GUIDE_TITLE_LENGTH = 30;
export const MAX_SHOW_GUIDE_CONTENT_LENGTH = 1000;
export const MAX_SHOW_HOST_NAME_LENGTH = 50;
export const MAX_TICKETS_PER_RESERVATION = 10;
export const MAX_RESERVATION_MEMO_LENGTH = 300;
/** 복사하거나 내려받은 예매 관객 정보를 직접 삭제하도록 안내할 기간. */
export const EXPORTED_BOOKER_DATA_DELETE_DAYS = 3;

/** 예매 안내에 보여 주는 외부 링크(공연사 SNS, 홈페이지 등). */
export type ShowLink = {
  readonly label: string;
  readonly url: string;
};

/** 오시는 길 지도 아래에 보여 주는 추가 안내. 제목은 "주차 안내"처럼 기획사가 정한다. */
export type ShowGuide = {
  readonly title: string;
  readonly content: string;
};

export type ShowVenue = {
  readonly name: string;
  readonly roadAddress: string;
  readonly detailAddress: string;
  readonly zonecode: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
};

export type PublicShowSummary = {
  readonly id: string;
  /** 공연에 따로 적은 주최 이름. 없으면 기획사 계정의 회사명이다. */
  readonly hostName: string;
  readonly title: string;
  readonly genre: ShowGenre;
  readonly posterUrl: string;
  readonly venueName: string;
  readonly nextSessionStartsAt: string | null;
  readonly runningMinutes: number;
};

export type PublicShowSession = {
  readonly id: number;
  readonly startsAt: string;
  /** 공연이 잔여석을 숨기면 null이다. */
  readonly remainingSeats: number | null;
  /** 한 번에 예매할 수 있는 최대 매수 = min(1회 최대 매수, 잔여석). 0이면 매진이다. */
  readonly maxTicketCount: number;
  readonly bookable: boolean;
};

export type PublicShow = {
  readonly id: string;
  /** 공연에 따로 적은 주최 이름. 없으면 기획사 계정의 회사명이다. */
  readonly hostName: string;
  readonly title: string;
  readonly genre: ShowGenre;
  readonly description: string;
  readonly posterUrl: string;
  readonly imageUrls: readonly string[];
  readonly venue: ShowVenue;
  readonly guides: readonly ShowGuide[];
  readonly runningMinutes: number;
  readonly ageRating: string;
  readonly inquiryPhone: string;
  readonly links: readonly ShowLink[];
  readonly status: Exclude<ShowStatus, "DRAFT">;
  readonly maxTicketsPerReservation: number;
  readonly sessions: readonly PublicShowSession[];
};

export type CreateReservation = {
  readonly bookerName: string;
  readonly bookerPhone: string;
  readonly ticketCount: number;
  readonly privacyAgreed: boolean;
};

export type ReservationReceipt = {
  readonly code: string;
  readonly showTitle: string;
  readonly startsAt: string;
  readonly ticketCount: number;
  readonly bookerName: string;
};

/** 예매 화면이 문구를 나눠 보여 줘야 하는 서버 오류 코드. */
export const RESERVATION_ERROR_CODES = {
  invalidInput: "RESERVATION_INVALID_INPUT",
  duplicate: "RESERVATION_DUPLICATE",
  showNotFound: "SHOW_NOT_FOUND",
  sessionNotFound: "SHOW_SESSION_NOT_FOUND",
  showNotOpen: "SHOW_NOT_OPEN",
  bookingClosed: "SHOW_SESSION_BOOKING_CLOSED",
  notEnoughSeats: "SHOW_SESSION_NOT_ENOUGH_SEATS",
} as const;

export type ProducerShowSummary = {
  readonly id: string;
  readonly title: string;
  readonly genre: ShowGenre;
  readonly posterUrl: string;
  readonly status: ShowStatus;
  readonly sessionCount: number;
  readonly reservedTickets: number;
  readonly nextSessionStartsAt: string | null;
  readonly createdAt: string;
};

export type ProducerShowSession = {
  readonly id: number;
  readonly startsAt: string;
  readonly capacity: number;
  readonly reservedTickets: number;
  readonly hasReservations: boolean;
};

export type ProducerShowImage = {
  readonly fileId: number;
  readonly url: string;
};

export type ProducerShow = {
  readonly id: string;
  readonly title: string;
  readonly genre: ShowGenre;
  readonly description: string;
  readonly venue: ShowVenue;
  readonly runningMinutes: number;
  readonly ageRating: string;
  readonly inquiryPhone: string;
  /** 공연에 따로 적은 주최 이름. 비어 있으면 관객에게 `defaultHostName`이 보인다. */
  readonly hostName: string;
  /** 기획사 계정의 회사명. */
  readonly defaultHostName: string;
  readonly links: readonly ShowLink[];
  readonly guides: readonly ShowGuide[];
  readonly remainingSeatsVisible: boolean;
  readonly poster: ProducerShowImage;
  readonly images: readonly ProducerShowImage[];
  readonly status: ShowStatus;
  readonly hasReservations: boolean;
  readonly sessions: readonly ProducerShowSession[];
  readonly createdAt: string;
};

export type SaveShow = {
  readonly title: string;
  readonly genre: ShowGenre;
  readonly description: string;
  readonly venue: ShowVenue;
  readonly runningMinutes: number;
  readonly ageRating: string;
  readonly inquiryPhone: string;
  /** 빈 값이면 기획사 계정의 회사명으로 보여 준다. */
  readonly hostName: string;
  readonly links: readonly ShowLink[];
  readonly guides: readonly ShowGuide[];
  readonly remainingSeatsVisible: boolean;
  readonly posterFileId: number;
  readonly imageFileIds: readonly number[];
};

export type SaveShowSession = {
  readonly startsAt: string;
  readonly capacity: number;
};

export type ProducerReservation = {
  readonly id: number;
  readonly code: string;
  readonly bookerName: string;
  readonly bookerPhone: string;
  readonly ticketCount: number;
  readonly status: ReservationStatus;
  /** 기획사만 보는 관객별 메모. 없으면 빈 문자열이다. */
  readonly memo: string;
  readonly createdAt: string;
  readonly canceledAt: string | null;
};

/** 공연 링크는 이 helper로만 만든다. 서브도메인으로 옮길 때 여기만 바꾼다. */
export const showRoutes = {
  list: "/shows",
  detail: (showId: string) => `/shows/${encodeURIComponent(showId)}`,
  manageList: "/producers/shows",
  manageDetail: (showId: string) => `/producers/shows/${encodeURIComponent(showId)}`,
} as const;
