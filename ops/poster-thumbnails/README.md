# 공개 포스터의 기존 이미지 배치

[`home-2026-11-17.json`](home-2026-11-17.json)은 2026-11-17 15:05 KST 운영 홈의 공고 23건과 공연 4건이다. 각 ID의 현재 공개 대표 이미지를 변환 대상으로 사용한다.

1. 변경 버전 배포와 DB 마이그레이션을 확인한다. 브라우저에서 운영 관리자 세션으로 로그인한다.
2. 관리자 세션 쿠키와 CSRF 헤더를 사용해 `POST /api/v1/admin/poster-thumbnails/backfill`에 JSON 목록을 제출한다. 항목별 상태를 확인한다. 같은 입력을 다시 제출하면 준비 상태를 조회할 수 있다.
3. `READY` 항목이 공개 목록에서 `/card-v1.jpg` URL을 반환하고 CDN에서 JPEG 응답이 오는지 확인한다. 모바일·PC에서 가독성과 이미지 전송량을 비교한다. `FAILED`만 재시도하려면 같은 목록에서 `retryFailed`를 `true`로 보낸다.
4. 홈 검증을 마친 뒤 나머지 공개 목록을 한 요청에 최대 27건씩 처리한다.

저장소 루트에서 실행하는 요청 예시다. `poster_cookie_jar`는 로그인한 운영 세션의 쿠키 파일 경로이며, `poster_csrf_token`은 그 세션의 `XSRF-TOKEN` 쿠키 값이다.

```sh
curl --fail-with-body --cookie "$poster_cookie_jar" \
  --header "X-CSRF-Token: $poster_csrf_token" \
  --header 'Content-Type: application/json' \
  --data-binary @ops/poster-thumbnails/home-2026-11-17.json \
  https://yesulin.art/api/v1/admin/poster-thumbnails/backfill
```

목록은 기존 원본과 준비된 썸네일을 같은 응답 필드로 읽는다. 상태값과 권한은 [HTTP 계약](../../backend/docs/api.md)을 참고한다.
