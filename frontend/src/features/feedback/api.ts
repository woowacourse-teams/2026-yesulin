import { request } from "@/features/auditions/api-client";
import { feedbackApiPath, type FeedbackInput } from "./types";

/** 지금 화면 경로와 함께 의견을 보낸다. 쿼리·해시는 서버에서도 버리지만 처음부터 보내지 않는다. */
export function submitFeedback(input: FeedbackInput): Promise<{ readonly id: number }> {
  return request(feedbackApiPath, { method: "POST", body: JSON.stringify({ ...input, pagePath: pathOnly(input.pagePath) }) });
}

export function pathOnly(path: string): string {
  return path.split(/[?#]/, 1)[0];
}
