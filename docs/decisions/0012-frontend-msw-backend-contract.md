---
status: accepted
date: 2026-08-12
agent-required: true
---

# Frontend·MSW·Backend 단일 API 계약

## 계기

Frontend와 MSW는 `/api/**`, Spring Backend는 `/api/v1/**`를 사용했고 로그인·세션·CSRF와 여러 DTO도 서로 달랐다. Mock에서는 동작하지만 실제 서버로 전환하면 같은 기능이 실패했다.

## 결정

Frontend feature API는 상대 경로 `/api/v1/**` 하나만 사용한다. 개발 Mock mode에서는 MSW가 이를 가로채고, Real mode에서는 Next rewrite가 `API_ORIGIN`으로 전달한다. 브라우저는 same-origin 세션 쿠키를 사용하며 공통 client가 현재 세션에서 CSRF 토큰을 얻어 모든 쓰기 요청에 전달한다.

Backend 응답과 화면 View Model은 feature adapter에서 분리한다. MSW는 Backend와 경로·메서드·요청·응답·상태·오류 형식을 같게 유지한다. 최종 제출과 지원서 조회는 인증 계정 소유 경로만 제공하며 공개 조회·제출 후 수정은 두지 않는다.

## 이유

화면 코드를 바꾸지 않고 Mock과 실제 서버를 전환하고, Backend의 인증·소유권·불변 Snapshot 정책을 우회하지 않기 위해서다.

## 영향

계약 변경은 Backend controller, Frontend feature API/type, MSW handler와 API 문서를 같은 작업에서 갱신한다. 익명 Draft와 파일 API는 별도 정책 결정 전까지 만들지 않는다.
