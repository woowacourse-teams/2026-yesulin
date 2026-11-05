# 의견 보내기

작업 ID `2026-11-05-feedback-launcher`, 평가일 2026-11-05, 의견 보내기 v1(이번 작업에서 도메인 문서 최초 작성).
우테코 크루 피드백("사용 중 불편한 점을 바로 보내기 어렵다")에 따라 공개 화면 어디서나 의견을 보내는 기능을 만든다.
슬랙 채널·웹훅 연결은 [이슈 #536](https://github.com/woowacourse-teams/2026-yesulin/issues/536)에서 진행한다.

| ID | 흐름 단계 / 실패 경계 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| F1 | API 계약 | DTO·도메인·api.md·프론트 타입·MSW 일치, CSRF, 비회원·역할별 처리 | 코드 대조, 서비스 테스트 | Y | PASS |
| F2 | 개인정보 | 연락처 원문·회원 번호·쿼리는 알림·로그에 없음, 경로 정제, 슬랙 문구 위조 방지 | 도메인·서비스 테스트, 코드 검토 | Y | PASS(수정 후) |
| F3 | 안정성 | 커밋 뒤에만 알림, 알림 실패가 접수에 영향 없음, 웹훅 없으면 로그만 | 서비스 테스트(트랜잭션 밖 호출 확인) | Y | PASS |
| F4 | 마이그레이션 | MySQL·H2 호환, 버전 순서, 엔티티 길이 일치 | H2 Flyway+validate, Flyway 순서·호환 검사 스크립트 | Y | PASS |
| F5 | 화면 사용성·접근성 | 모바일 버튼 이름, 라디오 키보드, 실패 시 입력 유지, 중복 전송 방지, 다른 고정 버튼 비가림 | 컴포넌트 테스트, 로컬 MSW PC·375px | Y | PASS(수정 후) |
| F6 | 탑재 위치 | 공개 화면·커뮤니티에 한 번씩, 작업공간·관리자 제외 | 평가자 탑재 위치 조사 | Y | PASS |
| F7 | 코드 규칙·미사용 | 새 코드 규칙 준수, 미사용 없음 | eslint, checkstyle, 코드 검토 | Y | PASS(수정 후) |
| F8 | 남용 | 반복 전송으로 슬랙·DB가 넘치지 않음 | 서비스 테스트(5건 초과 거절) | Y | PASS(수정 후) |

## 실행 근거

- 백엔드 `./gradlew test --tests 'art.yesulin.feedback.*'` 9개 통과(도메인 6, 서비스 3), `global` 패키지 테스트 통과,
  `checkstyleMain checkstyleTest` 통과, `check_flyway_migration_order.sh origin/dev`·`check_flyway_contract_changes.sh origin/dev` 통과.
- 프론트 `npm test` 181파일 중 180 통과, 1000개 중 994 통과. 실패 6개는 dev에서도 같은 기존 `actor-pages/actor-screen-view.test.tsx`.
  eslint 통과, 변경 파일 tsc 오류 없음.
- 로컬 MSW에서 홈·커뮤니티(PC·375px) 버튼과 작성 창, 오류예요 선택 후 전송 → 201 → 감사 화면 확인. 375px 공연 상세에서 버튼 아래끝 720px,
  예매 바 위끝 744px로 겹치지 않음 확인. 동적 불러오기 뒤 전송 성공 확인.
- 실제 백엔드 HTTP 요청: 로컬 백엔드가 작업 환경 제약으로 MySQL에 연결하지 못해 실행하지 못했다. 서비스 테스트가 H2에서 실제 마이그레이션을 적용했다.

## 독립 평가 1회

2026-11-05 읽기 전용 별도 평가 1회. 상대 도구를 쓸 수 없어 같은 종류의 별도 평가자로 대체했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-11-05-feedback-launcher-F01 | P1 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 1200px 미만 공연 상세에서 버튼이 하단 예매 버튼을 가림. 예매 바가 있으면 버튼을 그 위로 올림. 375px 좌표로 확인 |
| 2026-11-05-feedback-launcher-F02 | P2 / POLICY / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 화면 경로를 그대로 슬랙에 넣어 줄바꿈·`<!channel>`로 문구 위조 가능. URL 경로 문자만 허용하고 슬랙 문구 escape. 테스트 추가 |
| 2026-11-05-feedback-launcher-F03 | P2 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 비로그인 공개 쓰기에 횟수 제한이 없어 슬랙·DB가 넘칠 수 있음. 접속 주소당 10분 5건, 초과 시 429. 테스트 추가 |
| 2026-11-05-feedback-launcher-F04 | P3 / DOC / INTRODUCED | INDEPENDENT_REVIEW | FIXED | DTO의 경로 2000자 제한이 문서에 없음. 제한을 없애고 자르기·정제 규칙을 api.md에 기록 |
| 2026-11-05-feedback-launcher-F05 | P3 / TEST / INTRODUCED | INDEPENDENT_REVIEW | FIXED | MSW가 길이 검증을 하지 않음. 1000·100자 검증 추가 |
| 2026-11-05-feedback-launcher-F06 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 미리보기를 escape 뒤 잘라 문자 참조가 끊길 수 있음. 자른 뒤 escape |
| 2026-11-05-feedback-launcher-F07 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 모달이 공개 화면 색 범위 밖이라 브랜드색이 다름. `public-theme` 적용 |
| 2026-11-05-feedback-launcher-F08 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 회원 유형을 이름 문자열로 대응. 명시적 switch로 변경 |
| 2026-11-05-feedback-launcher-F09 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 전송 함수가 10줄 권고 초과. 보내기와 제출 확인으로 분리 |
| 2026-11-05-feedback-launcher-F10 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW | FIXED | 모바일 맨 아래에서 버튼이 꼬리말 링크를 가릴 수 있음. 760px 이하 꼬리말 아래 여백 추가 |
| 2026-11-05-feedback-launcher-F11 | P3 / TEST / INTRODUCED | POST_FIX_CHECK | FIXED | 공통 꼬리말이 요청 모듈을 불러와 Sentry를 목으로 바꾸지 않은 기존 테스트(`session-picker.test.tsx`)가 깨짐. 요청 모듈을 보낼 때 불러오도록 변경 |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | F01~F10 | CONFIRMED | 2026-11-05T19:12:00+09:00 | 평가 보고 | PENDING |
| E02 | F11 | CONFIRMED | 2026-11-05T19:15:00+09:00 | 수정 후 관련 테스트 실행 실패 | PENDING |
| E03 | F01~F11 | FIXED | 2026-11-05T19:17:32+09:00 | 백엔드 9테스트·checkstyle, 프론트 전체 테스트(기존 실패 6 제외)·eslint, 375px 좌표 확인 | PENDING |

## 판정

필수 PASS8 / FAIL0 / UNVERIFIED0 / N/A0, 검증률 8/8.
신규 확정 11 / 해결 11 / 미해결 0, P0=0 P1=1 P2=2 P3=8. PRECHECK0 / INDEPENDENT_REVIEW10 / POST_FIX_CHECK1 / EXTERNAL0, 오탐0.
미확인: 실제 MySQL·실제 HTTP 요청(병합 후 dev에서 확인), 실제 슬랙 수신(이슈 #536), 슬랙의 `<!channel>` 해석 여부(경로에서 꺾쇠를 막아 영향 없음),
여러 서버 인스턴스에서의 횟수 제한(서버마다 따로 셈).
