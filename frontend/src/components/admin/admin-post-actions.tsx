"use client";

import { MoreMenu, type MoreMenuItem } from "@/components/ui/more-menu";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminAuditionPost } from "@/features/admin/types";
import { auditionPostRoutes } from "@/features/audition-posts/types";

/** 공고 카드의 자주 쓰지 않는 작업. 공개 화면은 열면 조회수에 들어가므로 제목 대신 여기서 연다. */
export function AdminPostActions({ post, importing, onCompany, onImport }: {
  readonly post: AdminAuditionPost;
  readonly importing: string | null;
  readonly onCompany: () => void;
  readonly onImport: (otrId: string) => void;
}) {
  const { externalId, sourceUrl } = post;
  const items: MoreMenuItem[] = [
    { label: "공고 수정", href: adminAuditionPostRoutes.edit(post.id) },
    { label: post.companyId === null ? "공연사 정보 쓰기" : "공연사 정보 수정", onSelect: onCompany },
  ];
  if (post.status === "PUBLISHED") items.push({ label: "공개 화면 보기", href: auditionPostRoutes.detail(post.id), external: true });
  if (sourceUrl) items.push({ label: "원문 보기", href: sourceUrl, external: true });
  if (sourceUrl && externalId) {
    items.push({
      label: importing === externalId ? "다시 가져오는 중…" : "원문으로 다시 가져오기",
      disabled: importing !== null,
      onSelect: () => onImport(externalId),
    });
  }
  return <MoreMenu label={`${post.title} 더보기`} items={items} />;
}
