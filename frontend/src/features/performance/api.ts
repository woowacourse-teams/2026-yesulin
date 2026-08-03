import type {
  Performance,
  PerformanceFilters,
  PerformanceListResponse,
  PerformanceVisibility,
  SavePerformanceRequest,
  ThumbnailUploadRequest,
  ThumbnailUploadResponse,
} from "./types";

const API_BASE_PATH = "/api/performance";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(errorBody?.message ?? "요청을 처리하지 못했습니다.");
  }

  return response.json() as Promise<T>;
}

export function getPerformances(filters: PerformanceFilters = {}) {
  const searchParams = new URLSearchParams();

  if (filters.query) searchParams.set("query", filters.query);
  if (filters.category && filters.category !== "ALL") {
    searchParams.set("category", filters.category);
  }
  if (filters.recruiting) searchParams.set("recruiting", "true");

  const queryString = searchParams.toString();
  return request<PerformanceListResponse>(
    queryString ? `${API_BASE_PATH}?${queryString}` : API_BASE_PATH,
  );
}

export function getPerformance(performanceId: string) {
  return request<Performance>(`${API_BASE_PATH}/${performanceId}`);
}

export function createPerformance(body: SavePerformanceRequest) {
  return request<Performance>(API_BASE_PATH, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePerformance(performanceId: string, body: SavePerformanceRequest) {
  return request<Performance>(`${API_BASE_PATH}/${performanceId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function updatePerformanceVisibility(
  performanceId: string,
  visibility: PerformanceVisibility,
) {
  return request<Performance>(`${API_BASE_PATH}/${performanceId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
}

export function uploadPerformanceThumbnail(body: ThumbnailUploadRequest) {
  return request<ThumbnailUploadResponse>(`${API_BASE_PATH}/thumbnail`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
