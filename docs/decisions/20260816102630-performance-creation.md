---
status: accepted
date: 2026-08-16
agent-required: true
---

# 공연 추가와 포스터 참조 확정

## 계기

공연이 미완료·타인 소유 파일을 포스터로 참조하면 공연 row와 Storage 상태가 불일치할 수 있다. 파일 application이 공연 서비스를 직접 알아도 계층 간 결합이 커진다.

## 결정

공연은 소유자, 완료된 포스터 `fileId`, 제목, 도로명주소와 0개 이상의 배역을 저장한다. 각 배역은 독립 ID와 이름·한 줄 설명을 가지며 공연 내부 일급 컬렉션이 순서와 이름 중복을 관리한다. 공연 저장 시 `PerformanceCreatedEvent`를 발행한다. presentation event adapter가 `BEFORE_COMMIT`에 파일 application을 호출해 같은 소유자의 `READY` 파일인지 확인하고, 실패하면 공연 트랜잭션을 롤백한다.

## 이유

공연과 파일을 JPA 연관으로 결합하지 않고도 참조 무결성을 커밋 전에 보장한다. 공연 도메인은 공연 사건만 발행하고 파일 application/domain은 공연을 알지 않는다.

## 영향

`POST /api/v1/performances`는 세션 소유자를 사용하고 생성된 공연과 배역 ID를 반환한다. 파일 상태는 `READY`로 유지하며 확정된 참조의 정본은 공연의 `poster_file_id`다.
