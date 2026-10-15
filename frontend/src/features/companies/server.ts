import "server-only";
import { cache } from "react";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import { companyApiPaths, type Company } from "./types";

const READ_TIMEOUT_MS = 10_000;

/** 공연사 화면 SSR 조회 결과. 목 환경이나 서버 API가 없으면 브라우저에서 다시 읽는다. */
export type CompanyLookup =
  | { readonly kind: "published"; readonly company: Company; readonly posts: readonly AuditionPostSummary[] }
  | { readonly kind: "missing" }
  | { readonly kind: "client-only" };

async function fetchForServer(path: string): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  return fetch(new URL(`/api${path}`, origin), { cache: "no-store", signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
}

/** 메타데이터와 본문이 같은 조회 결과를 사용한다. 실제 404만 missing으로 처리한다. */
export const companyForServer = cache(async (companyId: string): Promise<CompanyLookup> => {
  const [companyResponse, postsResponse] = await Promise.all([
    fetchForServer(companyApiPaths.detail(companyId)),
    fetchForServer(companyApiPaths.posts(companyId)),
  ]);
  if (!companyResponse || !postsResponse) return { kind: "client-only" };
  if (companyResponse.status === 404) return { kind: "missing" };
  if (!companyResponse.ok) throw new Error(`공연사 조회 실패: ${companyResponse.status}`);
  if (!postsResponse.ok) throw new Error(`공연사 공고 조회 실패: ${postsResponse.status}`);
  const company = await companyResponse.json() as Company;
  const { posts } = await postsResponse.json() as { readonly posts: readonly AuditionPostSummary[] };
  return { kind: "published", company, posts };
});
