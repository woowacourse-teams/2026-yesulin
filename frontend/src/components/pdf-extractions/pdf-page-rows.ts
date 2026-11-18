import type { PdfPageSize } from "./pdf-scroll-page";

export type PdfFit = "width" | "page";
export type PdfReaderSize = { readonly width: number; readonly height: number };
export type PdfRowPage = { readonly index: number; readonly width: number };
export type PdfPageRow = readonly PdfRowPage[];

export const PAGE_FIT_GAP = 16;
export const PAGE_ROW_GAP = 8;
export const PAGE_SIDE_PADDING = 16;
/** 나란히 놓으려고 줄일 수 있는 최소 높이 비율. 이보다 작아지면 다음 화면으로 넘긴다. */
export const MIN_ROW_SCALE = 0.8;
/** 높이에 맞추면 글씨가 읽히지 않는 세로로 긴 이미지의 세로/가로 비율. */
export const LONG_PAGE_RATIO = 2;

/** 쪽마다 높이에 맞추고, 한 화면에 통째로 들어가는 쪽끼리 한 줄로 묶는다. */
export function layoutPageRows(reader: PdfReaderSize, pages: readonly PdfPageSize[], fit: PdfFit): PdfPageRow[] {
  if (fit === "width") return singlePageRows(pages, reader.width);
  if (!measured(reader)) return singlePageRows(pages, padded(reader).width);
  return groupRows(padded(reader), pages);
}

function singlePageRows(pages: readonly PdfPageSize[], width: number): PdfPageRow[] {
  return pages.map((_, index) => [{ index, width }]);
}

function groupRows(reader: PdfReaderSize, pages: readonly PdfPageSize[]) {
  const rows: PdfPageRow[] = [];
  let current: number[] = [];
  pages.forEach((_, index) => {
    current = placePage(reader, pages, current, index, rows);
  });
  return [...rows, ...flush(reader, pages, current)];
}

function placePage(reader: PdfReaderSize, pages: readonly PdfPageSize[], current: number[], index: number, rows: PdfPageRow[]) {
  if (isLongPage(pages[index])) {
    rows.push(...flush(reader, pages, current), [{ index, width: longPageWidth(reader) }]);
    return [];
  }
  const candidate = [...current, index];
  if (fitsTogether(reader, pages, candidate)) return candidate;
  rows.push(...flush(reader, pages, current));
  return [index];
}

function flush(reader: PdfReaderSize, pages: readonly PdfPageSize[], indexes: readonly number[]): PdfPageRow[] {
  if (!indexes.length) return [];
  const height = rowHeight(reader, pages, indexes);
  return [indexes.map(index => ({ index, width: Math.floor(height * pages[index].width / pages[index].height) }))];
}

function fitsTogether(reader: PdfReaderSize, pages: readonly PdfPageSize[], indexes: readonly number[]) {
  if (indexes.length === 1) return true;
  return rowHeight(reader, pages, indexes) >= usableHeight(reader) * MIN_ROW_SCALE;
}

function rowHeight(reader: PdfReaderSize, pages: readonly PdfPageSize[], indexes: readonly number[]) {
  const ratios = indexes.reduce((sum, index) => sum + pages[index].width / pages[index].height, 0);
  const width = reader.width - PAGE_ROW_GAP * (indexes.length - 1);
  return Math.min(usableHeight(reader), width / ratios);
}

function isLongPage(page: PdfPageSize) {
  return page.height / page.width >= LONG_PAGE_RATIO;
}

function longPageWidth(reader: PdfReaderSize) {
  return Math.min(reader.width, usableHeight(reader));
}

function padded(reader: PdfReaderSize): PdfReaderSize {
  return { width: reader.width - PAGE_SIDE_PADDING * 2, height: reader.height };
}

function usableHeight(reader: PdfReaderSize) {
  return reader.height - PAGE_FIT_GAP;
}

function measured(reader: PdfReaderSize) {
  return reader.height > PAGE_FIT_GAP;
}
