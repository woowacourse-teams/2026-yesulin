import type { Metadata } from "next";
import { ActorListRoute } from "@/components/actor-pages/actor-list";
import { actorPagesForServer } from "@/features/actor-pages/server";
import { actorPageRoutes, parseActorListPage } from "@/features/actor-pages/types";
import { socialMetadata } from "@/features/seo/audition-metadata";

export const dynamic = "force-dynamic";

const DESCRIPTION = "예술in에 프로필 페이지를 공개한 배우들을 만나 보세요.";

type Props = { readonly searchParams: Promise<{ page?: string | string[] }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const page = parseActorListPage((await searchParams).page);
  const title = page > 0 ? `배우 · ${page + 1}페이지` : "배우";
  const canonical = actorPageRoutes.list(page);
  return {
    title,
    description: DESCRIPTION,
    alternates: { canonical },
    ...socialMetadata({ title: `${title} | 예술in`, description: DESCRIPTION, url: canonical }),
  };
}

export default async function ActorsPage({ searchParams }: Props) {
  const page = parseActorListPage((await searchParams).page);
  // 서버에서 읽지 못하면 브라우저에서 다시 읽고, 그래도 실패하면 다시 시도를 보인다.
  const initialList = await actorPagesForServer(page).catch(() => null);
  return <ActorListRoute key={page} page={page} initialList={initialList} />;
}
