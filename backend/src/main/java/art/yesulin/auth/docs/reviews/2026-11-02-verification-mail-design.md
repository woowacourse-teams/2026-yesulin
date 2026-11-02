# 인증 메일 발신 형식과 본문 디자인

- 작업 ID: `2026-11-02-auth-verification-mail-design`
- 평가일: 2026-11-02 (Asia/Seoul), 인증 흐름 평가표 v1
- 이슈: [#492](https://github.com/woowacourse-teams/2026-yesulin/issues/492)
- 기준: [가입과 인증 복구](../flows/producer-auth.md), [인증 작업 규칙](../AGENTS.md)
- 작업 전 확인: 동일 From 주소와 Return-Path의 수동 메일은 Gmail 정상 수신, 자동 인증 메일은 Gmail 스팸 수신 사례와 네이버 정상 수신이 보고되었다. 받는 계정과 본문이 달라 단일 원인은 확정하지 않았다. 실제 주소·인증번호·SMTP 자격 증명은 기록하지 않는다.

## 수정 전 평가표

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 발신 형식 / 표시 이름 누락·첨부용 중첩 | 기존 From 주소에 예술in 표시, 루트 alternative에 일반 텍스트→HTML 두 부분만 존재 | 기존 송신자 테스트의 직렬화된 MIME 재파싱 | Y | PASS |
| M02 | 인증 정보 / 앞자리 0 손실·시간대 오류 | 두 본문에 동일한 연속된 6자리, 전달된 만료 시각을 한국시간 날짜와 함께 표시 | factory application 테스트·기존 인증 서비스 테스트 | Y | PASS |
| M03 | 메일 표시 / 좁은 화면 넘침·스타일 의존 | 데스크톱·모바일에서 코드와 안내가 읽히며 외부 이미지·폰트·스크립트 없이 표시 | 실제 생성 HTML 미리보기 1440/390/320px·외부 자산 0·스타일 제거 확인 | Y | PASS |
| M04 | 텍스트 수신 / HTML 전용 안내·재전송 혼동 | 일반 텍스트에도 코드·만료·최신 메일 사용·미요청 안내 제공 | factory 테스트 | Y | PASS |
| M05 | 인증 흐름 / 권한·실패·재전송·복구 회귀 | 기존 코드·해시 저장·만료·횟수·회원/세션 규칙 유지 | 기존 인증 application/domain 테스트 | Y | PASS |
| M06 | 빌드/정리 / 템플릿 패키징 누락·미사용 파일 | 템플릿이 실행 JAR에 포함되고 새 의존성·설정·추적 자산이 불필요하게 남지 않음 | checkstyle·build·JAR 검사·독립 평가 | Y | PASS |
| M07 | 실제 수신 / Gmail 스팸 개선과 렌더링 | 배포 후 같은 Gmail/네이버 수신자에게 변경 전후 비교 | 외부 발송은 이 작업에서 실행하지 않음. 실제 Gmail/네이버·Outlook·다크 모드 미확인 | N | UNVERIFIED |
| M08 | 수동 편집 보호 | 편집/저장 기능 없음 | 발신 본문만 변경 | N | N/A |

## 평가 결과

- 독립 평가: 1회 완료. Claude CLI가 없어 별도 Codex 평가자로 대체했다. 평가자는 읽기 전용으로 검토했으며 재귀 평가를 수행하지 않았다.
- 필수: PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 1. 비필수 실제 수신 UNVERIFIED 1.
- 신규 확정 문제: 발견 0 / 해결 0 / 미해결 0 (P0 0 / P1 0 / P2 0 / P3 0).
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
- 스팸 분류 개선은 미검증이며 MIME 단순화와 발신자 표시가 원인 해결임을 주장하지 않는다.

## 추가 전용 상태 사건 이력

확정 결함 없음. 발견·해결 상태 사건 0건.

## 검증 근거

- `JAVA_HOME=<Java 25> ./gradlew build --console=plain`: BUILD SUCCESSFUL. 테스트 집계 1,440개: 통과 1,438 / 실패 0 / 오류 0 / 건너뜀 2. checkstyleMain/checkstyleTest/bootJar 통과.
- `GoogleSmtpMailSenderTest`: MIME 직렬화→재파싱으로 예술in 발신자, 기존 From·수신자·UTF-8 제목·일반 텍스트/HTML 두 부분 확인. 기존 infrastructure 테스트 보강이며 새로운 infrastructure 테스트 파일은 추가하지 않았다.
- `EmailVerificationMailFactoryTest`: 앞자리 0, 한국시간 자정 경계, 실제 만료 날짜·시각, 미요청·재전송 복구 안내, 외부 링크·이미지·스크립트 부재 검증.
- 외부 SMTP 자격 증명 없이 `JavaMailSenderImpl`과 실제 `GoogleSmtpMailSender`를 localhost:2528 수신기로 실행. 캡처 원본의 루트 `multipart/alternative`, text/plain→text/html, UTF-8, 첨부 0 확인. HTML을 캡처 원본에서 추출해 미리보기에 사용했다. 예제 코드는 합성값이다.
- 실행 JAR의 `BOOT-INF/classes/mail/email-verification.html` 포함 확인. `ClassPathResource`로 로드하며 기존 공장 소비자와 비밀번호 재설정 메일도 전체 테스트 범위에 포함했다.
- CUA 브라우저 실제 CSS viewport 1440/390/320px에서 `documentElement.clientWidth == scrollWidth` 확인, 카드 최대 폭 520px. 외부 자산 0. inline 스타일을 모두 제거한 별도 복사본에서도 코드·만료·복구 안내가 남는 것을 확인했다.
- 로컬 산출물: `/private/tmp/yesulin-mail-preview-desktop.png`, `...-mobile.png`, `...-narrow.png`, `...-unstyled.png`. 미리보기 서버 `http://127.0.0.1:3011/`.
- Gmail/네이버 실제 외부 수신, Outlook 고유 렌더링·다크 모드는 미검증이다. DNS·SMTP 계정·비밀·API·인증 상태 전이·만료 정책은 변경하지 않았다.

## 독립 평가 기록

- 기록 시각: 2026-11-02T23:29:24+09:00
- M01~M06 PASS 6 / FAIL 0 / 필수 UNVERIFIED 0, 비필수 M07 UNVERIFIED 1, M08 N/A 1. 미확인 총 1건이며 실제 수신·특정 메일 클라이언트 확인을 하나의 경계 항목으로 묶었다.
- 확정 결함 없음. 발견 0 / 해결 0 / 미해결 0, P0~P3 각 0, 오탐 0.
- DI·템플릿 참조·실행 JAR 바이트 일치·비밀번호 재설정 소비자 호환성·문서 링크·미사용 코드/파일/설정/의존성/옛 문서를 점검했다. 불필요하게 남은 항목 없음.
- 테스트 XML과 localhost SMTP 캡처, 미리보기 산출물을 독립적으로 확인했다. 기존 dormant MySQL 테스트 2건은 환경 조건으로 건너뛰었으며 이번 인증/메일 테스트의 미실행은 아니다.
- 원래 UI PR #491에는 메일 변경을 섞지 않고 origin/dev 기반 `fix/verification-mail-design` 별도 worktree에 보관한다. 메일 변경 PR은 아직 생성하지 않았다.

## 기술 근거

- [Spring MimeMessageHelper](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/mail/javamail/MimeMessageHelper.html): 표시 이름과 인코딩을 적용하고 비multipart helper에서 헤더를 설정한다.
- [Jakarta MimeMultipart](https://jakarta.ee/specifications/mail/2.1/apidocs/jakarta.mail/jakarta/mail/internet/mimemultipart): 명시적 alternative 루트에 두 대체 본문만 구성한다. 이것이 Gmail 스팸 개선의 증거를 의미하지는 않는다.

## 후속 변경 연결

사용자 요청으로 헤더를 실제 공개 PNG 로고로 바꿨다. 위 외부 자산 0 및 관련 테스트 근거는 로고 추가 전 상태의 평가 기록이다. 현재 자산 허용 범위와 후속 검증은 [로고 평가](2026-11-02-verification-mail-logo.md)를 따른다. 기존 평가 결과와 사건 이력은 덮어쓰지 않는다.

## 기존 PR에 통합

- 기록 시각: 2026-11-02T23:59:02+09:00
- 사용자 요청으로 별도 작업 공간의 검증된 변경을 기존 인증 화면 PR [#491](https://github.com/woowacourse-teams/2026-yesulin/pull/491)의 브랜치로 합쳤다. 최초 메일 변경 게시 PR은 #491이며 이슈 #492를 함께 연결한다.
- 원래 별도 보관 결정과 검증 당시 기록은 이력으로 보존한다. 파일의 기능 변경은 없으며 원본과 동일한 메일 구현·테스트를 옮겼다. 실제 수신·스팸 개선은 미확인 상태를 유지한다.

## 통합 브랜치 최종 검증

- 검증 시각: 2026-11-03T00:01:59+09:00
- 기존 PR 브랜치를 origin/dev에 rebase(변경 없음)한 뒤 Java 25 `./gradlew build --console=plain` 성공. 최종 로고 포함 상태에서 테스트 1,440개 중 통과 1,438 / 실패 0 / 오류 0 / 기존 dormant MySQL 건너뜀 2. checkstyleMain/checkstyleTest/bootJar 통과.
- JAR 템플릿 바이트 일치 확인. 독립 평가를 받은 구현·테스트 5파일과 통합 브랜치의 바이트 일치를 확인했다. 평가 문제/미확인 판정은 변하지 않는다.
