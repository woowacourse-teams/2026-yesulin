export const FEEDBACK_TYPES = [
  { value: "INCONVENIENCE", label: "불편해요" },
  { value: "BUG", label: "오류예요" },
  { value: "SUGGESTION", label: "제안해요" },
] as const;

export type FeedbackType = typeof FEEDBACK_TYPES[number]["value"];

export const FEEDBACK_CONTENT_MAX = 1000;
export const FEEDBACK_CONTACT_MAX = 100;

export type FeedbackInput = {
  readonly type: FeedbackType;
  readonly content: string;
  readonly contact: string;
  readonly pagePath: string;
};

export const feedbackApiPath = "/v1/public/feedback";
