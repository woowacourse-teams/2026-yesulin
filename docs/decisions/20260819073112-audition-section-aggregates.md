---
status: accepted
date: 2026-08-19
agent-required: true
---

# 공고 생명주기와 섹션 Aggregate

## 계기

배역·일정·지원 폼을 한 `Audition`에 계속 추가하면 작은 임시 저장도 전체 공고를 읽고 변경하게 되며,
새 섹션마다 공고 모델과 API의 책임이 커진다.

## 결정

`Audition`은 공연·소유자, 기본 정보와 `DRAFT → PUBLISHED → CLOSED` 생명주기를 관리한다. 기본 정보는
공고명과 `PerformancePeriod`이며 완성된 첫 저장에서 DRAFT를 생성한다. 배역, 일정과 지원 폼은
`auditionId`로 연결된 별도 Aggregate로 두고 각자 버전과 규칙을 관리한다. 게시 application이 모든
섹션을 조합해 필수 규칙을 검증한다.

공고는 독립 ID와 생명주기를 가지므로 생성·조회·수정 API를 최상위 `/auditions`에 모은다. 생성 요청의
`performanceId`로 소유 공연을 검증하며 공연 하위 경로는 공연 기준 목록 조회에만 사용한다.

첫 구현은 공고명·공연 시작일·선택 종료일을 가진 기본 정보만 포함한다. 종료일이 없으면 저장된
boolean 없이 `openRun=true`로 계산한다. 나머지 단계와 규칙은 [공고 관리](../backend/audition-management.md)를
따른다.

## 이유

섹션별 저장과 충돌 범위를 작게 유지하고, 이후 섹션을 추가해도 공고 생명주기 모델의 변경을 줄인다.
단일 DB 트랜잭션이 필요한 게시 검증은 application에서 명시적으로 조합한다.

## 영향

공고 생성 시 완성된 기본 정보를 함께 저장한다. 기본 정보는 DRAFT와 PUBLISHED에서 수정할 수 있다.
동시 수정 제어는 실제 충돌 가능성과 사용자 경험을 검토한 뒤 도입한다. 배역·일정·지원 폼과 게시 API는
후속 단계에서 추가한다.
