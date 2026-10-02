# 프론트엔드 배포

- Vercel Root Directory: `frontend`
- Node.js: 24.x
- Production branch: `main`
- Production domain: `https://yesulin.art`
- `API_ORIGIN`: Production은 `https://api.yesulin.art`, DEV는 `https://dev-api.yesulin.art`
- `NEXT_PUBLIC_GTM_ID`: `GTM-PZXXR8RG` (Production only)
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry `in-front/javascript-nextjs` 프로젝트의 public DSN
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`: Production은 `production`, Preview는 `preview`
- `SENTRY_AUTH_TOKEN`: 빌드 시 source map을 올리는 비공개 토큰
- `SENTRY_ORG`: `in-front`
- `SENTRY_PROJECT`: `javascript-nextjs`

브라우저는 같은 origin의 `/api/v1/**`, `/oauth2/**`, `/login/oauth2/**`를 호출하고 Next.js가 `API_ORIGIN`으로
rewrite한다. Production·Preview에는 `NEXT_PUBLIC_API_MOCKING`을 설정하지 않는다.

OTR 공고 공유 링크는 `/otr?vid={OTR 번호}`다. 화면을 렌더링하지 않고 같은 환경의
`${API_ORIGIN}/api/v1/otr?vid={번호}`로 rewrite하며, 백엔드의 OTR 원문 302 응답을 브라우저에 전달한다.
공유 링크에 백엔드 도메인이나 `/api/v1`을 노출하지 않는다. `API_ORIGIN`이 없으면 rewrite가 생성되지 않는다.
백엔드의 해당 API와 프론트 rewrite를 함께 배포해야 하며 GA 이벤트는 발생시키지 않는다.
DEV 스케줄러도 실제 알림에는 PROD 주소 `https://yesulin.art/otr?vid={번호}`를 사용한다.
그 요청은 PROD `/admin` 개요에 집계된다. `https://dev.yesulin.art/otr?vid={번호}`로 직접 테스트한 요청은
DEV `/admin`에 별도로 집계되며, 두 환경 모두 백엔드의 JSON 파일 로그 조회 API가 배포돼 있어야 한다.

업로드는 백엔드에서 받은 presigned `uploadUrl`로 직접 PUT하고 완료 API를 호출한다. 조회 URL은 백엔드 응답을
그대로 사용하며 프론트가 CloudFront 경로를 조합하지 않는다.

배포 후 Vercel 상태, 브라우저 오류, MSW 비활성, 실제 API 상태 코드와 미디어 URL을 확인한다. GTM을
활성화한 Production에서는 Tag Assistant로 다음을 확인한다.

- 분석 미선택·거부 상태에는 `googletagmanager.com`, `google-analytics.com` 요청이 없다.
- 분석 동의 후 `GTM-PZXXR8RG`가 로드되고 GA4가 `G-JSQZT648EC`로 이벤트를 받는다.
- 동의 철회 후 페이지를 다시 불러오며 `_ga` 계열 쿠키와 추가 분석 요청이 없다.

Sentry의 DSN은 브라우저에 공개되는 프로젝트 주소지만 `SENTRY_AUTH_TOKEN`은 비밀값이다. 토큰은 저장소나
`NEXT_PUBLIC_` 환경변수에 넣지 않는다. `SENTRY_EXAMPLE_ENABLED`도 Production·Preview에는 설정하지 않는다.
배포 후 Sentry에서 release와 source map이 연결됐는지 확인하고, 실제 오류의 stack trace가 원본 TypeScript
파일과 줄 번호를 가리키는지 확인한다. 운영 기준과 request ID 검색 방법은 [monitoring.md](./monitoring.md)에 있다.
