import { request } from "@/features/auditions/api-client";
import { feedbackApiPath, type FeedbackInput } from "./types";

/** 지금 화면 경로와 함께 의견을 보낸다. 쿼리·해시는 서버에서도 버리지만 처음부터 보내지 않는다. 사진은 multipart로 붙인다. */
export function submitFeedback(input: FeedbackInput): Promise<{ readonly id: number }> {
  const { images, ...fields } = input;
  const body = new FormData();
  body.append("request", new Blob([JSON.stringify({ ...fields, pagePath: pathOnly(fields.pagePath) })], { type: "application/json" }));
  images.forEach((image, index) => body.append("images", image, `feedback-${index + 1}.jpg`));
  return request(feedbackApiPath, { method: "POST", body });
}

export function pathOnly(path: string): string {
  return path.split(/[?#]/, 1)[0];
}
