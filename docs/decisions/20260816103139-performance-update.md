---
status: accepted
date: 2026-08-16
agent-required: true
---

# 공연 수정과 포스터 변경 이벤트

## 계기

공연 수정에서 배역을 매번 삭제·재생성하면 이후 공고가 참조할 배역 ID가 불안정해지고, 포스터만 바꿀 때 새 파일의 업로드·소유권 검증이 누락될 수 있다.

## 결정

공연 기본 정보, 포스터와 배역 수정 API를 분리한다. 기본 정보는 제목과 도로명주소만 수정한다. 포스터는 완료된 파일 ID로 교체한다. 배역은 공연 하위 리소스로 하나씩 추가·수정·삭제하고 각 ID를 유지한다. 다른 공연의 배역 ID와 같은 공연 안의 중복 이름은 거부한다. 포스터 ID가 실제로 달라질 때만 공연 ID와 이전·신규 파일 ID를 가진 `PerformancePosterChangedEvent`를 발행한다. presentation event adapter가 신규 파일을 검증하고 포스터 참조 행을 교체한다.

## 이유

제목·장소 수정이 파일 검증에 영향받지 않고, 배역 편집이 기본 정보나 다른 배역을 덮어쓰지 않게 한다. 파일 application과 공연 application의 직접 서비스 의존 없이 이미지 변경을 원자적으로 처리할 수 있다.

## 영향

`PATCH /api/v1/performances/{performanceId}/basic-information`은 제목·장소를, `/poster`는 포스터 참조를 변경한다. 배역은 `/roles` 하위 경로의 POST·PATCH·DELETE로 관리한다. 새 포스터 검증 실패는 제목·주소에 영향을 주지 않는다. 이전 포스터의 물리 삭제는 참조 정리 배치가 도입될 때 처리한다.
