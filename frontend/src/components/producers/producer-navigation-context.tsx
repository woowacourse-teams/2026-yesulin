"use client";

import { createContext, use } from "react";

type ProducerNavigationValue = {
  readonly focusMode: boolean;
  readonly sidebarOpen: boolean;
  readonly openSidebar: () => void;
};

const ProducerNavigationContext = createContext<ProducerNavigationValue>({
  focusMode: false,
  sidebarOpen: true,
  openSidebar: () => undefined,
});

export const ProducerNavigationProvider = ProducerNavigationContext.Provider;

export function useProducerNavigation() {
  return use(ProducerNavigationContext);
}
