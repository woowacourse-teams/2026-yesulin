"use client";

import { createContext, use, useState, type ReactNode } from "react";

type SidebarSlotValue = {
  readonly slot: HTMLElement | null;
  readonly attach: (element: HTMLElement | null) => void;
};

const SidebarSlotContext = createContext<SidebarSlotValue>({ slot: null, attach: () => undefined });

export function SidebarSlotProvider({ children }: { readonly children: ReactNode }) {
  const [slot, attach] = useState<HTMLElement | null>(null);
  return <SidebarSlotContext value={{ slot, attach }}>{children}</SidebarSlotContext>;
}

export function SidebarSlotTarget() {
  const { attach } = use(SidebarSlotContext);
  return <div ref={attach} data-sidebar-slot />;
}

export function useSidebarSlot() {
  return use(SidebarSlotContext).slot;
}
