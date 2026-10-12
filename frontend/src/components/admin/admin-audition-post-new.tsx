"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AuditionPostForm } from "@/components/audition-posts/editor/audition-post-form";
import { AdminApiError, createAuditionPost, uploadAuditionPostFile } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AuditionPostWrite } from "@/features/audition-posts/editing";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionLink, AdminShell } from "./admin-shell";

/**
 * 업로드를 부탁한 업체의 공고처럼 원문이 없는 공고를 운영자가 직접 쓴다. 검토 전으로 만들어지고, 만든 뒤에는 고치기 화면으로
 * 넘어가 업체 계정을 연결할 수 있다.
 */
export function AdminAuditionPostNew() {
  const router = useRouter();
  const [unauthorized, setUnauthorized] = useState(false);

  const create = useCallback(async (write: AuditionPostWrite) => {
    try {
      const created = await createAuditionPost(write);
      router.replace(`${adminAuditionPostRoutes.edit(created.id)}?created=1`);
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        setUnauthorized(true);
        return;
      }
      throw cause;
    }
  }, [router]);

  if (unauthorized) return <AdminSessionEnded />;

  return (
    <AdminShell
      current="posts"
      layout="form"
      title="공고 작성"
      description="업체에서 전달받은 공고를 작성해 주세요. 검토 전으로 저장되며, 목록에서 내용을 확인한 뒤 공개할 수 있어요."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>목록으로</AdminActionLink>}
    >
      <AuditionPostForm
        post={null}
        submitLabel="검토 전으로 만들기"
        createHint="제목과 분류를 넣으면 검토 전으로 만들 수 있어요."
        uploadFile={uploadAuditionPostFile}
        onSubmit={create}
      />
    </AdminShell>
  );
}
