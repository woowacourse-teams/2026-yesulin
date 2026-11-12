import { delay, http, HttpResponse } from "msw";
import type { ActorPageLikes } from "@/features/actor-pages/like-api";
import { mockCurrentSession } from "./auth-handlers";

/**
 * 배우 페이지 좋아요 목. 고정 배우에는 시드 수를 두고, 목 세션이 누른 페이지만 기억한다. 서버처럼 로그인하지 않았으면 401,
 * 배우 계정이 아니면 403, 내 페이지에는 403으로 답하고 목록에 없는 페이지는 404다.
 */
const likedByMock = new Set<string>();

type ListedPage = { readonly publicId: string };

function seedCount(publicId: string): number {
  return [...publicId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 40;
}

function likesOf(publicId: string, isOwner: boolean): ActorPageLikes {
  const session = mockCurrentSession();
  const applicant = session?.role === "APPLICANT" && session.status === "ACTIVE";
  const canLike = applicant && !isOwner;
  return {
    count: seedCount(publicId) + (likedByMock.has(publicId) ? 1 : 0),
    viewer: { loggedIn: session !== null, owner: applicant && isOwner, canLike, liked: canLike && likedByMock.has(publicId) },
  };
}

const notFound = () => HttpResponse.json({ code: "ACTOR_PAGE_NOT_FOUND", message: "배우 페이지를 찾을 수 없습니다." }, { status: 404 });

/** @param isListed 목록에 보이는 페이지인지, `ownerPublicId`는 목 배우 본인의 공개 페이지 ID다. */
export function actorPageLikeHandlers(
  findListed: (publicId: string) => ListedPage | undefined,
  ownerPublicId: () => string | null,
) {
  const write = (liked: boolean) => async ({ params }: { params: Record<string, string | readonly string[] | undefined> }) => {
    await delay(120);
    const publicId = String(params.publicId);
    const session = mockCurrentSession();
    if (!session) return HttpResponse.json({ code: "AUTH_UNAUTHENTICATED", message: "로그인이 필요합니다." }, { status: 401 });
    if (session.role !== "APPLICANT" || session.status !== "ACTIVE") {
      return HttpResponse.json({ code: "AUTH_FORBIDDEN", message: "배우 계정으로 참여해 주세요." }, { status: 403 });
    }
    if (!findListed(publicId)) return notFound();
    const isOwner = ownerPublicId() === publicId;
    if (liked && isOwner) {
      return HttpResponse.json({ code: "ACTOR_PAGE_SELF_LIKE", message: "내 배우 페이지에는 좋아요를 누를 수 없어요." }, { status: 403 });
    }
    if (liked) likedByMock.add(publicId);
    else likedByMock.delete(publicId);
    return HttpResponse.json(likesOf(publicId, isOwner));
  };

  return [
    http.get("/api/v1/public/actor-pages/:publicId/likes", async ({ params }) => {
      await delay(100);
      const publicId = String(params.publicId);
      if (!findListed(publicId)) return notFound();
      return HttpResponse.json(likesOf(publicId, ownerPublicId() === publicId));
    }),
    http.put("/api/v1/actor-pages/:publicId/likes", write(true)),
    http.delete("/api/v1/actor-pages/:publicId/likes", write(false)),
  ];
}
