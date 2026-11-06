import { http, HttpResponse } from "msw";
import type { AdminFeedbackItem } from "@/features/admin/types";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PAGE_SIZE = 20;
const received: AdminFeedbackItem[] = [];
let nextId = 1;

type FeedbackFields = { type?: string; content?: string; contact?: string; pagePath?: string };

/** 의견 보내기 목 응답. 사진은 multipart로 받고, 내용·사진이 맞지 않으면 실제 API처럼 400을 돌려준다. */
export const feedbackHandlers = [
  http.post("/api/v1/public/feedback", async ({ request }) => {
    const { fields, images } = await readFeedback(request);
    const content = fields.content?.trim() ?? "";
    if (!fields.type || !content || content.length > 1000 || (fields.contact?.length ?? 0) > 100) {
      return HttpResponse.json({ code: "INVALID_REQUEST", message: "의견 내용을 확인해 주세요." }, { status: 400 });
    }
    if (!validImages(images)) {
      return HttpResponse.json({ code: "FEEDBACK_INVALID_IMAGE", message: "사진은 JPG·PNG·WebP로 한 장 5MB, 최대 3장까지 보낼 수 있어요." }, { status: 400 });
    }
    const id = nextId++;
    received.unshift(toItem(id, fields, content, images));
    return HttpResponse.json({ id }, { status: 201 });
  }),
  http.get("/api/v1/admin/feedback", ({ request }) => {
    const before = Number(new URL(request.url).searchParams.get("before") ?? Number.MAX_SAFE_INTEGER);
    const older = received.filter(item => item.id < before);
    return HttpResponse.json({ items: older.slice(0, PAGE_SIZE), hasNext: older.length > PAGE_SIZE }, { headers: { "Cache-Control": "no-store" } });
  }),
];

async function readFeedback(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("multipart/")) return { fields: await request.json() as FeedbackFields, images: [] as File[] };
  const form = await request.formData();
  const part = form.get("request");
  const fields = JSON.parse(await textOf(part)) as FeedbackFields;
  const images = form.getAll("images").filter((value): value is File => value instanceof File);
  return { fields, images };
}

async function textOf(part: FormDataEntryValue | null) {
  if (part instanceof Blob) return part.text();
  return part ?? "{}";
}

function validImages(images: readonly File[]) {
  return images.length <= 3 && images.every(image => IMAGE_TYPES.has(image.type) && image.size > 0 && image.size <= 5 * 1024 * 1024);
}

function toItem(id: number, fields: FeedbackFields, content: string, images: readonly File[]): AdminFeedbackItem {
  return {
    id, type: fields.type as AdminFeedbackItem["type"], content, contact: fields.contact?.trim() ?? "",
    pagePath: fields.pagePath ?? "", memberId: null, userAgent: navigator.userAgent.slice(0, 300),
    createdAt: new Date().toISOString(), imageUrls: images.map(image => URL.createObjectURL(image)),
  };
}
