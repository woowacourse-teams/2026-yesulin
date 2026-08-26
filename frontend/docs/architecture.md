# 프론트엔드 구조

## 기술과 실행 모드

- Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4
- 실제 API가 기본 실행 모드다.
- `NEXT_PUBLIC_API_MOCKING=enabled`일 때만 MSW와 `/dev/scenarios`를 사용한다.
- 작성 중 지원서는 IndexedDB에 저장하고 서버 Draft로 동기화하지 않는다.

## 소스 책임

```text
src/app/                 URL과 layout, 화면 컴포넌트 조립
src/features/            도메인 타입, API client, request/response 변환
src/components/          화면, form, provider와 사용자 상호작용
src/mocks/               seed 데이터, MSW handler와 메모리 상태
src/config/              환경 변수 해석
```

- 라우트는 비즈니스 규칙을 소유하지 않는다.
- 백엔드 response와 화면 모델의 차이는 feature API adapter에서 변환한다.
- 브라우저 API는 같은 origin의 `/api/**`를 호출한다. Next.js가 `API_ORIGIN`으로 rewrite한다.
- UUID 공고와 숫자 배역은 실제 백엔드 경계를 사용한다. `seed_*` ID는 MSW 전용이다.

## 주요 사용자 영역

- 배우: 공개 공고, 단계별 지원서, 최종 검토·제출, 프로필·보관함, 지원 이력
- 기획사/제작사: 가입·세션, 회사 프로필, 공연·공고, 배역별 심사
- 운영자: `/admin` 한 화면에서 DB 현황, 기획사 목록과 수동 활성화, 공고 목록, 변경 기록을 본다. `ADMIN` 세션만 통과하고
  공개 서비스의 `AuthSessionProvider`는 운영자 세션을 비로그인으로 취급한다.
- 인증 전 지원서 Draft는 브라우저에 남고 소셜 로그인 완료 뒤 같은 `returnTo`로 복귀한다.
- 실제 제출 후 프로필 저장을 선택했다면 별도 프로필 PATCH를 시도한다. 프로필 저장 실패가 제출을 취소하지 않는다.

## 검증 경계

- lint와 production build가 기본 정적 검증이다.
- 별도 테스트 러너가 없어 MSW 시나리오와 수동 Visual QA가 회귀 검증을 보완한다.
- 목 상태는 대부분 메모리 기반이어서 새로고침하면 seed로 돌아간다.

