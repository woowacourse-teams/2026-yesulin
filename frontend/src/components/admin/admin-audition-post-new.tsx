"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { AdminApiError, createAuditionPost } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminAuditionPostWrite } from "@/features/admin/types";
import { AuditionPostForm } from "./admin-audition-post-form";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionLink, AdminShell } from "./admin-shell";

/**
 * 업로드를 부탁한 업체의 공고처럼 원문이 없는 공고를 운영자가 직접 쓴다. 숨김으로 만들어지고, 만든 뒤에는 고치기 화면으로 넘어간다.
 */
export function AdminAuditionPostNew() {
  const router = useRouter();
  const [unauthorized, setUnauthorized] = useState(false);

  const create = useCallback(async (write: AdminAuditionPostWrite) => {
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
      description="업체에서 전달받은 공고를 작성해 주세요. 숨김으로 저장되며, 목록에서 내용을 확인한 뒤 공개할 수 있어요."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>목록으로</AdminActionLink>}
    >
      <AuditionPostForm post={null} submitLabel="숨김으로 만들기" onSubmit={create} />
    </AdminShell>
  );
}
