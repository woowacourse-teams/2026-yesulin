# 심사·일정 회귀 검증

작업 ID `2026-10-31-audition-regression`, Audit/Timetable v1, 2026-10-31.
사용자 요청: 기능 수정은 중단하고 현재 상태를 꼼꼼히 테스트. 제품 코드 수정 없이 자동 검사와 로컬 합성 데이터 실제 흐름을 검증한다.

| ID | 기대 결과·실패 경계 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| R1 | 프론트 전체 회귀·정적 검사·빌드 | Vitest/lint/build | Y | PASS |
| R2 | 심사·공연사 일정 및 기존 익명 일정 도메인 회귀 | Gradle tests/checkstyle | Y | FAIL |
| R3 | PDF 열람·배역·메모·판정 저장/재조회 | 로컬 합성 브라우저 | Y | PASS |
| R4 | 전체/선택 연락처 복사·누락/여러값·권한 거절 | UI 테스트+브라우저 | Y | PASS |
| R5 | 일정 생성·이름만 등록·중복 재등록·저장 재조회 | 로컬 합성 브라우저 | Y | PASS |
| R6 | 개인/일괄 배정·해제·되돌리기·보기 전환·이탈 보호 | 로컬 브라우저+테스트 | Y | PASS |
| R7 | 실패 재시도·낡은 수정 충돌·소유권·문자 부작용 방지 | 서비스/화면 테스트 | Y | PASS |
| R8 | 기존 UX 미해결·미사용·독립 평가1회 | 실제 화면·정적 검토 | Y | PASS |

기존 UX 발견2건은 `2026-10-31-timetable-ux-audit-F01/F02`를 참조하고 신규 건수에 중복 가산하지 않는다.
상단 PDF 심사/오디션 일정 분리는 설계 의견만 제시하며 이번에 구현하지 않는다.
실제 지원자·운영 배포·외부 문자/메일 발송·300명 부하/AI 정확도 실측은 범위 밖.

## 실행 근거

환경: 2026-10-31, macOS, 로컬 실제 API/합성 PDF 지원자, 현재 feat/audition-management 작업 트리. 제품 소스 변경 없음.

- R1: `frontend/npm test` 136파일 743개 통과. 최초 제한 환경은 로컬 포트 EPERM으로 4개 실패했으나 동일 소스를 포트 허용 환경에서 재실행해 통과. `/private/tmp/yesulin-regression-frontend-final.log`.
  `npm run lint` 종료0. `npm run build` 종료0, 컴파일·TypeScript·정적 생성 완료. 최초 제한 환경 빌드는 진행되지 않아 중단 후 동일 명령 재실행. 기존 복수 lockfile에 따른 workspace root 경고는 남음. `/private/tmp/yesulin-regression-lint.log`, `/private/tmp/yesulin-regression-build-final.log`.
- R2: `backend/./gradlew test --tests 'art.yesulin.audit.*' --tests 'art.yesulin.timetable.*'` 15클래스 117개 중 102통과/15실패/0건너뜀. 실패는 업무 assertion이 아니라 아래 F01 때문에 context 기동 실패. 전체 백엔드 테스트 수로 표현하지 않는다. `./gradlew checkstyleMain checkstyleTest` 성공(UP-TO-DATE). 로그 `/private/tmp/yesulin-regression-backend.log`, `/private/tmp/yesulin-regression-style.log`; XML `backend/build/test-results/test/TEST-*.xml`.
- R3: 기존 합성 테스트마루의 PDF 앱 뷰 1/1쪽 실제 렌더링 확인. 메모 변경, 윤서진→앙상블 배역 저장, 보류→합격으로 변경해 합격자 목록 9→10명 반영. 페이지 새로고침 후 합격/앙상블/수정 메모 유지 확인. 검증 후 원래 보류/윤서진/메모로 복구했고 합격9·보류1·불합격1로 돌아옴. 이전·다음 지원자 이동 확인. 실제 지원자 판정 없음.
- R4: 전체9명/선택2명 복사 UI 실행 및 완료 상태. 복사 직렬화의 이름·배역·전화·이메일·누락/여러값·셀 안전 처리, 선택 범위, clipboard 권한 거절 시 수동 복사, 응답 전 성공 금지는 `review-passed-contacts.test.tsx` 3개로 검증. 브라우저 clipboard 읽기는 텍스트를 반환하지 않아 OS/엑셀 붙여넣기 결과를 직접 확인한 것은 아님.
- R5: 실제 로컬 UI에서 `[테스트] 1031 회귀 검증` 일정 생성, 이메일테스트가람과 연락처 없는 테스트다온 2명 등록. 동일 인원을 다시 가져오면 `이미 등록됨`과 `선택한 0명 일정에 등록` 비활성 확인. 검증용 일정만 추가했고 기존 일정은 수정하지 않음.
- R6: 두 명을 2026-11-07 14:20으로 일괄 적용·저장 → 테스트다온 15:30 개별 변경 → 연락처 보기 왕복 후 변경 보존·저장 → 이메일테스트가람 배정 해제·되돌리기·다시 해제 저장. 테스트다온 전화/이메일 보완 저장. 새로고침 후 명단 재선택 시 테스트다온 15:30·보완 연락처, 이메일테스트가람 미배정 확인. `/private/tmp/yesulin-regression-saved.png`.
  전체 취소·다른 폼 보존·이탈 취소 시 입력 유지·진행중 요청 보호는 `review-timetable-panel.test.tsx` 12개에서 검증. 실제 브라우저 confirm 취소/브라우저 닫기 경고는 직접 검증하지 않았으며 자동 테스트 근거와 구분한다.
- R7: 위 화면 테스트의 저장 실패 재시도·생성 응답 유실 동일키·401 처리, `ProducerTimetableServiceTest` 10개 모두 통과(소유권·다른 소스·비합격·연락처 검증·300명 제한·동시 중복 생성/등록·배정 충돌 전체원자성·원본 유지·초대 미생성). 해당 서비스 테스트는 Flyway 비활성+create-drop이므로 migration 성공 근거가 아니다. 메시지 큐 미생성과 초대 상태를 검사했고 실제 문자/메일은 발송하지 않음.
- R8: 이전 UX 문제 2건은 그대로 OPEN. 날짜·시간/연락처 보기를 실제 왕복했고 연락처 뷰에 배정 도구가 남음을 재확인. 독립 평가 결과는 아래에 추가한다.

## 신규 확정 문제

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-10-31-audition-regression-F01 | P2 / TEST / EXISTING | PRECHECK | OPEN | `V20261031150000__add_owned_timetable_rosters.sql` 첫 다중 ALTER 구문을 H2 MySQL mode가 거절. AuditProgressServiceDatabaseTest 5, PdfSourceDeduplicationDatabaseTest 6, TimetableControllerTest 4가 context 기동 실패. 같은 원인1건으로 집계. 사용자 테스트만 요청하여 미수정. MySQL 운영 장애로 판정하지 않음. |

최초 기록 PR: PENDING. 해결 시각: 해당 없음. 이번 작업이 유입시킨 결함은 아니며 이전 구현 작업에서 추가된 migration이 원인.

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audition-regression-F01 | CONFIRMED | 2026-10-31T19:17:40+09:00 | Gradle 실패 로그·XML의 H2 SQLState42000, migration 기동 실패 | PENDING |

## 범위와 판정

필수 PASS7 / FAIL1 / UNVERIFIED0 / N/A0, 검증률7/8. 이는 위 복합 기준의 명시한 자동+로컬 근거에 한정하며 완전한 E2E/모든 환경 통과를 뜻하지 않는다. 최종 결과: 회귀검사 실패가 남아 전체 통과 아님.
신규 발견2 / 해결0 / 미해결2 / P0=0 P1=0 P2=1 P3=1. PRECHECK1 / INDEPENDENT_REVIEW1 / POST_FIX_CHECK0 / 오탐0.
기존 UX 문제2건은 기존 ID 참조, 신규 발견에 중복 합산하지 않음.

미실측: 실제 운영 배포/MySQL 신규 migration 적용, 모든 백엔드 도메인, 새 ProducerTimetableController 전용 HTTP 자동테스트(없음), 실제 네트워크 장애·두 브라우저 동시 편집, OS/엑셀 붙여넣기, native confirm 취소/닫기, 모바일 재실행, 300명 화면 성능, 새 PDF 대량 업로드/AI 정확도. 300명 서비스 상한 테스트와 300명 UI 성능은 다르다.

상단 분리 의견: 공연사 전역 `PDF 심사 | 오디션 일정`으로 분리하는 방향이 현재 소유권 단위 일정 API·다중 심사함 명단 취합 구조와 맞음. 심사 영역의 합격자 연락처/복사는 독립적으로 유지하고 선택자만 일정에 추가한다. 일정 영역에서는 일정 목록→명단→날짜·시간/연락처로 진입한다. 이동 시 미저장 보호 유지. 이번 구현 없음.

## 독립 평가 1회 완료

2026-10-31, 읽기 전용 별도 평가 1회. 상대 도구 미제공으로 같은 종류의 독립 평가자로 대체했다. 평가자는 도메인 흐름·정책, 누적 diff·사용처, 이번 평가표·테스트 로그/XML을 검토했다. 신규 기능 회귀와 미사용 제품 코드/설정/의존성은 추가로 발견하지 못했다. 기존 익명 일정 경로는 별도 실제 소비자가 있으므로 유지한다. 테스트 프리뷰/가이드 생성 파일은 가이드 제작 근거이며 이번 테스트에서 제품 코드로 편입하지 않았다.

F01의 단일 원인/15 context 시작 실패 및 H2 한정 영향을 독립 확인했다. 기존 UX 문제 2건은 기능 완료와 구분한다. 아래 문서 문제 1건을 추가 발견했다. 사용자 테스트만 요청으로 이번 제품/기존 기록 수정 없음. PR 생성/게시 없음.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 | 상태 | 근거·조치 |
| --- | --- | --- | --- | --- |
| 2026-10-31-audition-regression-F02 | P3 / DOC / EXISTING | INDEPENDENT_REVIEW | OPEN | `2026-10-31-timetable-ux-fix.md:70~73`은 ux-audit-F01~F04 해결 및 원문 E01~E08을 참조하지만 현재 ux-audit.md:34~42는 같은 F01/F02를 toast/배정저장 잔존이라는 다른 미해결 문제에 재사용하고 E01/E02만 보존. 이전 감사 이력·집계 충돌. 후속 작업에서 원래 이력 복원과 재점검 별도 작업ID 배정 필요. 이번 신규 테스트 기록은 과거 해결 집계를 신뢰해 완료로 바꾸지 않음. |

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E02 | 2026-10-31-audition-regression-F02 | CONFIRMED | 2026-10-31T19:21:00+09:00 | 독립 평가와 두 문서 직접 대조 | PENDING |

F02 해결 시각: 해당 없음. 기존 UX 2건 참조는 현재 파일에 기록된 19:14 재점검 내용의 인용이며, 18:50 해결된 과거4건과 동일 문제라는 의미가 아니다. 기록 식별자 충돌이 해소되기 전 기간별 결함 통계에 이 ID들을 자동 병합하지 않는다.

## PR 통합 후속 검증

`2026-10-31-audition-pr-integration`에서 F01의 다중 ALTER를 단일 ALTER들로 분리했다.
전체 `./gradlew build` 성공: 233클래스 1,404테스트, 실패/오류/건너뜀0. 이전15개 context 실패 포함 모든 테스트 통과.
기존 회귀 당시 FAIL 판정/이력은 보존하고 F01의 현재 상태만 FIXED로 갱신한다.
F02는 19:14 재점검 ID를 `timetable-ux-recheck`로 분리했으나 이전4건 원본 이력은 미복원으로 OPEN 유지.
현재 이 작업의 문제 현황: 발견2 / 해결1 / 미해결1, P2 1 / P3 1. 최초 기록 PR PENDING.

| 사건 ID | 문제 ID | 사건 종류 | 발생 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E03 | 2026-10-31-audition-regression-F01 | FIXED | 2026-10-31T19:45:13+09:00 | SQL 분리, 전체 backend build 1404테스트 통과 | PENDING |
