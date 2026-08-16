---
status: accepted
date: 2026-08-16
agent-required: true
---

# Presigned upload 생명주기와 소유권

## 계기

클라이언트가 저장소에 직접 올리면 API 서버는 업로드 성공과 실제 메타데이터를 알 수 없고 순차 ID만으로 조회하면 타인의 파일 존재를 노출할 수 있다.

## 결정

업로드 URL 발급 시 소유자와 요청 메타데이터를 가진 `PENDING` 파일을 저장한다. 완료 요청은 세션 소유자와 file ID로 먼저 조회한 뒤 저장소의 Content-Type·크기를 확인해 `READY`로 바꾼다. 없거나 소유자가 다르면 동일한 404를 반환한다. 완료는 `PATCH`, `204 No Content`이며 재시도할 수 있는 멱등 연산이다. 별도 public UUID 없이 내부 `Long id`를 사용하고 object key는 `files/{UTC 날짜}/{UUID}`로 서버가 만든다.

## 이유

소유권 누출을 막고 직접 업로드를 확정할 수 있으며, 불필요한 식별자와 상태를 늘리지 않는다.

## 영향

API는 URL뿐 아니라 서명된 HTTP method·headers·만료 시각을 반환한다. 만료 PENDING 정리는 후속 배치와 S3 Lifecycle을 함께 사용한다. 상세 계약은 [파일 업로드 설계](../backend/file-upload.md)에 있다.
