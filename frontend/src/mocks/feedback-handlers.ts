import { http, HttpResponse } from "msw";

let nextId = 1;

/** 의견 보내기 목 응답. 내용이 비면 실제 API처럼 400을 돌려준다. */
export const feedbackHandlers = [
  http.post("/api/v1/public/feedback", async ({ request }) => {
    const body = (await request.json()) as { type?: string; content?: string; contact?: string };
    const content = body.content?.trim() ?? "";
    if (!body.type || !content || content.length > 1000 || (body.contact?.length ?? 0) > 100) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "의견 내용을 확인해 주세요." }, { status: 400 });
    }
    return HttpResponse.json({ id: nextId++ }, { status: 201 });
  }),
];
