# 백엔드 도메인 구현

공통 제품 규칙은 [공통 도메인](../../docs/domain.md)을 따른다. 이 문서는 aggregate와 영속 경계를 설명한다.

## 회원과 프로필

- `Member`는 `APPLICANT` 또는 `PRODUCER` 유형을 가지며 기획사 회원은 `PENDING` 또는 `ACTIVE` 상태를 가진다.
- `SocialAccount`는 `(issuer, subject)`를 고유 연결 키로 사용한다.
- `Producer`는 회사명, 담당자명·역할과 설명을 관리한다.
- `ApplicantProfile`은 기본 정보와 추가 정보를 부분 갱신한다. 사진·영상 보관함은 별도 aggregate다.

## 공연과 공고

- `Performance`는 owner, 포스터 파일, 제목, 구조화된 장소와 공연 배역을 소유한다.
- `Performance` 수정·삭제는 공연 행을 잠근 뒤 연결된 `Audition`이 없는지 확인한다. 전체 수정은 기존 배역을
  제거한 뒤 요청 배역으로 교체하며, 연결된 공고가 있으면 `PERFORMANCE_HAS_AUDITIONS`로 거부한다.
- `Audition`은 공연과 owner를 참조하고 UUID 공개 ID, 제목, 공연 기간, `DRAFT/PUBLISHED/CLOSED`를 소유한다.
- 공고의 배역, 일정, 지원 폼은 각각 `AuditionRoleSection`, `AuditionSchedule`, `AuditionForm` aggregate로 저장한다.
- 기본 정보 수정 메서드는 현재 상태별 잠금 검사를 하지 않는다.
- 게시 정책은 세 섹션 존재, 모집 종료가 미래인지, 전형이 공연 종료일 안에 있는지를 확인한다.
- 게시 요청은 이미 PUBLISHED이면 현재 값을 그대로 반환한다.

## OTR 공고

- `OtrAudition`은 기존 `Audition`과 별개로 owner, OTR 번호, 제목, 배역명 목록, 마감일만 저장한다.
- `(owner_id, otr_id)` 고유 제약으로 같은 공연사의 중복 등록을 막고 원문 링크는 번호에서 계산한다.
- 공개 조회는 공연사명과 한국 시간 기준 마감 여부를 반환한다. 생성·목록 응답은 지원 경로를 발급한다.
- `OtrSubmission`은 `type=OTR`로 기존 `Submission`과 별도로 OTR 공고, 지원자, 선택 배역, 필수 기본 정보,
  선택 추가 정보·사진 최대 3장·YouTube 영상 최대 3개, 동의 문서 버전·제공받는 공연사명, 제출 시각을 저장한다.
- 서버가 제출 시 한국 시간 기준 마감일과 배역, 중복 지원, 사진 소유권·READY 상태, 영상 URL과 두 동의를 검증한다.
  공개 조회와 제출 시의 공연사명이 달라지면 스냅샷 버전 불일치로 재동의를 요구한다.
  기존 공연·공고 심사 aggregate와 데이터 저장은 분리한다. OTR 전용 심사 결과와 배역별 완료 기록을 저장하고,
  기본 1차 서류 심사의 목록·상세·결정·마감 응답은 기존 심사 화면 계약과 같은 형태로 제공한다.
  새 지원서가 접수될 수 있는 동안 심사를 종료하지 않도록 지원 마감 다음 날부터 배역별 종료를 허용한다.

## 지원서

- 일반 지원서는 `type=STANDARD`로 저장한다. 이전 요청처럼 `type`이 없으면 서버가 `STANDARD`로 간주한다.
- `SubmissionService`가 공고 조회, 중복 제출, 모집 기간, 배역, form 답변, 사진 파일과 동의를 순서대로 검증한다.
- 공개 공고가 발급한 스냅샷 버전과 제출 시점의 공고 ID·기획사명을 비교해, 지원자가 확인한 제3자 제공 대상이
  바뀐 오래된 제출은 저장 전에 거절한다.
- DB unique constraint도 `(applicantId, auditionId)` 중복 제출을 방지한다.
- `Submission`은 `AuditionSnapshot`, `ApplicantSnapshot`, `SelectedRoles`, `SubmissionFormAnswers`를 소유한다.
- 동의 문서 버전과 제출 시점의 제공받는 기획사·제작사명, 제출 사진·포스터 파일 참조는 지원서 저장과 같은 트랜잭션에서 기록한다.
- 제출 목록·상세는 저장된 스냅샷을 읽고 파일 서비스가 읽기 URL을 붙인다.

## 심사

- `AuditionScreening`이 대상 승계, 결과 변경, 집계와 종료 조건을 계산한다.
- 결과를 저장하지 않은 대상은 `PENDING`으로 계산한다.
- 마감된 이전 모든 차수의 결과가 `PASS`인 지원서만 현재 차수에 포함한다.
- 결과는 `PENDING`, `PASS`, `FAIL`, `ETC`다.
- `ScreeningCompletion`은 `(auditionRoleId, screeningStageId)` unique 레코드다. 현재 차수는 `PENDING`이
  남아 있어도 한 번 마감할 수 있고, 다음 차수 대상이 없으면 이후 빈 차수도 함께 마감한다.
- 마감 후 해당 차수 review 변경은 `INVALID_SCREENING_REVIEW`다. 현재 진행 중인 차수가 아닌 차수를 마감하면
  `SCREENING_ROUND_NOT_READY`다.
