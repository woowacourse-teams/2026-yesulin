import { SiteIcon } from "@/components/ui/site-icon";
import type { EditableAuditionPost } from "@/features/audition-posts/editing";
import { formatFileSize } from "@/features/audition-posts/format";

/** 공개 상세와 관리자 미리보기에서 같은 본문·첨부·태그를 읽는다. */
export function AuditionPostContent({ post }: {
  readonly post: Pick<EditableAuditionPost, "bodyHtml" | "attachments" | "tags">;
}) {
  return (
    <>
      {post.attachments.length ? (
        <section aria-labelledby="post-attachments" className="border-t border-border-soft px-5 py-6 sm:px-8">
          <h2 id="post-attachments" className="text-base font-bold">첨부파일 <span className="num text-muted">{post.attachments.length}</span></h2>
          <ul className="mt-3 flex flex-col gap-2">
            {post.attachments.map((attachment) => (
              <li key={attachment.url}>
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className="flex min-h-12 items-center gap-3 rounded-control border border-border bg-surface px-4 py-2 text-sm hover:border-brand-line hover:bg-brand-soft"
                >
                  <SiteIcon name="download" size={18} className="text-muted" />
                  <span className="min-w-0 flex-1 break-all font-semibold">{attachment.name}</span>
                  <span className="num shrink-0 text-xs text-muted">{formatFileSize(attachment.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="post-body-heading" className="border-t border-border-soft px-5 py-6 sm:px-8 sm:py-8">
        <h2 id="post-body-heading" className="text-base font-bold">공고 본문</h2>
        <div
          className="post-body mt-4"
          // 서버가 허용 태그만 남기고 링크·사진 주소를 검사한 HTML이다.
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
      </section>

      {post.tags.length ? (
        <ul aria-label="태그" className="flex flex-wrap gap-2 border-t border-border-soft px-5 py-5 sm:px-8">
          {post.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted-strong">#{tag}</li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
