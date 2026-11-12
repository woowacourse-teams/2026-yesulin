import { request } from "@/features/auditions/api-client";

/** 로그인하지 않았으면 viewer는 모두 false다. */
export type ActorPageLikes = {
  readonly count: number;
  readonly viewer: {
    readonly loggedIn: boolean;
    /** 이 배우 페이지의 주인이다. */
    readonly owner: boolean;
    /** 활성 배우 계정이고 주인이 아니라 누를 수 있다. */
    readonly canLike: boolean;
    readonly liked: boolean;
  };
};

const likesPath = (publicId: string) => `/v1/actor-pages/${encodeURIComponent(publicId)}/likes`;

/** 공개 화면에서 읽는다. 세션이 끝났어도 로그인 화면으로 보내지 않고 로그인하지 않은 상태로 받는다. */
export const getActorPageLikes = (publicId: string) =>
  request<ActorPageLikes>(`/v1/public/actor-pages/${encodeURIComponent(publicId)}/likes`);

/** 같은 요청을 반복해도 결과가 같다. */
export const likeActorPage = (publicId: string) => request<ActorPageLikes>(likesPath(publicId), { method: "PUT" });

export const unlikeActorPage = (publicId: string) => request<ActorPageLikes>(likesPath(publicId), { method: "DELETE" });
