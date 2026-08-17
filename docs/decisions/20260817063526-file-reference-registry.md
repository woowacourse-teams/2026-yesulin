---
status: accepted
date: 2026-08-17
agent-required: true
---

# 파일 업로드 상태와 도메인 참조 분리

## 계기

사진 보관함의 한 파일을 여러 지원서에서 재사용할 수 있어 단일 `ATTACHED` 상태로는 참조 대상과 개수를 표현할 수 없다. 보관함에서 삭제해도 제출 지원서의 사진은 유지되어야 한다.

## 결정

`FileAsset`은 `PENDING|READY` 업로드 상태만 관리한다. 도메인이 파일을 사용하면 `FileReference(referenceType, referenceId, fileId)`를 별도로 저장한다. `referenceType`은 `PERFORMANCE_POSTER`처럼 사용처를 한 값으로 표현한다. 같은 사용처·대상에는 여러 파일을 허용하고 동일한 파일 관계만 하나로 제한한다. 업로드 API 흐름은 `FileService`, 이벤트 기반 관계 영속화는 `FileReferenceService`가 담당한다. 연결·교체별 command로 경계를 구분하고 내부 관계 처리는 개별 값을 사용하며 두 연산은 멱등하게 처리한다.

## 이유

업로드 완료와 사용 관계를 분리하면 다중 재사용, 본문 이미지 수정과 사진 보관함 삭제를 같은 모델로 처리할 수 있다. `ATTACHED` 파생 상태와 실제 관계가 어긋나는 문제도 피한다.

## 영향

Flyway는 기존 공연 포스터를 `PERFORMANCE_POSTER` 참조로 이관한다. 파일 FK는 참조 중인 파일 삭제를 막으며 정리 배치는 유예기간이 지난 `PENDING`과 참조 없는 `READY`만 청크로 삭제한다. 참조 삭제와 물리 파일 정리 배치는 후속 작업으로 구현한다. 상세 계약은 [파일 업로드 설계](../backend/file-upload.md)를 따른다.
