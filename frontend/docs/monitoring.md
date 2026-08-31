# 프론트엔드 모니터링

사용자가 실제로 한 행동은 GA4/GTM에서 보고, 화면이 왜 깨졌는지는 Sentry에서 본다. 백엔드 처리 결과는
Logback 로그로 확인한다. 세 도구의 역할을 섞지 않는 게 기본이다.

## Sentry가 수집하는 오류

- 처리되지 않은 브라우저 예외와 Promise rejection은 SDK가 자동으로 수집한다.
- React가 잡아 버리는 렌더링 오류는 `app/global-error.tsx`에서 직접 수집한다.
- 코드가 `catch`한 뒤 사용자 메시지로 바꾸는 오류는 해당 `catch` 지점에서 `reportError`를 호출한다.
- API 4xx는 로그인 만료나 입력 검증처럼 예상 가능한 흐름이므로 이슈로 만들지 않는다. 네트워크 실패와 5xx만
  공통 API 클라이언트에서 수집한다.

iOS WebKit의 `NotFoundError: The object can not be found here`처럼 HTTP 응답이 없는 오류도 수집 대상이다.
지원 사진, 프로필 사진, 공연 포스터 업로드가 이 오류를 잡아 재시도한 뒤 최종 실패하면
`error_code=WEBKIT_FILE_NOT_FOUND`, 원인 예외 이름, 업로드 단계, 시도 횟수와 오류 ID를 Sentry 태그로 보낸다.
파일명, 사진 내용, 지원서 입력값은 보내지 않는다.
재시도로 복구된 WebKit 오류도 `operation=retry_recovered`로 남긴다. 반면 복구된 일반 네트워크 재시도는
Sentry 이슈 수를 불필요하게 늘리지 않도록 보내지 않는다.

## 백엔드 로그와 연결하기

공통 API 클라이언트는 모든 요청에 `X-Request-Id`를 넣는다. 이미 업로드 오류 ID가 있으면 그 값을 그대로 쓰고,
없으면 브라우저에서 UUID를 만든다. 백엔드는 같은 값을 응답 헤더와 Logback MDC의 `requestId`로 남긴다.
Sentry 실패 이벤트에는 검색 가능한 `request_id` 태그로 붙는다.

따라서 Sentry에서 오류를 연 뒤 `request_id`를 복사해 운영 로그에서 검색하면 같은 요청의 백엔드 로그를 바로
찾을 수 있다. 이는 Sentry 분산 트레이싱과는 별개인 우리 서비스의 로그 상관관계다.

## 수집 범위와 비용

- 오류 이벤트는 샘플링하지 않는다.
- 성능 trace는 개발 환경 100%, production 5%다.
- Session Replay와 Sentry Logs는 현재 사용하지 않는다.
- 사용자 정보, 쿠키, HTTP 헤더·본문, URL query, 로컬 변수는 수집하지 않는다.
- console 및 클릭 breadcrumb도 입력값 노출 가능성을 줄이기 위해 제외한다.

## 연결 확인

로컬 `.env.local`에서 `SENTRY_EXAMPLE_ENABLED=true`일 때만 `/sentry-example-page`가 열린다. 버튼을 누르면
브라우저와 Next.js 서버에서 각각 테스트 오류가 발생한다. 확인 후에는 플래그를 지우거나 `false`로 바꾼다.
Production과 Preview에는 이 플래그를 설정하지 않는다.
