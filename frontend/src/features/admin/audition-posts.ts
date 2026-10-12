/**
 * 운영자가 붙여 넣은 값에서 OTR 공고 번호를 꺼낸다. 번호만 넣거나 `https://otr.co.kr/audition/?vid=22397`처럼
 * 원문 주소를 그대로 붙여 넣어도 된다. 번호를 찾지 못하면 null이다.
 */
export function extractOtrId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[0-9]{1,30}$/.test(trimmed)) return trimmed;
  const match = /[?&]vid=([0-9]{1,30})(?:&|#|$)/.exec(trimmed);
  return match ? match[1] : null;
}

export const adminAuditionPostRoutes = {
  list: "/admin/posts",
  create: "/admin/posts/new",
  edit: (postId: number | string) => `/admin/posts/${encodeURIComponent(String(postId))}/edit`,
} as const;

/** 쉼표로 구분한 태그 입력을 서버가 받는 목록으로 바꾼다. 앞의 `#`, 빈 값과 중복은 뺀다. */
export function parseTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim().replace(/^#+/, "").trim()).filter(Boolean))];
}

/** 서버 `AuditionPostFileRules`와 같은 기준. 올리기 전에 먼저 걸러 바로 알려 준다. */
export const AUDITION_POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
export const AUDITION_POST_ATTACHMENT_EXTENSIONS = [
  "pdf", "doc", "docx", "hwp", "hwpx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "jpg", "jpeg", "png", "mp3", "m4a", "wav",
] as const;
const MAX_IMAGE_MB = 20;
const MAX_ATTACHMENT_MB = 50;

/** 공고 사진·첨부로 올릴 수 없는 파일이면 이유를, 올릴 수 있으면 null을 돌려준다. */
export function checkAuditionPostFile(
  kind: "IMAGE" | "ATTACHMENT",
  file: { readonly name: string; readonly type: string; readonly size: number },
): string | null {
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase() : "";
  if (kind === "IMAGE") {
    const supported = AUDITION_POST_IMAGE_TYPES.some((type) => type === file.type.toLowerCase())
      || IMAGE_EXTENSIONS.includes(extension);
    if (!supported) return "사진은 JPEG·PNG·GIF·WebP만 올릴 수 있어요.";
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) return `사진은 ${MAX_IMAGE_MB}MB까지 올릴 수 있어요.`;
  } else {
    if (!AUDITION_POST_ATTACHMENT_EXTENSIONS.some((allowed) => allowed === extension)) {
      return "첨부는 한글·워드·PDF·엑셀·파워포인트·압축·음원 파일만 올릴 수 있어요.";
    }
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) return `첨부는 ${MAX_ATTACHMENT_MB}MB까지 올릴 수 있어요.`;
  }
  if (file.size === 0) return "빈 파일은 올릴 수 없어요.";
  return null;
}
