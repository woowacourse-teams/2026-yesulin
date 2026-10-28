import { fromKoreaLocalInput, toKoreaLocalInput } from "./korea-time";
import { MAX_EVENT_DETAIL_IMAGES } from "./types";
import type { AdminEvent, AdminEventWrite } from "@/features/admin/types";

/** 운영자 이벤트 폼 상태. 입력 칸은 모두 문자열이고 저장할 때 빈 칸을 null로 바꾼다. */
export type EventDraft = {
  readonly title: string;
  readonly summary: string;
  readonly body: string;
  readonly detailBody: string;
  readonly detailImageUrls: readonly string[];
  readonly startsOn: string;
  readonly endsOn: string;
  readonly applyUrl: string;
  readonly applyLabel: string;
  readonly registrationEnabled: boolean;
  readonly registrationNotice: string;
  readonly registrationConfirmationEnabled: boolean;
  readonly registrationConfirmationMessage: string;
  /** 명함 제작 마감 시각. `datetime-local` 입력 값이고 한국 시각이다. */
  readonly businessCardClosesAt: string;
  readonly coverImageUrl: string | null;
  readonly bannerEnabled: boolean;
  readonly bannerDesktopImageUrl: string | null;
  readonly bannerMobileImageUrl: string | null;
  readonly bannerAlt: string;
  readonly bannerEndsOn: string;
  readonly bannerOrder: string;
};

export type EventImageSlot = "cover" | "detail" | "bannerDesktop" | "bannerMobile";

/** 메인 배너 칸의 비율. 화면이 PC는 3.2:1, 모바일은 4:3으로 자르므로 크게 다르면 글자가 잘린다. */
export const BANNER_RATIOS: Readonly<Record<Exclude<EventImageSlot, "cover" | "detail">, { readonly ratio: number; readonly label: string }>> = {
  bannerDesktop: { ratio: 3.2, label: "3.2:1" },
  bannerMobile: { ratio: 4 / 3, label: "4:3" },
};

/** 이 정도까지는 가장자리만 조금 잘려 그대로 쓴다. 지금 쓰는 PC 배너(3:1)도 이 안에 든다. */
const RATIO_TOLERANCE = 0.1;

export function emptyEventDraft(): EventDraft {
  return {
    title: "",
    summary: "",
    body: "",
    detailBody: "",
    detailImageUrls: [],
    startsOn: "",
    endsOn: "",
    applyUrl: "",
    applyLabel: "",
    registrationEnabled: false,
    registrationNotice: "",
    registrationConfirmationEnabled: false,
    registrationConfirmationMessage: "",
    businessCardClosesAt: "",
    coverImageUrl: null,
    bannerEnabled: false,
    bannerDesktopImageUrl: null,
    bannerMobileImageUrl: null,
    bannerAlt: "",
    bannerEndsOn: "",
    bannerOrder: "0",
  };
}

export function draftOfEvent(event: AdminEvent): EventDraft {
  return {
    title: event.title,
    summary: event.summary ?? "",
    body: event.body,
    detailBody: event.detailBody ?? "",
    detailImageUrls: event.detailImageUrls ?? [],
    startsOn: event.startsOn ?? "",
    endsOn: event.endsOn ?? "",
    applyUrl: event.applyUrl ?? "",
    applyLabel: event.applyLabel ?? "",
    registrationEnabled: event.registrationEnabled,
    registrationNotice: event.registrationNotice ?? "",
    registrationConfirmationEnabled: event.registrationConfirmationEnabled ?? false,
    registrationConfirmationMessage: event.registrationConfirmationMessage ?? "",
    businessCardClosesAt: toKoreaLocalInput(event.businessCardClosesAt),
    coverImageUrl: event.coverImageUrl,
    bannerEnabled: event.banner.enabled,
    bannerDesktopImageUrl: event.banner.desktopImageUrl,
    bannerMobileImageUrl: event.banner.mobileImageUrl,
    bannerAlt: event.banner.alt ?? "",
    bannerEndsOn: event.banner.endsOn ?? "",
    bannerOrder: String(event.banner.order),
  };
}

export function writeOfEvent(draft: EventDraft): AdminEventWrite {
  const order = Number.parseInt(draft.bannerOrder, 10);
  return {
    title: draft.title.trim(),
    summary: blankToNull(draft.summary),
    body: draft.body.trim(),
    detailBody: blankToNull(draft.detailBody),
    detailImageUrls: draft.detailImageUrls,
    startsOn: blankToNull(draft.startsOn),
    endsOn: blankToNull(draft.endsOn),
    applyUrl: blankToNull(draft.applyUrl),
    applyLabel: blankToNull(draft.applyLabel),
    registrationEnabled: draft.registrationEnabled,
    registrationNotice: draft.registrationEnabled ? blankToNull(draft.registrationNotice) : null,
    registrationConfirmationEnabled: draft.registrationEnabled && draft.registrationConfirmationEnabled,
    registrationConfirmationMessage: draft.registrationEnabled && draft.registrationConfirmationEnabled
      ? blankToNull(draft.registrationConfirmationMessage) : null,
    businessCardClosesAt: draft.registrationEnabled ? fromKoreaLocalInput(draft.businessCardClosesAt) : null,
    coverImageUrl: draft.coverImageUrl,
    banner: {
      enabled: draft.bannerEnabled,
      desktopImageUrl: draft.bannerDesktopImageUrl,
      mobileImageUrl: draft.bannerMobileImageUrl,
      alt: blankToNull(draft.bannerAlt),
      endsOn: blankToNull(draft.bannerEndsOn),
      order: Number.isFinite(order) ? order : 0,
    },
  };
}

/** 저장 전에 고칠 점. 서버도 같은 규칙으로 거절하지만 먼저 알려 준다. 문제가 없으면 null이다. */
export function eventDraftProblem(draft: EventDraft): string | null {
  if (!draft.title.trim()) return "제목을 입력해 주세요.";
  if (!draft.body.trim()) return "개요를 입력해 주세요.";
  if (draft.detailBody.length > 5000) return "상세 설명은 5000자 이내로 입력해 주세요.";
  if (draft.detailImageUrls.length > MAX_EVENT_DETAIL_IMAGES) return `상세 이미지는 ${MAX_EVENT_DETAIL_IMAGES}장까지 등록할 수 있어요.`;
  if (new Set(draft.detailImageUrls).size !== draft.detailImageUrls.length) return "같은 상세 이미지를 중복 등록할 수 없어요.";
  if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn) return "종료일은 시작일보다 앞설 수 없어요.";
  if (draft.applyUrl.trim() && !/^https?:\/\/\S+$/i.test(draft.applyUrl.trim())) {
    return "신청 링크는 http:// 또는 https://로 시작해야 해요.";
  }
  if (draft.registrationEnabled && draft.businessCardClosesAt && !fromKoreaLocalInput(draft.businessCardClosesAt)) {
    return "명함 제작 마감 시각을 확인해 주세요.";
  }
  if (draft.registrationEnabled && draft.registrationConfirmationEnabled) {
    if (!draft.registrationConfirmationMessage.trim()) return "신청 전 팝업 안내 내용을 입력해 주세요.";
    if (draft.registrationConfirmationMessage.length > 2000) return "신청 전 팝업 안내는 2000자 이내로 입력해 주세요.";
  }
  if (draft.bannerEnabled && (!draft.bannerDesktopImageUrl || !draft.bannerMobileImageUrl || !draft.bannerAlt.trim())) {
    return "배너를 노출하려면 PC·모바일 배너 이미지와 대체 문구가 모두 필요해요.";
  }
  const order = Number(draft.bannerOrder);
  if (!Number.isInteger(order) || order < 0 || order > 99) return "배너 순서는 0부터 99까지 적어 주세요.";
  return null;
}

/** 배너 이미지 비율이 칸과 크게 다르면 안내 문구를 준다. 막지는 않는다. */
export function bannerRatioWarning(slot: Exclude<EventImageSlot, "cover" | "detail">, width: number, height: number): string | null {
  if (width <= 0 || height <= 0) return null;
  const expected = BANNER_RATIOS[slot];
  const actual = width / height;
  if (Math.abs(actual - expected.ratio) / expected.ratio <= RATIO_TOLERANCE) return null;
  return `이 이미지는 ${width}×${height}(${actual.toFixed(2)}:1)이에요. ${expected.label} 칸에 맞춰 잘리니 가장자리 글자가 보이는지 확인해 주세요.`;
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
