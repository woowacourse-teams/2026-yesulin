# 인증 메일 로고와 복사 기능 확인

- 작업 ID: `2026-11-02-auth-verification-mail-logo`
- 평가일: 2026-11-02 (Asia/Seoul), 인증 흐름 평가표 v1
- 이슈: [#492](https://github.com/woowacourse-teams/2026-yesulin/issues/492)
- 선행 작업: [메일 디자인](2026-11-02-verification-mail-design.md)
- 기준: [가입과 인증 복구](../flows/producer-auth.md), [인증 작업 규칙](../AGENTS.md)
- 요청: 문자로 만든 헤더를 실제 로고 파일로 교체하고 인증번호 복사 아이콘 가능 여부 확인.
- 사용자에게 일반 HTML 이메일의 JavaScript 제약을 설명했다. 동작하지 않는 복사 버튼·새 인증 경로는 추가하지 않으며 인증번호는 연속된 선택 가능한 텍스트로 유지한다.

## 수정 전 평가표

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| L01 | 로고 / 잘못된 자산·깨진 주소 | 웹에서 사용하는 투명 PNG, 공개 HTTPS 200 image/png, 원본 비율과 alt=예술in | 공개 응답·저장소 SHA256 대조·미리보기 | Y | PASS |
| L02 | 이미지 제한 / 인증 정보 소실 | 로고를 불러오지 않아도 코드·만료·복구 안내 유지 | 이미지 차단 복사본 미리보기·factory 테스트 | Y | PASS |
| L03 | 모바일 / 넘침·로고 변형 | 1440/390/320 CSS px에서 overflow 없이 고정 비율 표시 | 브라우저 실측·스크린샷 | Y | PASS |
| L04 | 복사 / 거짓 기능·추적·인증번호 노출 | 코드에 공백·개행이 없고 버튼·스크립트·코드를 담은 링크 없음 | HTML 분석·factory 및 서비스 테스트 | Y | PASS |
| L05 | 발신 / 첨부·MIME 중첩 회귀·템플릿 누락 | external PNG 1개 외 새 의존성/설정/파일 없이 alternative 두 부분 유지, JAR에 템플릿 포함 | 표적 테스트·bootJar·localhost SMTP·독립 평가 | Y | PASS |
| L06 | 실제 메일 클라이언트 | Gmail/네이버 실제 수신·이미지 프록시·Outlook·다크 모드·스팸 분류 | 외부 발송 미실시 | N | UNVERIFIED |
| L07 | 편집 보호 | 해당 없음 | 발신 본문 표시만 변경 | N | N/A |

## 평가 결과

- 독립 평가: 1회 완료. Claude CLI 부재로 별도 Codex 평가자가 읽기 전용 검토했으며 재귀 평가를 수행하지 않았다.
- 필수: PASS 5 / FAIL 0 / UNVERIFIED 0. 비필수 UNVERIFIED 1 / N/A 1.
- 신규 확정: 발견 0 / 해결 0 / 미해결 0 (P0~P3 각 0).
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.

## 근거와 선택

- 기존 웹 자산 `frontend/public/images/yesulin-logo-transparent.png`와 `https://yesulin.art/images/yesulin-logo-transparent.png`의 SHA256 일치: `e9e9c87d7ef0b50c67ce840879a761f1cebb3700eddb9f6a735eafffa4f67792`. 1040×608 RGBA PNG. 웹 공용 헤더도 이 파일을 사용한다.
- CID/base64 삽입 대신 기존 공개 HTTPS 이미지를 사용해 인증 메일 MIME과 배포 자산을 추가하지 않는다. URL에 개인 식별자나 인증번호를 넣지 않는다. 메일 클라이언트의 이미지 차단·프록시 정책에 따라 로고 표시가 달라질 수 있다.
- [Mailchimp HTML 이메일 제약](https://mailchimp.com/help/limitations-of-html-email/): 일반 메일의 JavaScript는 대부분 메일함에서 동작하지 않는다. 클립보드 API를 호출하는 아이콘을 메일 본문에 넣지 않는다.
- AMP 기반 동적 이메일은 별도 형식·발신자 등록·클라이언트 지원이 필요하므로 이 표시 변경에 도입하지 않는다. [Google AMP 안내](https://developers.google.com/workspace/gmail/ampemail)

## 추가 전용 상태 사건 이력

확정 결함 없음. 발견·해결 사건 0건.

## 실행 검증

- Java 25: `./gradlew test --tests art.yesulin.auth.application.EmailVerificationMailFactoryTest --tests art.yesulin.auth.application.EmailVerificationCodeServiceTest --tests art.yesulin.auth.application.EmailVerificationServiceTest --tests art.yesulin.infrastructure.mail.GoogleSmtpMailSenderTest checkstyleTest bootJar --console=plain` 종료 0. 표적 테스트 11개 통과, 실패/오류/건너뜀 0.
- `GoogleSmtpMailSender`와 실제 factory를 localhost SMTP로 실행해 캡처. 루트 multipart/alternative, 일반 텍스트→HTML 두 부분만 유지. 인증번호는 합성값만 사용했고 외부 메일은 보내지 않았다.
- JAR의 `BOOT-INF/classes/mail/email-verification.html` 바이트가 소스와 일치한다.
- CUA 미리보기에서 실제 PNG 로드(naturalWidth=1040) 확인. 표시 폭 104px, 원본 비율 유지. CSS viewport 1440/390/320px에서 clientWidth=scrollWidth 확인. 숫자는 공백 없는 000123이며 이미지·버튼으로 변환하지 않았다.
- 로고만 404로 바꾼 정적 복사본에서 이미지 로드 실패(naturalWidth=0), alt=예술in, 인증번호·날짜/한국시간 만료·재전송 안내와 가로 넘침 없음을 확인했다. 실제 이메일 클라이언트의 차단 UI와 동일하다고 주장하지 않는다.
- 산출물: `/private/tmp/yesulin-mail-logo-preview.png`, `/private/tmp/yesulin-mail-logo-mobile.png`, `/private/tmp/yesulin-mail-logo-narrow.png`, `/private/tmp/yesulin-mail-logo-blocked.png`. 실제 factory에서 생성한 미리보기 `http://127.0.0.1:3011/`.

## 독립 평가 기록

- 기록 시각: 2026-11-02T23:57:26+09:00
- L01~L05 PASS 5 / FAIL 0 / 필수 UNVERIFIED 0, 비필수 L06 UNVERIFIED 1, L07 N/A 1. 미확인 총 1건.
- 확정 결함 없음. 발견 0 / 해결 0 / 미해결 0, P0~P3 각 0, 오탐 0. 상태 변경 사건 없음.
- 공개 자산 SHA256·헤더 소비자·정상/로드 실패 미리보기·표적 테스트 XML·패키징·localhost SMTP를 독립 확인했다. 새 의존성/설정/자산 파일·미사용 코드가 없다.
- 산출물 축약명을 실제 절대 경로로 명시하고 선행 평가 기록에 후속 변경 링크를 추가하라는 편의성 제안을 반영했다. 결함으로 집계하지 않는다.
- 실제 Gmail/네이버 수신과 이미지 프록시·클라이언트별 렌더링·스팸 개선은 미확인이다. 복사 버튼 구현이나 실제 수신 검증 완료를 주장하지 않는다.

## 기존 PR에 통합

- 기록 시각: 2026-11-02T23:59:02+09:00
- 사용자 요청으로 별도 작업 공간의 검증된 변경을 기존 인증 화면 PR [#491](https://github.com/woowacourse-teams/2026-yesulin/pull/491)의 브랜치로 합쳤다. 최초 메일 변경 게시 PR은 #491이며 이슈 #492를 함께 연결한다.
- 원래 별도 보관 결정과 검증 당시 기록은 이력으로 보존한다. 파일의 기능 변경은 없으며 원본과 동일한 메일 구현·테스트를 옮겼다. 실제 수신·스팸 개선은 미확인 상태를 유지한다.

## 통합 브랜치 최종 검증

- 검증 시각: 2026-11-03T00:01:59+09:00
- 기존 PR 브랜치를 origin/dev에 rebase(변경 없음)한 뒤 Java 25 `./gradlew build --console=plain` 성공. 최종 로고 포함 상태에서 테스트 1,440개 중 통과 1,438 / 실패 0 / 오류 0 / 기존 dormant MySQL 건너뜀 2. checkstyleMain/checkstyleTest/bootJar 통과.
- JAR 템플릿 바이트 일치 확인. 독립 평가를 받은 구현·테스트 5파일과 통합 브랜치의 바이트 일치를 확인했다. 평가 문제/미확인 판정은 변하지 않는다.
