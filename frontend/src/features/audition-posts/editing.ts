/**
 * 운영자와 기획사가 같은 작성 폼으로 공고를 쓰고 고친다. 백엔드 `AuditionPostEditResult`·작성 요청과 같은 모양이다.
 */
export type AuditionPostFileKind = "IMAGE" | "ATTACHMENT";

export type EditableAuditionPostStatus = "PUBLISHED" | "HIDDEN";

export type EditableAuditionPostAttachment = {
  readonly name: string;
  readonly contentType: string;
  readonly size: number;
  /** 공개 저장소 주소. 고칠 때 남길 첨부를 이 주소로 알린다. */
  readonly url: string;
};

/** 수정 화면에 채울 공고. 운영자 `/api/v1/admin/audition-posts/{id}`와 기획사 `/api/v1/producers/me/audition-posts/{id}` 응답이 같다. */
export type EditableAuditionPost = {
  readonly id: number;
  /** 원문 출처. 직접 쓰거나 기획사가 올린 공고는 `YESULIN`이다. */
  readonly source: string;
  readonly externalId: string | null;
  readonly sourceUrl: string | null;
  readonly status: EditableAuditionPostStatus;
  readonly category: string;
  readonly title: string;
  readonly pay: string;
  readonly deadlineText: string;
  /** 저장된 작성자(원문 닉네임이나 운영자가 쓴 이름). 기획사에 연결된 공고는 화면에 `owner.companyName`이 보인다. */
  readonly authorName: string;
  /** 사진 자리를 공개 주소로 채운 본문. 편집기가 그대로 보여 준다. */
  readonly bodyHtml: string;
  readonly tags: readonly string[];
  readonly attachments: readonly EditableAuditionPostAttachment[];
  readonly editedAt: string | null;
  readonly updatedAt: string;
  /** 이 공고를 고칠 수 있는 기획사. 연결되지 않았으면 null. 기획사 정보가 없어졌으면 이름이 null이다. */
  readonly owner: { readonly memberId: number; readonly companyName: string | null } | null;
};

export type AuditionPostWrite = {
  readonly category: string;
  readonly title: string;
  readonly pay: string;
  readonly deadlineText: string;
  /** 운영자만 정한다. 기획사 공고의 작성자는 서버가 기획사 이름으로 정한다. */
  readonly authorName: string;
  /** 고칠 때 본문을 건드리지 않았으면 null. 서버가 원래 본문과 사진을 그대로 둔다. */
  readonly bodyHtml: string | null;
  readonly tags: readonly string[];
  /** 남기거나 새로 올린 첨부의 주소. 빠진 첨부는 서버가 지운다. */
  readonly attachmentUrls: readonly string[];
};

/** 브라우저가 공고 사진·첨부를 저장소로 바로 올릴 주소. */
export type AuditionPostUpload = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly expiresAt: string;
  /** 올린 뒤 본문 사진 주소나 첨부 주소로 쓴다. 저장할 때 서버가 이 주소로 업로드를 확정한다. */
  readonly publicUrl: string;
};

/** 사진·첨부를 저장소에 올리고 공개 주소를 돌려준다. 운영자와 기획사가 서로 다른 발급 주소를 쓴다. */
export type UploadAuditionPostFile = (kind: AuditionPostFileKind, file: File) => Promise<string>;

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
