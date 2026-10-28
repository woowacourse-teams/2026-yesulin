import { producerRequest, request } from "@/features/auditions/api-client";
import { ACTOR_LIST_PAGE_SIZE, type PublicActorPageList } from "./types";

/** 공연사 관심 배우 목록. 카드는 배우 목록과 같고, 숨겨진 저장도 한도에 포함한다. */
export type ActorBookmarkList = PublicActorPageList & {
  /** 숨겨진 저장도 포함한 전체 저장 수. */
  readonly savedCount: number;
  /** 배우가 비공개가 되거나 잠겨 목록에 보이지 않는 저장 수. */
  readonly hiddenCount: number;
  readonly limit: number;
};

const BASE_PATH = "/v1/producers/me";

export const actorBookmarkRoutes = {
  /** 목록 주소의 page는 1부터 센다. 첫 페이지는 쿼리를 붙이지 않는다. */
  list: (page = 0) => page > 0 ? `/producers/actor-bookmarks?page=${page + 1}` : "/producers/actor-bookmarks",
} as const;

/** 공연사 대시보드에서 읽는다. 세션이 끝났으면 로그인 화면으로 보낸다. */
export const getActorBookmarks = (page: number) =>
  producerRequest<ActorBookmarkList>(`${BASE_PATH}/actor-bookmarks?page=${page}&size=${ACTOR_LIST_PAGE_SIZE}`);

/**
 * 공개 화면의 저장 버튼용. 공개 화면에서는 세션이 끝나도 로그인 화면으로 보내지 않고 저장하지 않은 것으로 그린다.
 * 숨겨진 저장도 포함한다.
 */
export const getActorBookmarkIds = () =>
  request<{ readonly publicIds: readonly string[] }>(`${BASE_PATH}/actor-bookmark-ids`);

/** 같은 요청을 반복해도 결과가 같다. */
export const saveActorBookmark = (publicId: string) =>
  request<void>(`${BASE_PATH}/actor-bookmarks/${encodeURIComponent(publicId)}`, { method: "PUT" });

export const removeActorBookmark = (publicId: string) =>
  request<void>(`${BASE_PATH}/actor-bookmarks/${encodeURIComponent(publicId)}`, { method: "DELETE" });
