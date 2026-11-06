export const FEEDBACK_TYPES = [
  { value: "INCONVENIENCE", label: "불편해요" },
  { value: "BUG", label: "오류예요" },
  { value: "SUGGESTION", label: "제안해요" },
] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number]["value"];

export const FEEDBACK_CONTENT_MAX = 1000;
export const FEEDBACK_CONTACT_MAX = 100;
export const FEEDBACK_IMAGE_MAX = 3;
/** 서버 상한과 같다. 화면은 사진을 긴 변 1600px JPEG로 줄여 보내므로 보통 1MB를 넘지 않는다. */
export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export type FeedbackInput = {
  readonly type: FeedbackType;
  readonly content: string;
  readonly contact: string;
  readonly pagePath: string;
  readonly images: readonly Blob[];
};

export const feedbackApiPath = "/v1/public/feedback";
