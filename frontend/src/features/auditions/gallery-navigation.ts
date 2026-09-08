export function selectGalleryIndex(index: number, photoCount: number): number | null {
  if (photoCount === 0) return null;
  return Math.min(Math.max(index, 0), photoCount - 1);
}
