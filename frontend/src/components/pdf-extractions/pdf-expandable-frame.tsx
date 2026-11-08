"use client";

import { useEffect, useEffectEvent, useRef, type MouseEvent, type ReactNode, type RefObject } from "react";
import type { PdfFit } from "./pdf-canvas-viewer";
import styles from "./pdf-viewer.module.css";

export type PdfFrameState = { readonly expanded: boolean; readonly onExpandedChange: (expanded: boolean) => void; readonly caption?: ReactNode };
type ElementRef<T extends HTMLElement> = RefObject<T | null>;

const inlineLayout = { className: styles.expandable, fit: "width" } as const;
const expandedLayout = { className: styles.expanded, fit: "page", role: "dialog", tabIndex: -1, "aria-modal": true, "aria-label": "지원서 원본 전체화면", "data-fullscreen-viewer": true } as const;

function layoutOf(expanded: boolean) {
  if (expanded) return expandedLayout;
  return inlineLayout;
}

const isInteractiveTarget = (event: MouseEvent) => event.target instanceof Element && Boolean(event.target.closest("a, button, [role='alert']"));

export function PdfExpandableFrame({ expanded, onExpandedChange, caption, children }: PdfFrameState & { readonly children: (fit: PdfFit) => ReactNode }) {
  const container = useRef<HTMLDivElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  useExpandedLayer(expanded, () => onExpandedChange(false), container, openButton);
  const openFromPage = (event: MouseEvent) => { if (!expanded && !isInteractiveTarget(event)) onExpandedChange(true); };
  const { fit, ...layout } = layoutOf(expanded);
  return <div ref={container} data-pdf-frame data-pdf-expanded={expanded} {...layout} onClick={openFromPage}>
    {expanded && caption && <div className={styles.expandedCaption}>{caption}</div>}
    <ExpandToggle expanded={expanded} openButton={openButton} onToggle={onExpandedChange} />
    {children(fit)}
  </div>;
}

function ExpandToggle({ expanded, openButton, onToggle }: { readonly expanded: boolean; readonly openButton: ElementRef<HTMLButtonElement>; readonly onToggle: (expanded: boolean) => void }) {
  if (expanded) return <button type="button" className={styles.expandButton} onClick={() => onToggle(false)}>닫기 <kbd>Esc</kbd></button>;
  return <button ref={openButton} type="button" className={styles.expandButton} onClick={() => onToggle(true)}>전체화면</button>;
}

function useExpandedLayer(expanded: boolean, close: () => void, container: ElementRef<HTMLDivElement>, openButton: ElementRef<HTMLButtonElement>) {
  useEscape(expanded, close);
  useIsolatedLayer(expanded, container);
  useFocusHandoff(expanded, container, openButton);
}

function useEscape(active: boolean, close: () => void) {
  const onKey = useEffectEvent((event: KeyboardEvent) => { if (event.key === "Escape") close(); });
  useEffect(() => {
    if (!active) return;
    const keyboard = (event: KeyboardEvent) => onKey(event);
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [active]);
}

function useIsolatedLayer(active: boolean, layer: ElementRef<HTMLElement>) {
  useEffect(() => {
    const element = layer.current;
    if (!active || !element) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreOutside = makeOutsideInert(element);
    return () => { document.body.style.overflow = overflow; restoreOutside(); };
  }, [active, layer]);
}

function makeOutsideInert(element: HTMLElement) {
  const changed = outsideSiblings(element).filter(sibling => !sibling.inert);
  changed.forEach(sibling => { sibling.inert = true; });
  return () => changed.forEach(sibling => { sibling.inert = false; });
}

function outsideSiblings(element: HTMLElement) {
  const siblings: HTMLElement[] = [];
  for (let node: HTMLElement | null = element; node && node !== document.body; node = node.parentElement) {
    const parent = node.parentElement;
    if (!parent) break;
    siblings.push(...[...parent.children].filter((child): child is HTMLElement => child !== node && child instanceof HTMLElement));
  }
  return siblings;
}

function useFocusHandoff(expanded: boolean, container: ElementRef<HTMLDivElement>, openButton: ElementRef<HTMLButtonElement>) {
  const wasExpanded = useRef(false);
  useEffect(() => {
    if (expanded) container.current?.focus({ preventScroll: true });
    if (wasExpanded.current && !expanded) openButton.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded, container, openButton]);
}
