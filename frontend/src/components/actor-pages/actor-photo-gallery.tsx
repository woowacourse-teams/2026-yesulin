"use client";

import { useState } from "react";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { SiteIcon } from "@/components/ui/site-icon";
import type { ActorPageContent } from "@/features/actor-pages/types";
import { ActorPhoto } from "./actor-page-screen";

/** 대표 사진과 공개 사진만 한 뷰어에 모은다. 같은 주소의 대표 사진은 중복하지 않는다. */
export function ActorPhotoGallery({ name, representativePhotoUrl, photos }: {
  readonly name: string;
  readonly representativePhotoUrl: ActorPageContent["representativePhotoUrl"];
  readonly photos: ActorPageContent["photos"];
}) {
  const imageUrls = [...new Set([representativePhotoUrl, ...photos.map((photo) => photo.url)].filter((url): url is string => Boolean(url)))];
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const activeIndex = activePhoto === null ? -1 : imageUrls.indexOf(activePhoto);
  const mainPhoto = imageUrls[0];

  return (
    <div className="min-w-0">
      {mainPhoto ? (
        <button
          type="button"
          aria-label={`${name} 대표 사진 확대`}
          aria-haspopup="dialog"
          onClick={() => setActivePhoto(mainPhoto)}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-card bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <ActorPhoto src={mainPhoto} alt={`${name} 대표 사진`} />
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-10 text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-1.5"><SiteIcon name="search" size={18} />크게 보기</span>
            <span className="num">1 / {imageUrls.length}</span>
          </span>
        </button>
      ) : <ActorPhoto src={null} alt={`${name} 대표 사진`} className="rounded-card" />}

      {imageUrls.length > 1 ? (
        <div className="mt-5">
          <p className="mb-3 flex items-baseline justify-between text-sm font-semibold">프로필 사진 <span className="num font-normal text-muted-strong">{imageUrls.length}장</span></p>
          <ul aria-label={`${name} 프로필 사진`} className="grid grid-cols-3 gap-2.5">
            {imageUrls.map((url, index) => (
              <li key={url}>
                <button
                  type="button"
                  aria-label={`${name} 사진 ${index + 1} 확대`}
                  aria-haspopup="dialog"
                  onClick={() => setActivePhoto(url)}
                  className="relative block w-full cursor-zoom-in overflow-hidden rounded-control border border-border bg-card p-1 hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <ActorPhoto src={url} alt={`${name} 사진 ${index + 1}`} className="rounded-[8px]" />
                  {url === representativePhotoUrl ? <span className="absolute bottom-2 left-2 rounded bg-foreground/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">대표</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeIndex >= 0 ? (
        <ImageLightbox
          title={`${name} 프로필 사진`}
          imageUrls={imageUrls}
          index={activeIndex}
          onSelect={(index) => setActivePhoto(imageUrls[index] ?? null)}
          onClose={() => setActivePhoto(null)}
        />
      ) : null}
    </div>
  );
}
