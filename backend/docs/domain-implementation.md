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
  제출은 OTR 공고 행을 잠근 상태에서 마감일을 확인하고 커밋해 배역별 심사 종료와 순서를 보장한다.
  공개 조회와 제출 시의 공연사명이 달라지면 스냅샷 버전 불일치로 재동의를 요구한다.
  기존 공연·공고 심사 aggregate와 데이터 저장은 분리한다. OTR 전용 심사 결과와 배역별 완료 기록을 저장하고,
  기본 1차 서류 심사의 목록·상세·결정·마감 응답은 기존 심사 화면 계약과 같은 형태로 제공한다.
  새 지원서가 접수될 수 있는 동안 심사를 종료하지 않도록 지원 마감 다음 날부터 배역별 종료를 허용한다.

## 무료 공연과 예매

- `Show`는 소유 기획사, UUID 공개 ID, 제목, 장르(`MUSICAL`·`PLAY`), 소개, 장소(`PerformanceVenue` 재사용), 러닝타임,
  관람 연령, 문의 전화, 포스터와 상세 이미지 파일 ID(최대 3개), `DRAFT/OPEN/CLOSED`를 소유한다. 오디션 `Performance`와 연결하지 않는다.
  관객 안내로 주최 이름(`host_name`, 빈 값이면 기획사 회사명), `ShowLink`(버튼 이름·http/https 주소, 최대 3개, `show_links`),
  `ShowGuide`(제목·내용, 최대 5개, `show_guides`), 잔여석 공개 여부를 갖고 `updateAudienceGuide`로 함께 바꾼다.
  주최 이름은 `Show.hostNameOr`로 정하며 회사명은 응답을 만들 때 `Producer`에서 읽는다(공연에 복사하지 않는다).
  잔여석 숨김은 `PublicShowService`가 응답에서 `remainingSeats`를 비우는 방식이다.
- `ShowSession`은 공연 ID, 시작 시각, 정원만 저장하는 별도 aggregate다. 잔여석은 저장하지 않고 확정 예매 매수로 계산한다.
- `Reservation`은 회차 ID, 8자리 예매번호, `Booker`(이름·휴대폰), 매수(1~10), 동의 문서 버전, `CONFIRMED/CANCELED`,
  기획사 메모(300자 이하)를 저장한다. 생성·취소·매수 변경 때 `ReservationConfirmedEvent`, `ReservationCanceledEvent`,
  `ReservationTicketCountChangedEvent`를 등록한다. 매수 변경은 확정 예매만 가능하다.
- `ReservationService.reserve`는 회차 행을 `PESSIMISTIC_WRITE`로 잠근 뒤 같은 번호의 확정 예매와 확정 매수를 다시 읽는다.
  같은 회차의 예매는 모두 이 잠금을 거치므로 중복 번호와 정원 초과를 DB 제약 없이 막는다.
  정원 수정·회차 삭제·공연 삭제·매수 변경도 같은 잠금을 잡는다.
  MySQL 기본 REPEATABLE READ에서는 잠금 전 첫 조회의 스냅샷을 계속 읽어 먼저 확정된 예매를 놓치므로, 잠금에 기대는
  예매·정원 수정·회차 삭제·공연 삭제·매수 변경 트랜잭션은 `READ_COMMITTED`로 실행한다. H2 테스트는 이 차이를 재현하지 못한다.
- 포스터·상세 이미지는 `SHOW_POSTER`, `SHOW_IMAGE` 파일 참조로 연결하고 공연 수정 시 모두 다시 연결한다.

## 공고 알림

- `domain/notice`는 지원 접수용 `OtrAudition`과 별개인 외부 공고 알림 이력을 정의한다.
  `Notice`는 JPA 엔티티이며 `NoticeRepository`는 같은 domain 패키지에서 `JpaRepository`를 직접 확장한다.
  `notices` 테이블과 `(source, external_id)` 유니크 제약은 Flyway migration으로 생성한다.
- `Notice`는 출처와 외부 공고 ID를 별도 필드로 저장하고 두 컬럼의 유니크 제약으로 중복을 판별한다.
  OTR adapter는 `source=OTR`, `externalId=vid`로 매핑한다. DB에는 기술 식별자와 두 값, 알림 상태만 보관한다.
  알림 상태는 `NoticeStatusConverter`로 문자열 컬럼에 매핑한다.
  이전 스키마에 저장하던 내용·시각 컬럼은 후속 migration에서 제거한다.
- `application/notice`의 `AuditionContent`는 외부 공고 ID, 분류, 제목, 보수, 마감, 원문 URL을 담지만
  DB에는 저장하지 않는다. 보수·마감은 `협의`, `상시` 등의 표현을 보존한다.
  업로드 시각은 읽지 않으며 신규 판별에는 외부 공고 ID를 사용한다. ID·제목·링크는 필수다.
- 최초 실행을 포함해 처음 발견한 공고는 `PENDING`으로 저장하고 알림을 시도한다.
  수집한 공고마다 기존 출처·외부 ID를 확인하고 새 공고만 같은 트랜잭션에 등록한다.
  빈 응답이나 수집 실패는 새 공고를 만들지 않는다.
  같은 출처·외부 ID의 기존 상태는 덮어쓰지 않고 수정 알림은 보내지 않는다.
  이미 카카오 오픈채팅방에 올린 공고를 다시 게시할지는 Slack 알림을 받은 운영자가 판단한다.
- 전송 성공을 확인한 뒤 `SENT`로 바꾼다. 실패하면 `PENDING`을 유지하여 다음 실행에 재시도한다.
  재시도 대상이 현재 목록에 있으면 목록의 데이터를 사용하고, 없으면 상세 페이지를 다시 조회한다.
  최근 목록에 없는 미전송 공고는 `AuditionSource.fetchById`로 원문을 다시 조회한다.
  원문 조회도 실패하거나 OTR에서 삭제되어 조회 불가능하면 대기 상태로 남는다.
  수집 실패 시에도 기존 대기 공고 전송을 시도한다.
  목록·상세 조회 실패는 해당 위치에서 `AuditionNoticeNotifier.sendError`로 별도 알림을 보낸다.
  공고가 없어도 조회 실패 자체를 알린다.
- 한 실행에서 최대 100개를 DB ID 순으로 조회하고, 5개씩 나누어 알림을 전송한다.
  내용 조회에 실패한 공고는 대기 상태로 남기고 나머지를 전송한다. 묶음 전송 성공 후 해당 공고를
  하나의 트랜잭션에서 `SENT`로 바꾼다. 한 묶음의 전송 실패는 뒤 묶음의 전송을 막지 않는다.
  등록 실패는 해당 실행을 중단하고 다음 실행에서 재시도한다.
- `application/notice`의 `AuditionSource`는 공고 수집 port이며 `getSource()`로 출처를 제공한다.
  `AuditionNoticeNotifier`는 공고 알림과 수집 오류 알림을 각각 전송하는 port다.
  `infrastructure/crawler`의 `OtrAuditionSource`는 Jsoup으로 목록 첫 페이지만 요청하고 상단 고정 공지를 제외한다.
  목록 행 번호가 아닌 상세 링크의 `vid`를 식별자로 사용하며, 보수·마감 원문을 그대로 읽는다.
  `fetchById`는 해당 `vid`의 상세 페이지에서 다시 읽는다. HTTP 또는 HTML 구조 오류는 예외로 전달한다.
  `AuditionNoticeService`가 `NoticeRepository`를 직접 사용한다. 전체 실행을 트랜잭션으로 묶지 않고
  수집 결과 저장과 묶음 전송 완료 기록에만 짧은 트랜잭션을 적용한다. DB 트랜잭션을 잡은 채 외부 요청을 수행하지 않는다.
  동시 수집의 삽입 충돌은 유니크 제약으로 거절되고 해당 수집 트랜잭션은 롤백된다. 다음 실행에서 재수집한다.
- `AuditionNoticeService`는 Spring bean으로 등록한다. `@EnableScheduling`은 전체 환경에서 활성화하고
  `presentation/scheduler/notice`의 공고 스케줄러만 DEV 프로필에서 실행한다.
  매일 한국 시간 09:00~20:00에 10분 간격으로 실행한다.
  OTR 수집기와 Slack Incoming Webhook 전송 adapter를 사용하며 웹훅은 DEV 암호화 설정에만 둔다.
  PROD 웹훅 설정과 자동 실행은 아직 적용하지 않는다.
- 현재 목록 여러 페이지 탐색과 분산 실행 잠금은 미구현이다. 별도 DB adapter는 두지 않는다.
  중복 저장 방지와 중복 전송 방지는 별개다. 배포 중 동시 실행 및 전송 성공 후 상태 저장 전 종료로 인한 재전송은
  아직 허용하며 exactly-once 전달을 보장하지 않는다. 수집 누락 방지를 위한 페이지 탐색 범위는 추후 adapter에서 정한다.

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
