---
status: accepted
date: 2026-08-16
agent-required: true
---

# 공연 수정과 포스터 변경 이벤트

## 계기

공연 수정에서 배역을 매번 삭제·재생성하면 이후 공고가 참조할 배역 ID가 불안정해지고, 포스터만 바꿀 때 새 파일의 업로드·소유권 검증이 누락될 수 있다.

## 결정

공연 기본 정보와 배역 수정 API를 분리한다. 기본 정보는 포스터, 제목과 도로명주소를 함께 수정하며 배역에는 영향을 주지 않는다. 배역은 공연 하위 리소스로 하나씩 추가·수정·삭제하고 각 ID를 유지한다. 다른 공연의 배역 ID와 같은 공연 안의 중복 이름은 거부한다. 포스터 ID가 실제로 달라질 때만 이전·신규 ID를 가진 `PerformancePosterChangedEvent`를 발행한다. presentation event adapter가 파일 application을 호출해 신규 파일이 같은 소유자의 `READY` 상태인지 커밋 전에 확인한다.

## 이유

배역 편집이 기본 정보나 다른 배역을 덮어쓰지 않게 하고 aggregate가 순서·중복·소속 규칙을 관리한다. 파일 application과 공연 application의 직접 서비스 의존 없이 이미지 변경을 원자적으로 처리할 수 있다.

## 영향

`PATCH /api/v1/performances/{performanceId}/basic-information`은 기본 정보만 변경한다. 배역은 `/roles` 하위 경로의 POST·PATCH·DELETE로 관리한다. 새 포스터 검증 실패 시 제목·주소 변경도 모두 롤백된다. 이전 포스터의 물리 삭제는 참조 정리 배치가 도입될 때 처리한다.
