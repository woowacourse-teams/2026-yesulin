/** 공연 등록·수정 폼의 클라이언트 검증. 서버 `SaveShowRequest` 규칙과 같은 기준을 쓴다. */

import type { ShowGenre } from "./types";

export type ShowFormValues = {
  readonly posterUrl: string;
  readonly title: string;
  readonly genre: ShowGenre | null;
  readonly runningMinutes: string;
  readonly inquiryPhone: string;
  readonly venueName: string;
  readonly roadAddress: string;
};

/** 화면 위에서 아래 순서. 첫 오류 항목으로 포커스를 옮길 때 이 순서를 따른다. */
export const SHOW_FORM_FIELDS = ["poster", "title", "genre", "runningMinutes", "inquiryPhone", "venue"] as const;

export type ShowFormField = (typeof SHOW_FORM_FIELDS)[number];
export type ShowFormErrors = Partial<Record<ShowFormField, string>>;

const MAX_RUNNING_MINUTES = 1440;
const INQUIRY_PHONE_PATTERN = /^\d{2,4}-\d{3,4}(-\d{4})?$/;

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
