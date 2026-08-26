export const AUTH_UNAUTHORIZED_EVENT = "yesulin:auth-unauthorized";

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  if (response.status !== 401 || typeof window === "undefined") return response;

  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
  // 화면별 오류 처리로 넘어가지 않고 기획사 레이아웃의 리다이렉트를 기다린다.
  return new Promise<Response>(() => {
    // 라우트가 교체되면 현재 요청을 소비하던 컴포넌트도 함께 해제된다.
  });
}
