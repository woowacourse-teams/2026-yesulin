"use client";

import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import type { PdfPageRow } from "./pdf-page-rows";

export type PdfPagerState = {
  readonly row: number; readonly rows: number;
  readonly firstPage: number; readonly lastPage: number; readonly pages: number;
  readonly endAttempts: number;
};

const ROW_SELECTOR = "[data-pdf-row]";
const ROW_TOP_GAP = 8;
const pagerKeys: Readonly<Record<string, -1 | 1>> = { ArrowLeft: -1, ArrowRight: 1, PageUp: -1, PageDown: 1 };

export function pagerState(rows: readonly PdfPageRow[], row: number, endAttempts: number): PdfPagerState {
  const current = rows[row] ?? [];
  const pages = rows.reduce((sum, item) => sum + item.length, 0);
  return { row, rows: rows.length, firstPage: (current[0]?.index ?? 0) + 1, lastPage: (current.at(-1)?.index ?? 0) + 1, pages, endAttempts };
}

export function usePdfPager(reader: RefObject<HTMLDivElement | null>, rows: readonly PdfPageRow[], onChange?: (state: PdfPagerState) => void) {
  const [row, setRow] = useState(0);
  const [endAttempts, setEndAttempts] = useState(0);
  const enabled = !!onChange && rows.length > 0;
  const step = useEffectEvent((direction: -1 | 1) => moveRow(reader.current, row + direction, rows.length, () => setEndAttempts(value => value + 1)));
  useEffect(() => { if (enabled) return listenPagerKeys(step); }, [enabled]);
  useEffect(() => { if (enabled) return followScroll(reader.current, setRow); }, [enabled, reader]);
  useEffect(() => { if (enabled) restartAt(reader.current, setRow, setEndAttempts); }, [enabled, reader]);
  const report = useEffectEvent(() => onChange?.(pagerState(rows, Math.min(row, rows.length - 1), endAttempts)));
  const signature = rows.map(item => item.length).join(",");
  useEffect(() => { if (enabled) report(); }, [enabled, row, endAttempts, signature]);
}

function moveRow(reader: HTMLDivElement | null, target: number, count: number, blocked: () => void) {
  if (!reader || target < 0) return;
  if (target >= count) { blocked(); return; }
  const element = reader.querySelectorAll<HTMLElement>(ROW_SELECTOR)[target];
  if (element) reader.scrollTo({ top: element.offsetTop - ROW_TOP_GAP });
}

function listenPagerKeys(step: (direction: -1 | 1) => void) {
  const keyboard = (event: KeyboardEvent) => {
    const direction = pagerKeys[event.key];
    if (!direction || ignoredKey(event)) return;
    event.preventDefault();
    step(direction);
  };
  window.addEventListener("keydown", keyboard);
  return () => window.removeEventListener("keydown", keyboard);
}

function ignoredKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return true;
  return event.target instanceof HTMLElement && !!event.target.closest("input,textarea,select,[contenteditable=true]");
}

function followScroll(reader: HTMLDivElement | null, setRow: (row: number) => void) {
  if (!reader) return;
  const update = () => setRow(nearestRow(reader));
  reader.addEventListener("scroll", update, { passive: true });
  return () => reader.removeEventListener("scroll", update);
}

function restartAt(reader: HTMLDivElement | null, setRow: (row: number) => void, setEndAttempts: (count: number) => void) {
  setEndAttempts(0);
  if (reader) setRow(nearestRow(reader));
}

function nearestRow(reader: HTMLDivElement) {
  const rows = [...reader.querySelectorAll<HTMLElement>(ROW_SELECTOR)];
  const top = reader.scrollTop + ROW_TOP_GAP;
  const distances = rows.map(element => Math.abs(element.offsetTop - top));
  return Math.max(0, distances.indexOf(Math.min(...distances)));
}
