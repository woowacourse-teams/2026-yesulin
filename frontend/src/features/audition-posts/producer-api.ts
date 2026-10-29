import { trackProductEvent } from "@/features/analytics/product-analytics";
import { producerRequest as request } from "@/features/auditions/api-client";
import { safeUpload } from "@/features/files/safe-upload";
import { reportUploadDiagnostic } from "@/features/files/upload-diagnostics";
import type {
  AuditionPostFileKind,
  AuditionPostUpload,
  AuditionPostWrite,
  EditableAuditionPost,
  EditableAuditionPostStatus,
} from "./editing";

/** 이메일 인증을 마친 기획사가 자기 공고만 다룬다. 올린 공고는 바로 공개된다. */
const POSTS_PATH = "/v1/producers/me/audition-posts";

const postPath = (postId: string) => `${POSTS_PATH}/${encodeURIComponent(postId)}`;

/** 기획사 내 공고 목록의 한 줄. 백엔드 `ProducerAuditionPostResult`와 같다. 운영자가 숨긴 공고도 함께 온다. */
export type ProducerAuditionPost = {
  readonly id: number;
  readonly category: string;
  readonly title: string;
  readonly deadlineText: string;
  readonly closed: boolean;
  readonly status: EditableAuditionPostStatus;
  readonly viewCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export async function fetchMyAuditionPosts(): Promise<readonly ProducerAuditionPost[]> {
  const response = await request<{ readonly posts: readonly ProducerAuditionPost[] }>(POSTS_PATH);
  return response.posts;
}

export function fetchMyAuditionPost(postId: string): Promise<EditableAuditionPost> {
  return request<EditableAuditionPost>(postPath(postId));
}

export async function publishAuditionPost(write: AuditionPostWrite): Promise<ProducerAuditionPost> {
  const post = await request<ProducerAuditionPost>(POSTS_PATH, { method: "POST", body: JSON.stringify(toBody(write)) });
  void trackProductEvent("producer_post_published", { post_id: String(post.id) });
  return post;
}

export function updateMyAuditionPost(postId: string, write: AuditionPostWrite): Promise<ProducerAuditionPost> {
  return request<ProducerAuditionPost>(postPath(postId), { method: "PUT", body: JSON.stringify(toBody(write)) });
}

/**
 * 공고 사진·첨부를 저장소로 바로 올리고 공개 주소를 돌려준다. 공고를 저장할 때 서버가 이 주소로 업로드를 확정하므로
 * 별도 완료 요청은 없다. 메모리 복사와 재시도는 다른 업로드와 같은 방식을 쓴다.
 */
export async function uploadMyAuditionPostFile(kind: AuditionPostFileKind, file: File): Promise<string> {
  let publicUrl = "";
  await safeUpload({
    flow: "AUDITION_POST_FILE",
    source: file,
    originalFilename: file.name,
    requestUpload: async (metadata, { incidentId }) => {
      const upload = await request<AuditionPostUpload>(`${POSTS_PATH}/uploads`, {
        method: "POST",
        headers: { "X-Request-Id": incidentId },
        body: JSON.stringify({ kind, filename: metadata.originalFilename, contentType: metadata.contentType, size: metadata.size }),
      });
      publicUrl = upload.publicUrl;
      // 공고 파일은 파일 ID 대신 공개 주소로 확정하므로 fileId는 쓰지 않는다.
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
    reportDiagnostic: reportUploadDiagnostic,
  });
  return publicUrl;
}

/** 작성자는 서버가 기획사 이름으로 정하므로 보내지 않는다. */
function toBody(write: AuditionPostWrite) {
  return {
    category: write.category,
    title: write.title,
    pay: write.pay,
    deadlineText: write.deadlineText,
    bodyHtml: write.bodyHtml,
    tags: write.tags,
    attachmentUrls: write.attachmentUrls,
  };
}
