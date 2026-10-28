import { request } from "@/features/auditions/api-client";
import { actorPageApiPaths, type PublicActorPage, type PublicActorPageList } from "./types";

export function getActorPages(page: number): Promise<PublicActorPageList> {
  return request<PublicActorPageList>(actorPageApiPaths.list(page));
}

export function getActorPage(handle: string): Promise<PublicActorPage> {
  return request<PublicActorPage>(actorPageApiPaths.detail(handle));
}
