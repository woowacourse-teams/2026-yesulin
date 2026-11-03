# 경력 월 필수 입력

- 작업 ID `2026-11-03-career-month` / 평가표 v1 / PR PENDING
- 사용자 결정: 새 경력·수정 경력의 월은 필수. 기존 연도만 있는 경력은 그대로 보존한다. 임의의 월을 채우지 않는다.
- 적용 범위: 프로필·지원서 입력/검증/왕복/보존, 공개·미리보기·제출 스냅샷, PDF 제안, 월 정렬과 중복 판정.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| M01 | 신규·수정 월 누락/0/13/소수 | UI·서버 거절, 기존 동일 경력만 월 없이 유지 | 도메인·프론트 테스트·실제 요청 | Y | PASS |
| M02 | 기존 데이터 재조회/무관 필드 저장 | 월 null·기존 원문/스냅샷 보존 | 마이그레이션·도메인 테스트 | Y | PASS |
| M03 | 최신순·같은 월·미상 월 | 장르별 연월 내림차순, 미상 월은 같은 해 마지막, 동률 원순서 | 정렬 테스트 | Y | PASS |
| M04 | prefill·초안·제출·프로필 병합 | 월 유실 없음, 월별 다른 경력 구분, 제출 멱등성 유지 | 관련 테스트 | Y | PASS |
| M05 | PDF 월 미상/기간 모호 | 월 추정 금지, 직접 입력 후 저장 | 파서·적용 테스트 | Y | PASS |
| M06 | 접근성·PC·모바일·오류 복구 | 필수 월 선택과 오류, 긴 날짜 overflow 없음 | 브라우저·컴포넌트 | Y | PASS |
| M07 | 계약·정리·정적 검증 | API/MSW/문서 일치, 미사용 항목 없음 | lint/build/checkstyle·독립 평가 | Y | PASS |

프로필 공개 동의·사진·권한 변경은 N/A. 실제 PDF AI 재실행은 파서만 변경하므로 범위 밖이다. 저장/제출 분석 이벤트는 기존 API 성공 지점과 개인정보 제외를 유지한다.

## 검증·평가

- 독립 평가 1회 완료. 상대 CLI 부재로 같은 종류의 별도 읽기 전용 평가로 대체. 이후 발견/수정 부분만 표적 검증했다.
- 필수 PASS 7 / FAIL 0 / UNVERIFIED 0, 경계 N/A는 위 사유 참조. 검증률 7/7은 아래 실행 범위에 한한다.
- 신규 확정 발견 4 / 해결 4 / 미해결 0 / P0 0 / P1 0 / P2 3 / P3 1 / 오탐 0 / 평가표 미확인 0.
- 발견 경로 PRECHECK 1 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 1 / EXTERNAL 0. 최초 PR은 모두 PENDING이며 PR 미생성.

### 검증 근거

- 프론트 전체 테스트: 152파일854항목 중850 PASS, 임시 HTTP 포트를 열지 못한 환경 실패4건은 실행 허용 후 해당 파일 재실행4 PASS. 수정 후 `profile-careers.test.ts` 8항목 PASS(오류행/필드, legacy 보존, 범위/복제 거절 포함). 같은 항목을 중복 합산하지 않는다.
- 프론트 전체 lint PASS, 수정 후 관련 lint·`tsc --noEmit` PASS. webpack production build PASS(56개 정적 페이지), 오류 필드 및 관리자 월 표시 수정 후 build 재실행 PASS.
- 백엔드 actor/submission 1차 PASS. 최종 범위 테스트188항목 중186 PASS·기존 skip2, CheckstyleMain/Test PASS. 빈 기본정보 보완 후 `ProfileCareerServiceTest`12항목 PASS와 Checkstyle PASS. 신규 제출 월 검증 표적 명령 결과는 아래 추가 기록 참조.
- 마이그레이션: 3개 경력 테이블에 nullable career_month와1~12 CHECK. 과거 행이 null로 남는 upgrade 테스트와 JPA validate PASS. 임의 월 backfill 없음.
- 격리된 H2 임시 서버(local 프로필, loopback 임의 포트, 가짜 저장소·메일)에서 세션·CSRF를 거친 실제 프로필 HTTP PATCH: 신규 null/0/13/1.5 →400, 신규3 →200, DB에 과거 null 행을 만든 뒤 동일 경력 →200, 제목 수정·월null →400. `CAREER_HTTP PASS`. 확인 후 서버 종료. 실제/운영 DB는 변경하지 않았다.
- 브라우저 MSW: 월 미선택인 기존 경력의 제목 수정 후 저장 →오류·월 초점,3월 선택 후 저장 →성공·저장값 유지. 추가2번째 경력만 월 누락 →`경력 2` 안내, activeIndex=1·activeField=month 확인. 정상1번째 월로 이동하지 않음.
- 공개 데모: YYYY.MM과 과거 YYYY 병행 표시. PC1234px·모바일390×844설정(관측 CSS innerWidth433·scrollWidth416)에서 overflow 없음, 날짜 셀 너비/scrollWidth 모두80px. 프로필 모바일 월 선택 컨트롤 약302px. 검사 후 viewport 복원, 배우 상세 경력 영역 표시.
- 공개/미리보기·prefill·지원서 초안/본문·프로필 병합·심사/관리자 조회·인쇄의 month 전달을 코드와 관련 테스트로 확인. PDF 단일 연월/연도만/모호한 기간 파서 테스트 PASS. 실제 AI 재실행·모든 심사 화면의 브라우저·실기기·운영 마이그레이션은 미실행 범위다.
- 저장·제출·PDF 분석 이벤트의 성공 지점과 속성은 변경하지 않았다. 기존 analytics 테스트는 전체 테스트에 포함, 경력 원문·연월을 새 분석 속성으로 보내지 않는다.
- 미사용 코드·파일·설정·의존성 추가 없음. nullable 읽기/DB는 사용자가 허용한 과거 경력과 기존 제출 스냅샷이 소비하므로 유지한다. 새 쓰기는 월 필수로 검증한다. 호환성 제거는 기존 월 미상 데이터가 더 이상 없을 때만 가능하다.
- `git diff --check` PASS. 캡처와 실제 HTTP 상태 요약은 `output/career-month-2026-11-03/` 로컬 산출물이다.

### 문제 현황

| ID | 심각도·유형·유입 | 발견 경로 | 근거와 조치 | 상태·수정 후 검증 | 최초 확정 / 해결 / 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03-career-month-F01 | P2 FLOW INTRODUCED | INDEPENDENT_REVIEW | 경력 오류 때 첫 월에 초점. index/field를 반환하고 실제 입력에 대응시킴 | FIXED · helper 테스트와2번째 월 브라우저 초점 확인 | 2026-11-03T15:13:23+09:00 / 2026-11-03T15:13:23+09:00 / PENDING |
| 2026-11-03-career-month-F02 | P2 CODE INTRODUCED | INDEPENDENT_REVIEW | 관리자 제출 상세에서 month 표시 누락. 공통 careerDateLabel 사용 | FIXED · 타입 검사·빌드·소비 코드 확인 | 2026-11-03T15:13:23+09:00 / 2026-11-03T15:13:23+09:00 / PENDING |
| 2026-11-03-career-month-F03 | P2 CODE EXISTING | POST_FIX_CHECK | 모든 기본정보 열이null이면 JPA 재조회시 embedded가null이 되어 응답500. getter/완성도 계산에서 빈 값 복원 | FIXED · 재조회application회귀와실제HTTP null경력보존200 | 2026-11-03T15:07:43+09:00 / 2026-11-03T15:13:23+09:00 / PENDING |
| 2026-11-03-career-month-F04 | P3 TEST EXISTING | PRECHECK | 기존 QR 테스트에서 overloaded toString mockResolvedValue 타입이void로추론돼 tsc 실패. Promise 반환 mockImplementation으로 변경 | FIXED · tsc·관련테스트·production build | 2026-11-03T15:13:23+09:00 / 2026-11-03T15:13:23+09:00 / PENDING |

F01·F02·F04의 확정 시각은 검증 근거를 수합해 현황을 확정한 기록 시각이다.

### 상태 사건 이력 (추가 전용)

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거·PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-03-career-month-F01 | CONFIRMED | 2026-11-03T15:13:23+09:00 | 위 근거 / PENDING |
| E02 | 2026-11-03-career-month-F01 | FIXED | 2026-11-03T15:13:23+09:00 | 위 표적 검증 / PENDING |
| E03 | 2026-11-03-career-month-F02 | CONFIRMED | 2026-11-03T15:13:23+09:00 | 위 근거 / PENDING |
| E04 | 2026-11-03-career-month-F02 | FIXED | 2026-11-03T15:13:23+09:00 | 위 표적 검증 / PENDING |
| E05 | 2026-11-03-career-month-F03 | CONFIRMED | 2026-11-03T15:07:43+09:00 | 위 근거 / PENDING |
| E06 | 2026-11-03-career-month-F03 | FIXED | 2026-11-03T15:13:23+09:00 | 위 표적 검증 / PENDING |
| E07 | 2026-11-03-career-month-F04 | CONFIRMED | 2026-11-03T15:13:23+09:00 | 위 근거 / PENDING |
| E08 | 2026-11-03-career-month-F04 | FIXED | 2026-11-03T15:13:23+09:00 | 위 표적 검증 / PENDING |

- 최종 표적 검증: 신규 지원서 월0/13 거절·12 보존을 포함한 `SubmitSubmissionCommandTest` 3항목 PASS, CheckstyleTest PASS. 수정 후 frontend lint·tsc PASS.
