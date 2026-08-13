# 백엔드 API Postman 테스트 가이드

> 기준일: 2026-08-12
> Base URL: `http://localhost:8080`  
> 컬렉션: [`postman/yesulin-backend.postman_collection.json`](./postman/yesulin-backend.postman_collection.json)

## 실행과 인증

1. 루트에서 `docker compose up -d`로 MySQL을 실행한다.
2. `backend`에서 `./gradlew bootRun --args='--spring.profiles.active=local'`을 실행한다.
3. 먼저 `GET /api/v1/sessions/current`를 호출해 응답의 `csrfToken`을 저장한다.
4. POST·PUT·PATCH·DELETE에는 `X-CSRF-Token: {{csrfToken}}`을 보낸다.
5. 로그인하면 Postman cookie jar가 `JSESSIONID`를 유지한다.

미인증 보호 요청은 `401`, 인증됐지만 회사 소유권이 없으면 `403`, CSRF 실패는 `403`이다. 가입은 로그인 없이 가능하지만 CSRF는 필요하다.

## API 목록

| 영역 | Method·Path |
| --- | --- |
| 세션 | `GET /api/v1/sessions/current`, `POST /api/v1/sessions`, `DELETE /api/v1/sessions/current` |
| 활성 공연사 | `PUT /api/v1/sessions/current/active-company` |
| 가입 | `POST /api/v1/applicants`, `POST /api/v1/producers` |
| 공개 조회 | `GET /api/v1/public/postings/{postingId}`, `GET /api/v1/public/recommended-postings` |
| 지원자 프로필 | `GET·PATCH /api/v1/applicants/me/profile`, `GET /api/v1/applicants/me/profile/prefill` |
| Draft | `GET·POST /api/v1/applicants/me/drafts` |
| 지원서 | `GET·POST /api/v1/applicants/me/applications`, `GET /api/v1/applicants/me/applications/{applicationId}` |
| 공연사 프로필 | `GET·PATCH /api/v1/producers/me` |
| 공연 | `GET·POST /api/v1/performances`, `GET·PATCH·DELETE /api/v1/performances/{id}` |
| 공고 | `GET·POST /api/v1/performances/{id}/postings`, `GET·PATCH·DELETE /api/v1/postings/{id}` |
| 배역 | `GET·POST /api/v1/postings/{id}/roles` |
| 심사 | `GET /api/v1/roles/{roleId}/screening-rounds/current/applications`, `GET /.../{round}/applications` |
| 결과·마감 | `PATCH /api/v1/roles/{roleId}/screening-rounds/{round}/reviews`, `PATCH /.../{round}` |

## 핵심 요청 예시

공연은 공고에서 사용할 배역 템플릿과 함께 만든다.

```json
{
  "title": "Postman 테스트 공연",
  "venue": "테스트 극장",
  "posterUrl": "https://example.com/poster.jpg",
  "roles": [
    { "name": "주연", "description": "", "gender": "ANY", "ageMin": 18, "ageMax": 40 }
  ]
}
```

공고 생성은 선택 배역·차수·지원 필드를 한 트랜잭션으로 저장한다. 모집 종료는 날짜 범위의 exclusive end이므로 9월 30일까지 모집하면 10월 1일 00시를 보낸다.

```json
{
  "title": "Postman 테스트 공고",
  "status": "OPEN",
  "allowsMultipleRoles": false,
  "recruitmentStartsAt": "2026-09-01T00:00:00+09:00",
  "recruitmentEndsAt": "2026-10-01T00:00:00+09:00",
  "applicationGuide": "테스트 공고",
  "roles": [{ "templateId": 1, "quota": 2 }],
  "rounds": [{ "round": 1, "name": "서류", "date": "2026-10-02", "note": "" }],
  "applicationFields": [
    { "key": "NAME", "label": "이름", "required": true, "custom": false, "section": "BASIC", "inputType": "TEXT", "order": 10, "config": {} },
    { "key": "PHONE", "label": "연락처", "required": true, "custom": false, "section": "BASIC", "inputType": "TEL", "order": 20, "config": {} },
    { "key": "BIRTH", "label": "생년월일", "required": true, "custom": false, "section": "BASIC", "inputType": "DATE", "order": 30, "config": {} },
    { "key": "GENDER", "label": "성별", "required": true, "custom": false, "section": "BASIC", "inputType": "SELECT", "order": 40, "config": {} },
    { "key": "BODY", "label": "키·몸무게", "required": true, "custom": false, "section": "BASIC", "inputType": "COMPOSITE", "order": 50, "config": {} },
    { "key": "EMAIL", "label": "이메일", "required": true, "custom": false, "section": "BASIC", "inputType": "TEXT", "order": 60, "config": {} },
    { "key": "RESIDENCE", "label": "거주지", "required": true, "custom": false, "section": "BASIC", "inputType": "TEXT", "order": 70, "config": {} }
  ]
}
```

Draft 최초 저장은 `expectedRevision: null`, 갱신은 조회한 revision과 더 늦은 `clientModifiedAt`을 사용한다.

```json
{
  "postingId": 1,
  "content": { "roleIds": [1], "answers": [] },
  "expectedRevision": null,
  "clientModifiedAt": "2026-08-12T12:00:00Z"
}
```

최종 제출은 인증 계정이 소유한 활성 Draft만 받는다. 공고·배역 설명과 동의 문구는 요청 값을 믿지 않고 서버가 Snapshot으로 만든다.

```json
{
  "draftId": 1,
  "postingId": 1,
  "roleIds": [1],
  "answers": [
    { "key": "NAME", "value": "지원자" },
    { "key": "PHONE", "value": "010-1234-5678" },
    { "key": "BIRTH", "value": "2000-01-01" },
    { "key": "GENDER", "value": "FEMALE" },
    { "key": "BODY", "value": { "height": 170, "weight": 60 } },
    { "key": "EMAIL", "value": "applicant@example.com" },
    { "key": "RESIDENCE", "value": "서울" }
  ],
  "consent": { "collectionAndUse": true, "thirdPartyProvision": true, "profileSave": false }
}
```

심사 결과 저장:

```json
{ "applicationIds": [1], "status": "PASS", "memo": "", "note": "내부 메모" }
```

차수 마감:

```json
{ "status": "CLOSED" }
```

1차에는 `ABSENT`를 쓸 수 없다. `ETC`는 memo가 필요하다. 검토 대기가 남거나 대상자가 없으면 차수를 마감할 수 없다.

## 오류 형식

```json
{
  "code": "INVALID_REQUEST",
  "message": "요청 값이 올바르지 않습니다.",
  "detail": { "field": "오류 설명" }
}
```

- `400`: 형식·도메인 입력 검증
- `401`: 로그인 필요 또는 로그인 실패
- `403`: 소유권/권한 없음 또는 CSRF 실패
- `404`: 리소스 없음
- `409`: Draft revision, 이미 제출, 모집·심사 상태 충돌

## 아직 제공하지 않는 API

- 익명 Draft·계정 자동 연결
- 파일·사진 업로드와 정리
- 제출 idempotency key
- 별도 공연사 탐색 트리(현재 Frontend가 공연·공고 조회를 합성)
- 제출 지원서 일반 수정
