# 프론트엔드 배포

- Vercel Root Directory: `frontend`
- Node.js: 24.x
- Production branch: `main`
- Production domain: `https://yesulin.art`
- `API_ORIGIN`: `https://dcijkydwh7e79.cloudfront.net`

브라우저는 같은 origin의 `/api/v1/**`, `/oauth2/**`, `/login/oauth2/**`를 호출하고 Next.js가 `API_ORIGIN`으로
rewrite한다. Production·Preview에는 `NEXT_PUBLIC_API_MOCKING`을 설정하지 않는다.

업로드는 백엔드에서 받은 presigned `uploadUrl`로 직접 PUT하고 완료 API를 호출한다. 조회 URL은 백엔드 응답을
그대로 사용하며 프론트가 CloudFront 경로를 조합하지 않는다.

배포 후 Vercel 상태, 브라우저 오류, MSW 비활성, 실제 API 상태 코드와 미디어 URL을 확인한다.

