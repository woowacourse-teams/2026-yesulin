"use client";

import { createContext, use, useState, type ReactNode } from "react";

export type SidebarSurface = "desktop" | "mobile";
type SidebarSlots = Record<SidebarSurface, HTMLElement | null>;
type SidebarSlotValue = {
  readonly slots: SidebarSlots;
  readonly attachDesktop: (element: HTMLElement | null) => void;
  readonly attachMobile: (element: HTMLElement | null) => void;
};

const SidebarSlotContext = createContext<SidebarSlotValue>({ slots: { desktop: null, mobile: null }, attachDesktop: () => undefined, attachMobile: () => undefined });

export function SidebarSlotProvider({ children }: { readonly children: ReactNode }) {
  const [desktop, attachDesktop] = useState<HTMLElement | null>(null);
  const [mobile, attachMobile] = useState<HTMLElement | null>(null);
  return <SidebarSlotContext value={{ slots: { desktop, mobile }, attachDesktop, attachMobile }}>{children}</SidebarSlotContext>;
}

export function SidebarSlotTarget({ surface }: { readonly surface: SidebarSurface }) {
  const { attachDesktop, attachMobile } = use(SidebarSlotContext);
  if (surface === "mobile") return <div ref={attachMobile} data-sidebar-slot="mobile" />;
  return <div ref={attachDesktop} data-sidebar-slot="desktop" />;
}

export function useSidebarSlots() {
  return use(SidebarSlotContext).slots;
}
