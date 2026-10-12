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
      title="공고 직접 쓰기"
      description="원문 없이 공고를 써요. 숨김으로 만들어지고, 목록에서 '보여주기'를 누르면 공개돼요. 숨기면 공고 주소는 '찾을 수 없는 공고'로 보여요."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>목록으로</AdminActionLink>}
    >
      <AuditionPostForm post={null} submitLabel="숨김으로 만들기" onSubmit={create} />
    </AdminShell>
  );
}
