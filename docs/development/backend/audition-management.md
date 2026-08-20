---
audience: team
ai-context: on-demand
status: active
---

# 공고 관리

공고(`Audition`)는 공연에 속하며 공연사가 섹션별로 나눠 작성한다. 이 문서는 목표 범위와 현재 구현을
구분한다.

## 모델과 생명주기

- `Audition`: 공연·소유자, 기본 정보와 `DRAFT → PUBLISHED → CLOSED` 생명주기를 관리한다.
- 기본 정보를 완성한 첫 저장에서 DRAFT를 생성한다. 생성된 기본 정보 안에는 nullable 미완성 값을 두지 않는다.
- 배역·일정·지원 폼은 `auditionId`로 연결된 별도 Aggregate로 관리한다.
- 게시할 때 application이 모든 섹션을 조회해 필수 규칙을 검사한다.
- 섹션 하나를 저장할 때 다른 섹션을 함께 읽거나 잠그지 않는다.

## 단계

1. **기본 정보**: 공고명, 공연 시작일, 선택적인 종료일
2. **배역 관리**: 공연 배역 선택, 복수 배역 지원 허용 여부
3. **일정**: 모집 시작·종료 시각, 전형 1~5개
4. **지원 폼**: 기본·추가 항목, 사진, 영상 링크, 추가 질문
5. **게시**: 전체 섹션 검증과 상태 전이

### 기본 정보

공고명과 `PerformancePeriod`는 `Audition`이 직접 소유한다. 기간은 시작일과 선택 종료일을 묶고 종료일이
없으면 응답의 `openRun`을 `true`로 계산한다. 별도 boolean을 저장하지 않아 종료일과 상태가 모순되지
않게 하며 종료일은 시작일보다 빠를 수 없다. 기본 정보는 DRAFT와 PUBLISHED 상태에서 모두 수정할 수 있다.

### 배역 정책

- 공고는 공연에 등록된 배역을 하나 이상 선택한다.
- 공고 배역은 공연 배역 ID와 모집 인원·성별·최소/최대 나이만 저장하며 이름·설명은 공연에서 조회한다.
- `multipleRoleApplicationsAllowed=false`면 지원자는 정확히 한 배역을 선택한다.
- `true`면 공고에 배역이 두 개 이상 있어야 하고, 지원자는 그중 하나 이상을 선택할 수 있다.
- 배역 섹션을 만들지 않은 DRAFT는 허용하지만 저장하는 배역 섹션은 위 조건을 만족해야 한다.
- `AuditionRoleSelections`가 개수·중복·복수 지원 규칙을 생성 시 검증하고, `AuditionRoles`가 순서와 기존 ID 유지를 관리한다.

### 일정

- 모집 시작·종료는 시각까지 저장한다.
- 전형은 기본 한 개이며 최대 다섯 개다. 이름·날짜·선택 안내를 가지며 안내는 100자까지다.
- 모집 종료는 시작보다 늦어야 하고 전형 날짜는 진행 순서에서 거스를 수 없다.
- 일정 저장은 전체 교체다. 기존 전형은 응답의 `stageId`를 다시 보내 정체성을 유지하고,
  새 전형은 ID를 보내지 않는다. 목록에서 빠진 전형은 삭제된다.
- command는 입력을 불변 일정 계획으로 변환한다. 기간·개수·중복 ID·날짜 순서는 도메인 값과
  일급 컬렉션이 검증하고 service는 소유권 확인과 저장만 조율한다.
- 동일 공고의 일정 저장은 공고 행에 쓰기 잠금을 걸어 직렬화한다. 동시 최초 저장의 중복 INSERT와
  교체 트랜잭션의 교차 실행을 막는다. 버전 계약은 두지 않아 시간차가 있는 순차 저장은 마지막 요청이 우선한다.

### 지원 폼

- 기본 항목: 이름, 키, 몸무게, 생년월일, 성별, 연락처, 이메일, 거주지 중 받을 항목을 선택한다.
- 추가 항목: 학력, SNS·외부 링크, 국적, 자기소개, 특기, 취미, 군필 여부, 경력 중 선택한다.
- 선택한 기본 항목은 지원할 때 필수이고 선택한 추가 항목은 nullable이다.
- 사진 요구 장수의 합은 최대 10장이고 영상 링크 요구는 최대 5개다. 사진·영상 요구와 추가 질문은
  순서와 ID를 유지해 이후 지원 답변이 각각 `(requirementId, fileId)`, `(requirementId, url)`,
  `(questionId, answer)`로 연결될 수 있게 한다.
- 추가 질문 문구는 최대 255자이며 답변의 서비스 최대 길이는 2,000자다.
- 지원 폼 저장은 전체 교체다. 빈 목록은 해당 종류를 받지 않는다는 뜻이고, 기존 항목은 응답 ID를
  다시 보내 정체성을 유지한다. 동일 공고 저장은 공고 행의 쓰기 잠금으로 직렬화한다.

### 게시

- 배역·일정·지원 폼 섹션이 모두 저장된 공고만 게시할 수 있다. 각 섹션 내부 규칙은 저장 시 이미 검증한다.
- 모집 시작 시각이 지났어도 게시할 수 있지만 모집 종료 시각이 지났거나 같은 시각이면 게시할 수 없다.
- `PUT /publication`은 멱등하다. 이미 게시된 공고를 다시 요청해도 최초 `publishedAt`을 유지한다.
- 영속 상태는 `DRAFT`, `PUBLISHED`, `CLOSED`만 사용한다. 예정·모집 중·접수 마감 표시는
  `PUBLISHED`와 모집 기간을 기준으로 조회 시 계산한다.
- 게시와 기본 정보·배역·일정·지원 폼 저장은 모두 공고 행의 쓰기 잠금을 사용해 서로 직렬화한다.
- 이번 API는 공연사용 상태 전이만 제공한다. 배우용 공개 조회 읽기 모델은 별도 조회 기능에서 구성한다.

공고 모델은 위에서 확정한 정보만 가진다. 장소·공고 포스터·지원 안내처럼 목록에 없는 값은 추가하지
않으며, 공연에 이미 속한 정보를 공고에 임의로 중복 저장하지 않는다.

## 현재 API

```http
POST /api/v1/auditions
GET  /api/v1/auditions/{auditionId}
PUT  /api/v1/auditions/{auditionId}/basic-information
GET  /api/v1/auditions/{auditionId}/roles
PUT  /api/v1/auditions/{auditionId}/roles
GET  /api/v1/auditions/{auditionId}/schedule
PUT  /api/v1/auditions/{auditionId}/schedule
GET  /api/v1/auditions/{auditionId}/application-form
PUT  /api/v1/auditions/{auditionId}/application-form
PUT  /api/v1/auditions/{auditionId}/publication
```

생성 API는 `performanceId`, `title`, `performanceStartDate`, 선택적인 `performanceEndDate`를 받아 유효한
DRAFT를 반환한다. 생성·조회·기본 정보 수정은 `/auditions`를 기준으로 한 Controller와 Service가 담당한다.
특정 공연 기준 목록 조회가 필요할 때만 `/performances/{performanceId}/auditions`를 사용한다. 공연사 소유
공고만 접근할 수 있다. 기본 정보와 배역·일정·지원 폼 저장, 게시는 공고 행 잠금으로 직렬화한다. 배역 `PUT`은 섹션
전체를 저장하고 기존 공연 배역을 다시 선택하면 공고 배역 ID를 유지한다. 일정 GET·PUT은 모집 기간과
전형 1~5개를 조회하고 전체 저장한다. 지원 폼 GET·PUT은 표준 항목과 사진·영상·질문 요구 전체를
조회하고 저장한다. 게시 `PUT`은 모든 섹션과 모집 종료 시각을 검증한 뒤 `PUBLISHED`로 전이한다.

생성·수정 command가 날짜 입력을 `PerformancePeriod`로 변환하고 service는 완성된 VO를 도메인에 전달한다.
공연이 없거나 세션 소유자의 공연이 아니면 존재 여부를 구분하지 않고 `PERFORMANCE_NOT_FOUND`로 응답한다.
