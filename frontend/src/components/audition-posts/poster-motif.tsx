import type { ReactNode } from "react";

const motifs: Readonly<Record<string, ReactNode>> = {
  연극: <path fill="currentColor" d="M216 40H40a16 16 0 0 0-16 16v48c0 61 49 104 104 112 55-8 104-51 104-112V56a16 16 0 0 0-16-16ZM90 116a14 14 0 1 1 14-14 14 14 0 0 1-14 14Zm76 0a14 14 0 1 1 14-14 14 14 0 0 1-14 14Zm-38 72c-24 0-44-14-50-34h100c-6 20-26 34-50 34Z" />,
  뮤지컬: <path fill="currentColor" d="M212 18 84 50a8 8 0 0 0-6 8v110a36 36 0 1 0 16 30V114l112-28v58a36 36 0 1 0 16 30V26a8 8 0 0 0-10-8Z" />,
  퍼포먼스: <g fill="none" stroke="currentColor" strokeWidth="18" strokeLinecap="round"><circle cx="128" cy="46" r="20" /><path d="M128 80v68M128 94 70 70M128 94l58-40M128 148l-30 40-8 46M128 148l40 30 30-24" /></g>,
  단원: <g fill="currentColor"><circle cx="128" cy="92" r="40" /><circle cx="56" cy="110" r="28" /><circle cx="200" cy="110" r="28" /><path d="M60 214a68 68 0 0 1 136 0ZM8 214a48 48 0 0 1 60-46 88 88 0 0 0-24 46ZM248 214a48 48 0 0 0-60-46 88 88 0 0 1 24 46Z" /></g>,
  기획사: <path fill="currentColor" d="M40 216V72l72-40v184ZM128 216V96h88v120Zm-64-140h24v20H64Zm0 40h24v20H64Zm0 40h24v20H64Zm88-20h24v20h-24Zm0 40h24v20h-24Z" />,
};

/** 기본 포스터 오른쪽 아래에 크게 잘라 넣는 분야 실루엣과 로고 반짝이. */
export function PosterArt({ category }: { readonly category?: string }) {
  return <>
    <PosterMotif category={category} />
    <span className="notebook-poster-spark" />
  </>;
}

function PosterMotif({ category }: { readonly category?: string }) {
  const motif = category && motifs[category];
  if (!motif) return null;
  return <svg className="notebook-poster-motif" viewBox="0 0 256 256" focusable="false">{motif}</svg>;
}
