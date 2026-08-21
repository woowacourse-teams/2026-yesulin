# 프론트엔드 배포 안내

예술IN 프론트엔드는 **Vercel**에 배포하며, 사용자가 접속하는 Production 주소는
`https://yesulin.art`다.

## 배포 흐름

```text
GitHub main 병합
  → Vercel이 frontend/를 Next.js 프로젝트로 빌드
  → Production 배포
  → https://yesulin.art 반영
```

PR을 만들면 Vercel Preview 배포가 생성되고, `main`에 병합하면 Production 배포가 자동으로
시작된다.

## Vercel 설정

| 항목 | 값 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `frontend` |
| Node.js Version | `24.x` |
| Production Branch | `main` |
| Production Domain | `yesulin.art` |

Production 환경변수는 다음과 같다.

```env
API_ORIGIN=https://dcijkydwh7e79.cloudfront.net
```

`API_ORIGIN`은 Vercel 서버가 API 요청을 전달할 목적지다. 브라우저에서 직접 읽을 필요가
없으므로 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.

## API 요청

프론트 코드는 CloudFront 절대 주소 대신 같은 도메인의 상대 경로를 사용한다.

```ts
fetch("/api/v1/performances");
```

실제 요청 경로는 다음과 같다.

```text
브라우저
  → https://yesulin.art/api/v1/**
  → Vercel rewrite
  → CloudFront
  → Nginx
  → Spring
```

현재 일부 프론트 API는 아직 `/api/**`와 MSW를 사용한다. 모든 실제 API 이관이 끝나기 전에는
Vercel에서 `NEXT_PUBLIC_API_MOCKING=disabled`를 설정하지 않는다.

## 미디어 업로드와 조회

미디어 업로드와 조회 경로는 서로 다르다.

### 업로드

1. 프론트가 `/api/v1/**/upload-requests`로 업로드를 요청한다.
2. Spring이 S3 presigned URL을 반환한다.
3. 프론트가 반환받은 `uploadUrl`로 파일을 `PUT`한다.
4. 프론트가 완료 API를 호출한다.

업로드할 때 CloudFront 주소를 직접 만들지 않는다. API가 반환한 `uploadUrl`을 그대로 사용한다.

### 조회

공개 미디어 주소는 현재 CloudFront 기본 도메인을 사용한다.

```text
https://dcijkydwh7e79.cloudfront.net/files/...
```

CloudFront의 S3 원본 경로가 `/yesulin`이므로 공개 URL에 `/yesulin`을 다시 붙이지 않는다.
프론트는 백엔드 응답에 포함된 공개 URL을 그대로 사용한다.

`www.yesulin.art`와 `cdn.yesulin.art`는 현재 사용하지 않으며 후순위 작업으로 둔다.

## 배포 확인

`main` 병합 후 다음을 확인한다.

- Vercel 배포 상태가 `Ready`인지 확인한다.
- `https://yesulin.art`에서 최신 화면이 표시되는지 확인한다.
- 브라우저 개발자 도구에 JavaScript 오류가 없는지 확인한다.
- 실제 API를 변경했다면 `/api/v1/**` 요청이 예상한 상태 코드와 응답을 반환하는지 확인한다.
- 미디어를 변경했다면 반환된 CloudFront URL에서 파일이 열리는지 확인한다.

배포가 실패하면 Vercel의 Build Logs에서 `npm install`, `next build`, TypeScript 오류 순서로
확인한다. 실제 비밀번호, 세션 키, AWS 자격증명은 Vercel 로그나 저장소에 기록하지 않는다.
