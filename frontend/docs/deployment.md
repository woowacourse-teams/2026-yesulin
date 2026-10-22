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

Preview(`dev.yesulin.art` 포함)는 Vercel이 넣는 `VERCEL_ENV`로 판별해 모든 응답에 `X-Robots-Tag: noindex`를 붙인다.
robots.txt는 운영과 같이 수집을 허용해 로봇이 이 헤더를 읽게 한다. `VERCEL_ENV`가 없는 로컬 빌드에는 붙이지 않는다.

브라우저는 같은 origin의 `/api/v1/**`, `/oauth2/**`, `/login/oauth2/**`를 호출하고 Next.js가 `API_ORIGIN`으로
rewrite한다. Production·Preview에는 `NEXT_PUBLIC_API_MOCKING`을 설정하지 않는다.

OTR 공고 공유 링크는 `/otr?vid={OTR 번호}`이고, Slack 새 공고 알림은 `&src=kakao_openchat`을 붙인다.
`/otr`는 프론트 페이지다. 출처 표시가 없으면 서버 렌더링에서 같은 origin의 `/api/v1/otr?vid={번호}`로 바로 이동하고,
있으면 브라우저가 오픈채팅방 링크 방문을 기록한 뒤(최대 1.5초) 같은 주소로 이동한다. `/api/v1/otr`는 `/api/v1/:path*`
rewrite로 `${API_ORIGIN}`에 전달되고, 백엔드의 302 응답이 예술in 상세나 OTR 원문으로 보낸다. 번호가 없거나 형식이 틀리면 404다.
공유 링크에 백엔드 도메인이나 `/api/v1`을 노출하지 않는다. `API_ORIGIN`이 없으면 rewrite가 생성되지 않는다.
백엔드의 해당 API와 프론트 `/otr` 페이지를 함께 배포해야 하며 GA 이벤트는 발생시키지 않는다.
DEV 백엔드도 알림 링크에는 PROD 주소 `https://yesulin.art`를 사용하므로 그 링크의 요청은 PROD `/admin` 개요에 집계된다. `https://dev.yesulin.art/otr?vid={번호}`로 직접 테스트한 요청은
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
