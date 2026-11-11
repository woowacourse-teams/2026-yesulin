# 테스트 기준

팀이 지금 테스트를 무엇을 기준으로 쓰는지 정리한다. 새 테스트를 늘리려는 문서가 아니라, 2026-11-11 `dev`의
테스트 코드에 이미 드러난 판단을 글로 옮긴 것이다. 기준과 실제가 어긋난 곳도 [마지막 절](#기준과-실제가-어긋난-곳)에 그대로 적는다.

- 범위: 백엔드(Spring 애플리케이션과 배포 스크립트). 웹 프론트엔드는 이 문서에서 다루지 않는다.
- 레이어별로 테스트를 어디에 쓰는지는 [백엔드 작업 규칙](../backend/AGENTS.md#검증)이 정본이다. 이 문서는 그 이유와
  의존을 다루는 방법을 설명한다.
- 현재 규모: 테스트 파일 253개. 운영 기능 테스트 179개(domain 51 · application 79 · presentation 23 · infrastructure 17 ·
  global 8 · 앱 기동 1)와, 운영 화면과 연결되지 않은 `dormant` 기능의 테스트 74개다.

## 1. 테스트로 지키려는 것

| 지키려는 것 | 이유 | 드러난 테스트 |
| --- | --- | --- |
| 공연사는 자기 공고·업로드·심사만 보고 고칠 수 있다 | 배우 지원서와 공연사 정보가 들어 있어, 남에게 한 번 보이면 되돌릴 수 없다 | `AuditionPostOwnerWriteTest`, `PdfAiRetryServiceTest#onlyOwnerOrAdministratorCanRetryEvenWhenAlreadyProcessing` |
| 공연사가 적은 심사 메모와 판정은 자동 분석이 덮어쓰지 않는다 | 심사 결과는 사람이 내린 결정이라 잃으면 다시 만들 수 없다 | `AuditTest#analysisNeverOverwritesMemoOrDecision` |
| 같은 요청이 겹쳐도 한 번만 처리되고 한도를 넘지 않는다 | 버튼 연타, 재시도, PDF 추출 결과의 중복 수신이 실제로 생긴다. 겹치면 AI 비용이 두 번 나가거나 데이터가 둘로 갈린다 | `ActorRequestConcurrencyTest`, `PdfExtractionResultReceiverDatabaseTest`, `PdfAiRetryServiceTest#duplicateClicksOnlyQueueOnceAndReopenProcessingAfterFailure` |
| 운영 데이터가 있는 테이블을 바꾸는 마이그레이션은 기존 행을 맞게 옮긴다 | 코드는 직전 버전으로 되돌릴 수 있어도 DB는 백업 복원 말고는 되돌릴 방법이 없다 | `*MigrationTest` 9개, 예: `AuditionPostReviewStatusMigrationTest` |
| 마감·만료·재전송 대기처럼 시각에 따라 달라지는 규칙 | 실제 시계에 기대면 실행한 날짜에 따라 결과가 바뀐다 | `EmailVerificationCodeTest#expiresExactlyAfterFiveMinutes`, 고정 `Clock`을 주입하는 테스트 24개 |
| 배포 스크립트는 실패를 실패로 알린다 | 고장 난 버전이 성공으로 처리되면 그 버전이 실제 트래픽을 받는다 | `backend/deploy/tests/validate_service_test.sh` 등 6개 |

## 2. 일부러 테스트하지 않는 것

| 하지 않는 것 | 이유 | 대신 확인하는 방법 |
| --- | --- | --- |
| presentation(Controller·DTO·필터)에 새 테스트를 추가하지 않는다 | 화면과 API를 2주 스프린트마다 자주 바꿔, 요청 형식 테스트는 고치는 비용이 크다 | 로컬과 DEV에서 실제 요청으로 확인하고 `backend/docs/api.md`를 함께 맞춘다 |
| infrastructure(S3·메일·Slack·문자 업체·AI 호출)에 새 테스트를 추가하지 않는다 | 외부 서비스를 흉내 낸 테스트는 실제 실패 원인(권한, 요금 한도, 응답 형식 변경)을 잡지 못한다 | DEV에서 실제로 호출해 본다 |
| `dormant` 기능에 새 테스트를 추가하지 않는다 (규칙 문서에는 없고 지금의 관행이다. 10.8 이후 추가 없음) | 운영 화면과 연결되지 않은 기능이다 | 기존 테스트는 지우지 않고, 변경으로 깨지면 고친다 |
| 처리량·무중단 배포를 테스트 코드로 검증하지 않는다 | 단일 JVM 테스트로는 서버 사양과 로드 밸런서 동작이 재현되지 않는다 | 별도 측정으로 남긴다: 부하 테스트(스프린트 2), 배포 중 외부 요청 측정 `ops/loadtest/deploy-availability.py` |
| 화면까지 이어지는 자동 E2E를 두지 않는다 | 화면이 스프린트마다 바뀌어 E2E를 유지하는 비용이 크다 | DEV에서 사람이 핵심 흐름을 직접 따라가 본다 |

presentation·infrastructure 기존 테스트는 지우지 않는다. 변경으로 깨지면 그 변경에 맞게 고친다.

## 3. 대상별 테스트 수준

| 대상 | 수준 | 방법 | 그렇게 정한 이유 |
| --- | --- | --- | --- |
| domain 규칙 (엔티티·값 객체) | 단위 | Spring 없이 객체만 만들어 검증한다. domain 테스트 51개 중 39개 | 심사 상태, 공고 상태, 인증 코드 만료 같은 규칙은 DB 없이 판단되고 가장 자주 바뀐다. 빠르게 많이 돌린다 |
| application 서비스 | 단위와 통합을 나눠 쓴다 | 79개 중 37개는 Spring 없이 리포지토리·외부 연동을 목이나 가짜 구현으로 바꿔 흐름과 분기를 본다. 42개는 `@SpringBootTest`·`@DataJpaTest`와 H2(MySQL 모드)로 실제 쿼리와 트랜잭션을 실행한다 | 순서·분기 판단은 빠른 단위 테스트로 충분하다. 권한 검사, 트랜잭션, 중복 저장처럼 DB가 맞물려야 드러나는 흐름은 실제 쿼리로 돌려야 한다 |
| 동시 요청 | 통합 | 스레드 여러 개로 같은 요청을 동시에 보낸다 (`CountDownLatch`, `ExecutorService`). 21개 파일 | 중복 처리와 한도 초과는 순서대로 실행하는 테스트로는 드러나지 않는다 |
| 마이그레이션 | 통합 | Flyway를 바꾸기 직전 버전까지 적용하고, 옛 형태의 행을 넣은 뒤, 새 마이그레이션을 적용해 결과를 확인한다 | 운영 DB는 되돌릴 수 없어 배포 전에 옛 데이터로 확인해야 한다 |
| presentation · infrastructure | 직접 확인 | 위 2절 | 위 2절 |
| 배포 스크립트 | 스크립트 테스트 | `systemctl`, `curl`, `journalctl` 같은 명령을 가짜 실행 파일로 바꿔 스크립트의 성공·실패 판정을 확인한다 | 서비스가 뜨지 않거나 응답이 늦는 실패 분기는 실제 서버에서 일부러 만들기 어렵다. 판정이 틀리면 고장 난 버전이 트래픽을 받는다 |

## 4. 의존을 다루는 방법

원칙: **외부 서비스의 동작이 아니라, 그 결과를 받은 우리 코드의 처리(실패, 재시도, 중복)를 검증한다.** DB가
맞물리는 규칙(권한, 트랜잭션, 중복 저장)은 DB를 흉내 내지 않고 실제로 쿼리를 실행한다.

| 의존 | 테스트에서 다루는 방법 | 이유 |
| --- | --- | --- |
| DB | DB가 필요한 테스트는 대부분 클래스마다 이름이 다른 H2 메모리 DB(MySQL 모드)를 쓴다. 스키마는 Flyway 마이그레이션으로 만들거나(`ddl-auto=validate`), 엔티티에서 바로 만든다(`create-drop`). 흐름만 보는 서비스 단위 테스트는 리포지토리를 목으로 바꾼다 | 쿼리, 제약, 트랜잭션은 실제로 실행해야 위험이 드러난다. DB 이름을 나눠 테스트끼리 데이터가 섞이지 않게 한다 |
| 파일 저장소(S3) | 메모리 구현 `FakeObjectStorage` | 업로드·복사·삭제 결과를 테스트 안에서 바로 확인한다 |
| 메일 | `FakeMailSender`, 테스트 설정에서 `yesulin.mail.enabled=false` | 실제 메일을 보내지 않고 보낸 내용만 확인한다 |
| Slack 등 알림 | 알림 인터페이스를 `@MockitoBean`으로 바꿔 호출 여부만 확인한다 | 알림 내용 형식보다 "보내야 할 때 보내는지"가 중요하다 |
| PDF 추출 Lambda·AI 분석 | 저장소는 Fake, 디스패처·큐는 `@MockitoBean` | AI 결과 자체가 아니라 실패·재시도·중복 결과를 받았을 때의 처리를 본다 |
| 시간 | 고정 시각의 `Clock`을 주입한다 | 만료·마감 규칙을 날짜와 무관하게 재현한다 |
| 세션·소셜 로그인 | 테스트 설정에서 JDBC 세션 자동 설정을 빼고 소셜 로그인을 끈다 | 외부 로그인 없이 서비스 흐름만 검증한다 |

테스트 설정은 `backend/src/test/resources/application.properties`와 `backend/build.gradle.kts`의 `tasks.withType<Test>`에 있다.

## 5. 언제 실행되나

- `dev`·`main`으로 가는 PR과 push마다 CI가 `./gradlew build`(테스트와 Checkstyle)와 배포 스크립트 테스트를 실행한다.
  Flyway 마이그레이션 순서·계약 검사는 PR에서만 실행한다 (`.github/workflows/ci.yml`).
- Git hook에서는 테스트를 돌리지 않는다. 테스트는 CI에서 확인한다.

## 6. 분야별 기준

### 백엔드

팀 기준을 그대로 따른다. 위 팀 기준은 백엔드 코드에서 정리한 것이다.
Java 밖 코드에 대해서만 덧붙인다.

- 배포 스크립트(`backend/deploy/scripts/`)는 셸 테스트로 확인하고 CI에서 실행한다.
- PDF 추출 Lambda(`ops/pdf-extraction-lambda/`)는 Python `unittest`로 결과 처리와 이미지 분류를 확인한다.
  CI에는 아직 넣지 않았고 로컬에서 실행한다.

기준이 드러난 테스트 코드:

- [AuditionPostOwnerWriteTest](../backend/src/test/java/art/yesulin/auditionpost/application/AuditionPostOwnerWriteTest.java):
  공연사는 자기 공고만 보고 고치며, 남의 업로드는 쓰지 못한다 (권한, application 통합, 스키마는 `create-drop`)
- [AuditTest](../backend/src/test/java/art/yesulin/audit/domain/AuditTest.java):
  자동 분석이 공연사의 메모와 판정을 덮어쓰지 않는다 (domain 단위, Spring 없음)
- [ActorRequestConcurrencyTest](../backend/src/test/java/art/yesulin/actor/application/ActorRequestConcurrencyTest.java):
  동시에 들어온 첫 PDF 가져오기는 작업 하나만 만들고, 관심 배우 한도를 넘지 않는다 (동시 요청, Flyway 스키마, Fake 저장소)
- [AuditionPostReviewStatusMigrationTest](../backend/src/test/java/art/yesulin/auditionpost/domain/AuditionPostReviewStatusMigrationTest.java):
  옛 공고 행을 넣고 마이그레이션을 적용해 상태가 맞게 나뉘는지 본다 (마이그레이션)
- [validate_service_test.sh](../backend/deploy/tests/validate_service_test.sh):
  배포 후 상태 확인 스크립트의 성공·실패 판정 (배포 스크립트)

## 기준과 실제가 어긋난 곳

- **H2는 MySQL과 다르게 동작하는 부분이 있다.**
  - 예매의 `READ_COMMITTED` 잠금 동작은 H2에서 재현되지 않는다 ([도메인 구현](../backend/docs/domain-implementation.md)).
  - 2026-10-28 DEV 배포에서 H2 테스트는 통과했지만, MySQL의 행 크기 제한(오류 1118)에 걸려 마이그레이션이
    반쯤 적용됐다 (#412에서 수정, [배포 트러블슈팅 기록](../design/deploy-troubleshooting-record.md)).
  - 실제 MySQL로 마이그레이션을 검사하는 단계는 아직 CI에 없다.
- **Spring 테스트(`@SpringBootTest`·`@DataJpaTest`) 80개 중 43개는 Flyway를 끄고 엔티티에서 스키마를 만든다(`create-drop`).** 이 테스트들은
  운영과 같은 마이그레이션을 거치지 않아, 마이그레이션과 엔티티가 어긋나도 잡지 못한다. 그 확인은 Flyway를 켠
  나머지 테스트와 `*MigrationTest`에 기대고 있다.
- **presentation 23개, infrastructure 17개 테스트가 남아 있다.** 대부분 "새로 추가하지 않는다" 규칙(10.4)을 정하기
  전에 썼지만, 규칙 뒤에 추가된 것도 3개 있다(`AdminShowManagementControllerTest`, `FeedbackControllerTest`,
  `FeedbackWebhookFallbackTest`). 규칙이 지켜지는지 확인하는 장치는 없다.
- **운영과 연결되지 않은 `dormant` 기능의 테스트가 74개로 전체의 약 30%다.** 빌드 시간에는 들어가지만 운영 위험은 지키지 않는다.
- **PDF 추출 Lambda 테스트는 CI에서 돌지 않는다.** 로컬에서 실행하지 않으면 깨진 것을 모른 채 배포될 수 있다.
