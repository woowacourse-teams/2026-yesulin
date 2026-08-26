# API 공통 규칙

구체적인 엔드포인트는 [백엔드 API](../backend/docs/api.md)가 책임진다.

## 경로와 데이터

- REST API prefix는 `/api/v1`이다.
- 리소스 경로는 복수 명사와 kebab-case를 사용한다.
- 공고와 지원서는 외부에 UUID를 사용한다. 공연·배역·전형·파일·보관함 항목은 양의 정수 ID를 사용한다.
- 시간은 ISO 8601로 전송한다. `Instant`는 offset이 포함된 시각, `LocalDate`는 `YYYY-MM-DD`다.
- 성공 응답에는 공통 envelope를 씌우지 않는다. 컬렉션 자체의 이름이 필요한 경우 도메인별 response record를 사용한다.

## 인증과 CSRF

- 로그인 상태는 HttpSession Cookie로 유지한다.
- 쓰기 요청은 `XSRF-TOKEN` Cookie 값을 `X-CSRF-Token` 헤더로 돌려보내야 한다.
- 미인증은 `401 AUTH_UNAUTHENTICATED`, 역할·상태 불일치는 `403 AUTH_FORBIDDEN` 또는 `AUTH_INACTIVE_MEMBER`다.
- 각 API의 역할과 회원 상태 조건은 [백엔드 API](../backend/docs/api.md)에 기록한다.

## 오류

```json
{
  "code": "ERROR_CODE",
  "message": "설명",
  "detail": null
}
```

- Bean Validation, JSON 파싱, 경로·쿼리 형식, `IllegalArgumentException`은 `400 INVALID_REQUEST`다.
- 비즈니스 오류는 도메인 ErrorCode의 타입에 따라 400, 401, 403, 404, 409로 변환한다.
- 필드 검증 오류는 `detail`에 필드 경로와 메시지를 담는다.
- 문서에 없는 오류도 공통 500 응답이 발생할 수 있으므로 클라이언트는 `code`의 미등록 값을 안전하게 처리한다.

