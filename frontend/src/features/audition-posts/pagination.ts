export type PageItem = { readonly kind: "page"; readonly page: number } | { readonly kind: "gap"; readonly key: string };

/**
 * 번호 페이지 목록. 첫·마지막 페이지와 현재 페이지 앞뒤 하나씩을 보여 주고 사이는 말줄임으로 줄인다.
 * 페이지는 0부터 센다. 7쪽 이하면 모두 보여 준다.
 */
export function pageItems(current: number, totalPages: number): readonly PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, page) => ({ kind: "page", page }));
  }
  const shown = new Set([0, totalPages - 1, current - 1, current, current + 1]);
  if (current <= 2) [1, 2, 3].forEach((page) => shown.add(page));
  if (current >= totalPages - 3) [totalPages - 4, totalPages - 3, totalPages - 2].forEach((page) => shown.add(page));
  const pages = [...shown].filter((page) => page >= 0 && page < totalPages).sort((left, right) => left - right);
  const items: PageItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push({ kind: "gap", key: `gap-${page}` });
    items.push({ kind: "page", page });
  });
  return items;
}
