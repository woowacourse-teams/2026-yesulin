# 백엔드 도메인 구현

공통 제품 규칙은 [공통 도메인](../../docs/domain.md)을 따른다. 이 문서는 aggregate와 영속 경계를 설명한다.

## 회원과 프로필

- `Member`는 `APPLICANT` 또는 `PRODUCER` 유형을 가지며 기획사 회원은 `PENDING` 또는 `ACTIVE` 상태를 가진다.
- `SocialAccount`는 `(issuer, subject)`를 고유 연결 키로 사용한다.
- `Producer`는 회사명, 담당자명·역할과 설명을 관리한다.
- `ApplicantProfile`은 기본 정보와 추가 정보를 부분 갱신한다. 사진·영상 보관함은 별도 aggregate다.

## 공연과 공고

- `Performance`는 owner, 포스터 파일, 제목, 구조화된 장소와 공연 배역을 소유한다.
- `Audition`은 공연과 owner를 참조하고 UUID 공개 ID, 제목, 공연 기간, `DRAFT/PUBLISHED/CLOSED`를 소유한다.
- 공고의 배역, 일정, 지원 폼은 각각 `AuditionRoleSection`, `AuditionSchedule`, `AuditionForm` aggregate로 저장한다.
- 기본 정보 수정 메서드는 현재 상태별 잠금 검사를 하지 않는다.
- 게시 정책은 세 섹션 존재, 모집 종료가 미래인지, 전형이 공연 종료일 안에 있는지를 확인한다.
- 게시 요청은 이미 PUBLISHED이면 현재 값을 그대로 반환한다.

## 지원서

- `SubmissionService`가 공고 조회, 중복 제출, 모집 기간, 배역, form 답변, 사진 파일과 동의를 순서대로 검증한다.
- DB unique constraint도 `(applicantId, auditionId)` 중복 제출을 방지한다.
- `Submission`은 `AuditionSnapshot`, `ApplicantSnapshot`, `SelectedRoles`, `SubmissionFormAnswers`를 소유한다.
- 동의 문서 metadata와 제출 사진·포스터 파일 참조는 지원서 저장과 같은 트랜잭션에서 기록한다.
- 제출 목록·상세는 저장된 스냅샷을 읽고 파일 서비스가 읽기 URL을 붙인다.

## 심사

- `AuditionScreening`이 대상 승계, 결과 변경, 집계와 종료 조건을 계산한다.
- 결과를 저장하지 않은 대상은 `PENDING`으로 계산한다.
- 이전 모든 차수의 결과가 `PASS`인 지원서만 현재 차수에 포함한다.
- 결과는 `PENDING`, `PASS`, `FAIL`, `ETC`다.
- `ScreeningCompletion`은 `auditionRoleId` unique 레코드다. 모든 차수의 pending 수가 0일 때 한 번 생성한다.
- 종료 후 review 변경은 `INVALID_SCREENING_REVIEW`, 미완료 종료는 `SCREENING_ROUND_NOT_READY`다.
