# 연락처 복사·일정 생성 구분·일정 가이드 확장

작업 ID `2026-10-31-audit-contact-copy-guide`, Audit v1 + Timetable 흐름, 2026-10-31.
기존 변경을 보존하고 로컬 UI 및 가이드만 수정. API·추출·판정·발송 정책 변경 없음.

| ID | 단계·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| C1 | 전체/선택 연락처만 이름·배역·전화·메일 복사, 미확인 값은 추정하지 않음 | 단위·UI·브라우저 | Y | PASS |
| C2 | 로딩/빈/실패 복사 차단, 권한 거절 때 수동 복사 가능, 성공 후에만 완료 안내 | UI 테스트 | Y | PASS |
| C3 | 기존 일정 선택이 기본, 새 일정 입력은 명시적 열기, 취소/성공/실패/재시도와 기존 초안 보호 | UI 테스트·브라우저 | Y | PASS |
| C4 | 가이드 연락처 복사/선택 등록/생성/개별·일괄 배정/저장/수정·해제·제외/재방문/실패 설명 정확 | 실제 캡처·코드 대조 | Y | PASS |
| C5 | 최종 PDF 전체 페이지 렌더, 번호·잘림·가독성·원본 보존 | Poppler·시각 검사 | Y | PASS |
| C6 | 분석 개인정보 미전송·기존 분모 유지, 독립1회·미사용 점검 | 회귀 테스트·정적 평가 | Y | PASS |

API 권한·300건 성능·실제 추출 정확도·운영 배포 N/A(변경하지 않음). 연락처는 사용자 복사 시 브라우저 클립보드에만 쓰며 외부 전송/로깅하지 않는다. PR 없음.

## 최종 결과

- 독립 평가 1회. 상대 평가 도구가 없어 동일 종류의 별도 읽기 전용 평가자로 대체했다.
- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0, 검증률 100%(이번 변경 범위).
- 신규 발견 2 / 해결 2 / 미해결 0, P0 0 / P1 0 / P2 1 / P3 1.
- 발견 경로: PRECHECK 0 / INDEPENDENT_REVIEW 2 / POST_FIX_CHECK 0. 오탐 0. PR 없음, 최초 기록 PR은 PENDING.
- C1~C3: `review-passed-contacts.test.tsx`, `review-timetable-panel.test.tsx`, `pdf-analytics.test.ts` 합계 22 PASS. `/private/tmp/yesulin-copy-final-tests.log`.
- 수정 파일 ESLint PASS(`/private/tmp/yesulin-copy-final-lint.log`), production build PASS(`/private/tmp/yesulin-copy-final-build.log`, exit 0). 루트 디렉터리에서 잘못 실행한 초기 npx의 registry ENOTFOUND 로그는 성공 근거에서 제외했다.
- 실제 localhost:3000 합성 9명 명단의 복사 성공 안내, 새 입력창이 접힌 일정 선택 화면을 확인했다. 기존 데이터는 변경하지 않았다. `/private/tmp/yesulin-contacts-copy-final.png`, `/private/tmp/yesulin-roster-selector-final.png`.
- 격리된 현재 프론트 복사본+합성 API(localhost:3002)에서 복사, 일정 선택·생성 성공 후 초점, 2명 등록, 개인별/일괄 배정 저장, 연락처 보기, 해제·되돌리기를 실행하고 캡처했다. 실제 운영 API에 쓰지 않았다. 작은 화면 검사에서 DOM 너비/scrollWidth 모두 520px로 페이지 가로 넘침 없음. `/private/tmp/yesulin-copy-mobile.png`. 좁은 표는 내부 가로 스크롤을 유지한다.
- C4~C5: `output/pdf/예술in_오디션_PDF_심사_가이드_일정관리포함.pdf`, A4 가로20쪽. 11쪽 연락처,12쪽 복사,13~18쪽 선택 일정 관리,19쪽 FAQ. `tmp/pdfs/audition-guide-update/expanded-01.png`~`20.png` 및 몽타주 시각 검수, `layout-check.json` overflow/누락/이탈0. 원본 사용자 PDF와 이전13쪽 수정본 모두 보존.
- C6: analytics.md 및 posthog dashboards의 PDF upload/extract/review_saved 분모 확인. 복사/일정 UI는 해당 성공 이벤트를 호출하지 않으며 이름/연락처/복사본문의 분석 전송 없음. API 계약·정책·분모 변경 없음. 기존 분석 분리·거부·중복 회귀 포함.
- 미사용 점검: contact-copy exports는 화면과 테스트가 사용. 새 의존성 없음. 사용하지 않는 촬영본20-schedule-saved 제거. 기존12-contacts 캡처/분기는 이전13쪽 PDF의 화면 원본과 검수 근거이므로 보존하며 최종20쪽 본문에는 사용하지 않는다. fixture/build/render/assets/screens/PNG는 가이드 재생성·검수에 사용.
- 배포 여부, 실제 개인 지원서 추출 정확도,300건 성능은 검증 범위 밖이며 통과로 주장하지 않는다.

## 확정 문제

| ID | 심각도·유형·유입 | 발견 경로 | 문제·수정·검증 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-10-31-audit-contact-copy-guide-F01 | P2 / CODE / INTRODUCED | INDEPENDENT_REVIEW | 클립보드 권한 대기 중 선택/일정 화면 전환 시 이전 수동 복사 snapshot이 다시 표시될 수 있음. copying 중 선택·재조회·화면 전환을 막고 일정 진입 시 내용을 초기화. 대기 중 버튼/체크박스 비활성 테스트 PASS | FIXED |
| 2026-10-31-audit-contact-copy-guide-F02 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | 일정 생성 성공 시 disabled 버튼에 초점을 주고 폼을 닫아 초점 소실. 생성 폼이 닫히고 busy=false인 effect에서 복귀. 생성 성공 테스트 및 가상 실제 UI의 focused 새 일정 만들기 확인 | FIXED |

## 추가 전용 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audit-contact-copy-guide-F01 | CONFIRMED | 2026-10-31T19:12:42+09:00 | 독립 평가 확정 결과 및 수정 후 최종 테스트·브라우저 검증 기록 | PENDING |
| E02 | 2026-10-31-audit-contact-copy-guide-F01 | FIXED | 2026-10-31T19:12:42+09:00 | 독립 평가 확정 결과 및 수정 후 최종 테스트·브라우저 검증 기록 | PENDING |
| E03 | 2026-10-31-audit-contact-copy-guide-F02 | CONFIRMED | 2026-10-31T19:12:42+09:00 | 독립 평가 확정 결과 및 수정 후 최종 테스트·브라우저 검증 기록 | PENDING |
| E04 | 2026-10-31-audit-contact-copy-guide-F02 | FIXED | 2026-10-31T19:12:42+09:00 | 독립 평가 확정 결과 및 수정 후 최종 테스트·브라우저 검증 기록 | PENDING |
