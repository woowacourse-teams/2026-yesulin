import { request } from "@/features/auditions/api-client";
import { actorPageApiPaths, type PublicActorPage, type PublicActorPageList } from "./types";

export function getActorPages(page: number, keyword = ""): Promise<PublicActorPageList> {
  return request<PublicActorPageList>(actorPageApiPaths.list(page, undefined, keyword));
}

export function getActorPage(handle: string): Promise<PublicActorPage> {
  return request<PublicActorPage>(actorPageApiPaths.detail(handle));
}
