/** 공연 등록·수정 폼의 클라이언트 검증. 서버 `SaveShowRequest` 규칙과 같은 기준을 쓴다. */

import { MAX_SHOW_LINK_LABEL_LENGTH, MAX_SHOW_LINK_URL_LENGTH, type ShowGenre, type ShowLink } from "./types";

export type ShowFormValues = {
  readonly posterUrl: string;
  readonly title: string;
  readonly genre: ShowGenre | null;
  readonly runningMinutes: string;
  readonly inquiryPhone: string;
  readonly venueName: string;
  readonly roadAddress: string;
  readonly links: readonly ShowLink[];
};

/** 화면 위에서 아래 순서. 첫 오류 항목으로 포커스를 옮길 때 이 순서를 따른다. */
export const SHOW_FORM_FIELDS = ["poster", "title", "genre", "runningMinutes", "inquiryPhone", "venue", "links"] as const;

export type ShowFormField = (typeof SHOW_FORM_FIELDS)[number];
export type ShowFormErrors = Partial<Record<ShowFormField, string>>;

const MAX_RUNNING_MINUTES = 1440;
const INQUIRY_PHONE_PATTERN = /^\d{2,4}-\d{3,4}(-\d{4})?$/;

/** 지역번호·휴대폰과 1588 같은 대표번호를 입력 중에도 읽기 쉬운 형식으로 만든다. */
export function formatInquiryPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("1")) {
    const serviceNumber = digits.slice(0, 8);
    return serviceNumber.length <= 4 ? serviceNumber : `${serviceNumber.slice(0, 4)}-${serviceNumber.slice(4)}`;
  }
  const phone = digits.slice(0, digits.startsWith("02") ? 10 : 11);
  const prefixLength = phone.startsWith("02") ? 2 : 3;
  if (phone.length <= prefixLength) return phone;
  if (phone.length <= prefixLength + 4) return `${phone.slice(0, prefixLength)}-${phone.slice(prefixLength)}`;
  return `${phone.slice(0, prefixLength)}-${phone.slice(prefixLength, -4)}-${phone.slice(-4)}`;
}
const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function validateShowField(field: ShowFormField, values: ShowFormValues): string | null {
  switch (field) {
    case "poster":
      return values.posterUrl ? null : "포스터를 등록해 주세요.";
    case "title":
      return values.title.trim() ? null : "공연명을 입력해 주세요.";
    case "genre":
      return values.genre ? null : "장르를 선택해 주세요.";
    case "runningMinutes": {
      const minutes = Number(values.runningMinutes);
      const valid = values.runningMinutes.trim() !== "" && Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_RUNNING_MINUTES;
      return valid ? null : `공연 시간은 1분 이상 ${MAX_RUNNING_MINUTES}분 이하로 입력해 주세요.`;
    }
    case "inquiryPhone": {
      const phone = values.inquiryPhone.trim();
      if (!phone) return "취소·단체 문의 전화번호를 입력해 주세요.";
      return INQUIRY_PHONE_PATTERN.test(phone) ? null : "문의 전화번호를 02-123-4567 형식으로 입력해 주세요.";
    }
    case "venue":
      if (!values.venueName.trim()) return "공연 장소명을 입력해 주세요.";
      return values.roadAddress.trim() ? null : "주소 검색으로 공연장 주소를 입력해 주세요.";
    case "links": {
      const index = values.links.findIndex((link) => showLinkError(link));
      return index < 0 ? null : `안내 링크 ${index + 1}: ${showLinkError(values.links[index]!)}`;
    }
  }
}

/** 잘못된 항목을 한 번에 모은다. 모두 올바르면 빈 객체다. */
export function validateShowForm(values: ShowFormValues): ShowFormErrors {
  const errors: ShowFormErrors = {};
  for (const field of SHOW_FORM_FIELDS) {
    const message = validateShowField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

export function showLinkLabelError(label: string): string | null {
  const value = label.trim();
  if (!value) return "버튼 이름을 입력해 주세요.";
  return value.length > MAX_SHOW_LINK_LABEL_LENGTH ? `버튼 이름은 ${MAX_SHOW_LINK_LABEL_LENGTH}자 이내로 입력해 주세요.` : null;
}

/** 서버 `ShowLink`와 같이 http/https이고 도메인에 점이 있는 주소만 받는다. 공백이 있으면 서버가 거절하므로 막는다. */
export function showLinkUrlError(url: string): string | null {
  const value = url.trim();
  if (!value) return "링크 주소를 입력해 주세요.";
  if (value.length > MAX_SHOW_LINK_URL_LENGTH) return `링크 주소는 ${MAX_SHOW_LINK_URL_LENGTH}자 이내로 입력해 주세요.`;
  return isWebAddress(value) ? null : "https://로 시작하는 올바른 주소를 입력해 주세요.";
}

export function showLinkError(link: ShowLink): string | null {
  return showLinkLabelError(link.label) ?? showLinkUrlError(link.url);
}

/**
 * 운영자가 `instagram.com/...`처럼 scheme 없이 붙여넣은 주소에 https://를 붙이고, 한글 경로·도메인은
 * 브라우저 표준 형식(퍼센트 인코딩, punycode)으로 바꾼다. 올바르지 않은 주소는 입력한 그대로 둬 검증에서 걸리게 한다.
 */
export function normalizeShowLinkUrl(url: string): string {
  const value = url.trim();
  if (!value) return "";
  const withScheme = URL_SCHEME_PATTERN.test(value) ? value : `https://${value}`;
  return isWebAddress(withScheme) ? new URL(withScheme).href : value;
}

function isWebAddress(value: string) {
  if (/\s/.test(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname;
    return (url.protocol === "https:" || url.protocol === "http:")
      && host.includes(".") && !host.startsWith(".") && !host.endsWith(".");
  } catch {
    return false;
  }
}
