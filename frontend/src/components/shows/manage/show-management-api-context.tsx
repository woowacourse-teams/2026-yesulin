"use client";

import { createContext, useContext, type ReactNode } from "react";
import { producerShowManagementApi, type ShowManagementApi } from "@/features/shows/management-api";

const ShowManagementApiContext = createContext<ShowManagementApi>(producerShowManagementApi);

/** 감싸지 않으면 기획사 API를 쓴다. 운영자 화면은 운영자 API로 감싼다. */
export function ShowManagementApiProvider({ api, children }: {
  readonly api: ShowManagementApi;
  readonly children: ReactNode;
}) {
  return <ShowManagementApiContext.Provider value={api}>{children}</ShowManagementApiContext.Provider>;
}

export function useShowManagementApi() {
  return useContext(ShowManagementApiContext);
}
