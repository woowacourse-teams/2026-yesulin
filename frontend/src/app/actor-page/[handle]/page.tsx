import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ActorPageRoute } from "@/components/actor-pages/actor-page-detail";
import { actorPageForServer } from "@/features/actor-pages/server";
import { actorIdentityLine, actorPageRoutes, isActorHandleAddress } from "@/features/actor-pages/types";
import { socialMetadata } from "@/features/seo/audition-metadata";

type Props = { readonly params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  if (!isActorHandleAddress(handle)) notFound();
  const found = await actorPageForServer(handle);
  if (found.kind === "missing") notFound();
  if (found.kind === "client-only") return { title: "배우", alternates: { canonical: actorPageRoutes.detail(handle.toLowerCase()) } };
  const { actorPage } = found;
  const canonical = actorPageRoutes.detail(actorPage.handle);
  const title = `${actorPage.name} (@${actorPage.handle})`;
  const description = actorPage.coverLetter?.slice(0, 120) ?? `${actorPage.name} 배우 · ${actorIdentityLine(actorPage)}`;
  return {
    title,
    description,
    alternates: { canonical },
    ...socialMetadata({
      title: `${title} | 예술in`,
      description,
      url: canonical,
      type: "profile",
      ...(actorPage.representativePhotoUrl ? { image: { url: actorPage.representativePhotoUrl, alt: `${actorPage.name} 대표 사진` } } : {}),
    }),
  };
}

export default async function ActorPage({ params }: Props) {
  const { handle } = await params;
  if (!isActorHandleAddress(handle)) notFound();
  const found = await actorPageForServer(handle);
  if (found.kind === "missing") notFound();
  if (found.kind === "public" && found.actorPage.handle !== handle) permanentRedirect(actorPageRoutes.detail(found.actorPage.handle));
  return <ActorPageRoute handle={handle} initial={found.kind === "public" ? found.actorPage : null} />;
}
