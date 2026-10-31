# 일정 명단 작업 보기 분리

작업 ID `2026-10-31-timetable-roster-views`, 2026-10-31, v1.
사용자 요청: 배정과 연락처 명단을 연달아 나열하여 스크롤이 길어짐. 작업 선택 버튼으로 하나만 표시한다.

| ID | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| V1 | 배정/연락처 중 한 명단만 보임, 선택 표시 명확 | UI·브라우저 | Y | PASS |
| V2 | 전환해도 배정·연락처 초안과 이탈 보호 유지 | UI 테스트 | Y | PASS |
| V3 | 다른 보기의 변경 저장 후 보존, 서버값 유지 | UI 테스트·브라우저 | Y | PASS |
| V4 | 독립평가·미사용 참조 점검 | 읽기전용 평가 | Y | PASS |

API 변경 없음. 일정 정책 변경 없음. 대규모 검색/날짜 정렬은 범위 밖.

## 결과와 근거

- 독립 평가 1회 완료. 상대 평가 도구가 제공되지 않아 같은 종류의 별도 읽기 전용 평가자를 사용했다.
- 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0, 검증률 100%(이 작업 범위).
- 발견 2 / 해결 2 / 미해결 0, P0 0 / P1 0 / P2 1 / P3 1, PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 1, 오탐 0.
- V1: localhost:3000의 합성 9명 명단에서 두 보기를 전환. 배정 보기에는 배정 목록만, 연락처 보기에는 연락처 목록만 존재. 각각 문서 높이 1807px/1565px. `/private/tmp/yesulin-roster-views.png`.
- V2~V3: `review-timetable-panel.test.tsx`의 왕복 전환/초안 보존/다른 폼 저장/이탈 보호/초점 복귀 검사, 11개 PASS. `/private/tmp/yesulin-roster-views-tests.log`.
- 수정 파일 ESLint PASS. 제품 API·DB 변경 없음. 실제 브라우저 저장은 이전 전체 흐름 점검 기록을 따르며 이번 전환 검사는 저장 요청 없이 진행했다.
- V4: 독립 평가에서 미사용 분기/상태/설정/의존성/옛 문서 추가 없음. 보기 흐름 문서를 함께 갱신했다.
- 운영 배포, 수백 명 명단 성능, 날짜별 필터/검색은 범위 밖. PR 생성하지 않음.

## 문제

| ID | 심각도·유형·유입 | 발견 경로 | 근거·조치 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-10-31-timetable-roster-views-F01 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | 편집 중 보기 왕복 시 이전 DOM ref가 없어져 취소/저장 후 초점 복귀 누락. 배우 ID와 목록 내부 data 속성으로 현재 버튼을 찾아 복원, 왕복 후 취소·저장 표적 테스트 PASS | FIXED |

| 2026-10-31-timetable-roster-views-F02 | P2 / CODE / INTRODUCED | POST_FIX_CHECK | 초점 수정 초안의 ref prop을 공통 버튼 타입이 지원하지 않아 빌드 실패. 공통 컴포넌트 변경 없이 section ref와 data 속성 조회로 수정 | FIXED |

## 추가 전용 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-10-31-timetable-roster-views-F01 | CONFIRMED | 2026-10-31T19:01:07+09:00 | 독립 평가 메시지 및 수정 후 11개 테스트 확인 | PENDING |
| E02 | 2026-10-31-timetable-roster-views-F01 | FIXED | 2026-10-31T19:01:07+09:00 | 독립 평가 메시지 및 수정 후 11개 테스트 확인 | PENDING |
| E03 | 2026-10-31-timetable-roster-views-F02 | CONFIRMED | 2026-10-31T19:02:16+09:00 | 빌드 타입 검사 발견 후 DOM ref 범위를 section으로 변경, 동일 표적 테스트/브라우저 초점 재검증 | PENDING |
| E04 | 2026-10-31-timetable-roster-views-F02 | FIXED | 2026-10-31T19:02:16+09:00 | 빌드 타입 검사 발견 후 DOM ref 범위를 section으로 변경, 동일 표적 테스트/브라우저 초점 재검증 | PENDING |

최종 실제 브라우저 표적 검증: 테스트새봄 연락처 편집 → 배정 보기 → 연락처 보기 → 취소 후 activeElement가 해당 행의 연락처 수정 버튼임을 확인, 편집 폼 0개. DB 쓰기 없음.

최종 검증: 테스트 11/11 PASS, 수정 파일 ESLint PASS, `npm run build` PASS(exit 0). `/private/tmp/yesulin-roster-views-build-final.log`. 최초 제한 환경 빌드는 정체되어 종료 후 재실행했고, 타입 오류 수정 뒤 최종 빌드까지 통과했다.

## 최초 PR 연결

최초 게시 PR: [#479](https://github.com/woowacourse-teams/2026-yesulin/pull/479), 대상 dev, 관련 이슈 #478.
위 PENDING/PR 미생성 표기는 당시 작업 이력이며 이 절로 최초 게시 번호를 연결한다. 기존 문제 ID·확정/해결 시각은 변경하지 않는다.
