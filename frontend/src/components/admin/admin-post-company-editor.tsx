"use client";

import { useEffect, useState } from "react";
import { AdminApiError, fetchPostCompany, savePostCompany } from "@/features/admin/api";
import type { AdminCompany, AdminPostCompanyProfile } from "@/features/admin/types";
import { AdminActionButton } from "./admin-shell";
import { draftOf, emptyDraft } from "@/features/companies/profile-draft";
import { CompanyForm } from "./admin-companies";

/**
 * 공고 목록에서 그 공고를 올린 공연사의 정보를 바로 쓴다. 공고에 연결된 공연사가 없으면 같은 OTR 작성자로 이전에 쓴 정보를
 * 불러오고, 그것도 없으면 원문 작성자 이름으로 새로 쓴다. 운영자가 직접 쓴 정보이므로 저장하면 바로 공개되고, 같은 OTR 작성자의
 * 다른 공고와 이후 가져오는 공고에도 같은 정보가 연결된다. 내리기는 공연사 탭에서 한다.
 */
export function AdminPostCompanyEditor({ postId, onSaved, onCancel, onUnauthorized }: {
  readonly postId: number;
  readonly onSaved: (company: AdminCompany) => void;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [profile, setProfile] = useState<AdminPostCompanyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPostCompany(postId)
      .then((next) => { if (active) setProfile(next); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          onUnauthorized();
          return;
        }
        setError(cause instanceof Error ? cause.message : "공연사 정보를 불러오지 못했습니다.");
      });
    return () => { active = false; };
  }, [postId, onUnauthorized]);

  if (!profile) {
    return (
      <div className="mt-4 border-t border-border-soft pt-4 text-sm">
        {error ? (
          <p role="alert" className="flex flex-wrap items-center gap-2 text-fail">{error} <AdminActionButton onClick={onCancel}>닫기</AdminActionButton></p>
        ) : <p role="status" className="text-muted">공연사 정보를 불러오는 중이에요.</p>}
      </div>
    );
  }

  const initial = profile.company ? draftOf(profile.company) : emptyDraft(profile.suggestedName);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-border-soft pt-4">
      <p className="text-sm text-muted-strong">
        {profile.sharedByAuthor
          ? "같은 OTR 작성자로 이전에 쓴 공연사 정보를 불러왔어요. 저장하면 이 공고에도 연결돼요."
          : profile.company
            ? "이 공고에 연결된 공연사 정보예요."
            : "아직 공연사 정보가 없어요. 원문 작성자 이름을 미리 넣어 두었어요."}
        {" "}저장하면 바로 공개돼요.
        {profile.sourceAuthorId ? " 같은 OTR 작성자의 다른 공고와 앞으로 가져오는 공고에도 이 정보가 쓰여요." : null}
      </p>
      <CompanyForm
        initial={initial}
        submitLabel="저장하고 공개"
        onCancel={onCancel}
        onUnauthorized={onUnauthorized}
        onSave={async (write) => onSaved(await savePostCompany(postId, write, true))}
      />
    </div>
  );
}
