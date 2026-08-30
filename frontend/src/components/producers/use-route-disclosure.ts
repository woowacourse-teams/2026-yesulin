"use client";

import { useState } from "react";

type RouteDisclosureState = {
  readonly pathname: string;
  readonly open: boolean;
};

/** 컴포넌트를 재마운트하지 않고 경로가 바뀔 때만 열린 레이어를 닫는다. */
export function useRouteDisclosure(pathname: string) {
  const [state, setState] = useState<RouteDisclosureState>({ pathname, open: false });

  if (state.pathname !== pathname) {
    setState({ pathname, open: false });
  }

  return {
    open: state.pathname === pathname && state.open,
    openDisclosure: () => setState({ pathname, open: true }),
    closeDisclosure: () => setState({ pathname, open: false }),
  };
}
