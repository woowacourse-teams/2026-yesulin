import type { ApplicantPhoto } from "@/features/auditions/types";
import { PHOTO_LABELS } from "./text";

const HUES = [340, 208, 152, 32, 268, 12, 188] as const;

/** 외부 아바타 URL을 못 불러올 때 대신 그릴 인라인 SVG. 이름 첫 글자를 넣는다. */
function fallbackPhoto(name: string, index: number) {
  const hue = HUES[index % HUES.length] ?? HUES[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
<rect width="300" height="400" fill="hsl(${hue} 22% 88%)"/>
<circle cx="150" cy="150" r="58" fill="hsl(${hue} 26% 74%)"/>
<path d="M40 400c0-70 49-118 110-118s110 48 110 118z" fill="hsl(${hue} 26% 74%)"/>
<text x="150" y="368" font-size="34" font-weight="700" text-anchor="middle" fill="hsl(${hue} 30% 42%)" font-family="sans-serif">${name.slice(0, 1)}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** 사진은 1~4장. 첫 장이 프로필 사진이자 목록 대표 이미지다. */
export function buildPhotos(name: string, applicantIndex: number, count: number): readonly ApplicantPhoto[] {
  return Array.from({ length: count }, (_, slot) => ({
    label: PHOTO_LABELS[slot] ?? `추가 사진 ${slot}`,
    url: `https://i.pravatar.cc/600?img=${((applicantIndex * 4 + slot) % 70) + 1}`,
    fallbackUrl: fallbackPhoto(name, applicantIndex + slot),
  }));
}

export const SAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=9bZkp7q19f0";
