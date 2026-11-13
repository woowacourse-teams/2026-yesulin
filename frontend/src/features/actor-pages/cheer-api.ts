import { request } from "@/features/auditions/api-client";

export const ACTOR_CHEER_MAX_LENGTH = 500;

/** 작성 회원은 내려오지 않고, 그 배우 페이지에서 처음 응원한 순서대로 매긴 팬 번호만 있다. */
export type ActorPageCheer = {
  readonly id: number;
  readonly fanNumber: number;
  readonly body: string;
  readonly mine: boolean;
  readonly createdAt: string;
  readonly edited: boolean;
};

export type ActorPageCheers = {
  /** 지우지 않은 응원 글 수. */
  readonly totalCount: number;
  /** 최신 글부터. */
  readonly cheers: readonly ActorPageCheer[];
  /** 더 오래된 글이 있으면 다음 요청의 `before`로 쓴다. */
  readonly nextBefore: number | null;
  readonly me: {
    readonly loggedIn: boolean;
    readonly owner: boolean;
    /** 활성 일반 회원이고 주인이 아니라 쓸 수 있다. */
    readonly canWrite: boolean;
  };
};

const cheersPath = (publicId: string) => `/v1/actor-pages/${encodeURIComponent(publicId)}/cheers`;

/** 공개 화면에서 읽는다. 세션이 끝났어도 로그인 화면으로 보내지 않고 로그인하지 않은 상태로 받는다. */
export const getActorPageCheers = (publicId: string, before: number | null = null) =>
  request<ActorPageCheers>(
    `/v1/public/actor-pages/${encodeURIComponent(publicId)}/cheers${before === null ? "" : `?before=${before}`}`,
  );

export const writeActorPageCheer = (publicId: string, body: string) =>
  request<ActorPageCheer>(cheersPath(publicId), { method: "POST", body: JSON.stringify({ body }) });

export const editActorPageCheer = (publicId: string, cheerId: number, body: string) =>
  request<ActorPageCheer>(`${cheersPath(publicId)}/${cheerId}`, { method: "PATCH", body: JSON.stringify({ body }) });

export const deleteActorPageCheer = (publicId: string, cheerId: number) =>
  request<void>(`${cheersPath(publicId)}/${cheerId}`, { method: "DELETE" });
