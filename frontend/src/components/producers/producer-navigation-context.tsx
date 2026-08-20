"use client";

import { createContext, use } from "react";

type ProducerNavigationValue = {
  readonly focusMode: boolean;
  readonly openSidebar: () => void;
};

const ProducerNavigationContext = createContext<ProducerNavigationValue>({
  focusMode: false,
  openSidebar: () => undefined,
});

export const ProducerNavigationProvider = ProducerNavigationContext.Provider;

export function useProducerNavigation() {
  return use(ProducerNavigationContext);
}
