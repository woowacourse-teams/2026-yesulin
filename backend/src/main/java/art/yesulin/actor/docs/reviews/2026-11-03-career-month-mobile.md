# 경력 연월 모바일 점검

- 작업 ID `2026-11-03-career-month-mobile` / 평가표 v1 / PR PENDING
- 최근 경력 연월 변경을 브라우저의 실제 CSS viewport 390px·320px에서 점검한다. 실기기·가상 키보드는 별도 범위다.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| B01 | 배우 상세·좁은 날짜 열 | 연월·작품명·배역 보존, 가로 넘침 없음 | 390/320 CSS px DOM·화면 | Y | PASS |
| B02 | 상세 조작·초점 | 44px 공유/SNS/문의, 사진 확대·닫기 복귀 | DOM·조작 | Y | PASS |
| B03 | 프로필 월 미입력·복구 | 오류행 초점·작성값 보존, 월 선택 후 저장 성공 | 모바일 MSW 조작 | Y | PASS |
| B04 | 지원서 월 선택·단계 이동 | 월 오류 초점, 단계 이동·새로고침 후 선택값 유지, 가로 넘침 없음 | 모바일 MSW 조작 | Y | PASS |
| B05 | 평가·정리 | 근거와 검증 범위 일치, 미사용 변경 없음 | 독립 평가·diff | Y | PASS |

실제 외부 SNS 이동·공유 전송·실제 지원서 제출·운영 데이터 변경은 N/A. 기존 DB·API 계약 변경은 하지 않는다.

## 검증·평가

- 2026-11-03, localhost MSW 데모 / in-app browser 반응형 점검. 브라우저 배율 90% 때문에 viewport override 351×760 / 288×760에서 실제 `innerWidth` 390 / 320을 확인했다. 가용 폭(clientWidth)은 스크롤바 제외 373 / 303px다.
- B01: 두 폭에서 배우 상세의 연월 80px / 작품명 173·103px / 배역 80px, 셀 내용·분야별 최신순·기존 연도만인 경력 보존. 페이지 scrollWidth=clientWidth. 긴 작품명은 줄바꿈. `output/career-month-mobile-2026-11-03/public-{390,320}.jpg`.
- B02: 공유·SNS 높이 약44px(소수점 반올림), 문의 44px. 320px 사진 확대→다음(1/3→2/3)→Escape로 닫은 뒤 대표사진 버튼으로 초점 복귀. 외부 전송은 실행하지 않음.
- B03: 320px 프로필 추가정보에서 새 경력의 작품·배역·연도만 입력→저장 차단→해당 월 입력칸 초점과 입력값 유지 확인. 12월 선택 후 저장 성공. 390px에서 기존 경력 월 빈값 / 새 경력 12월을 확인. `profile-error-320.jpg`, `profile-saved-390.jpg`.
- B04: 지원서 새 경력의 월 누락→다음 단계 차단. 수정 후 390/320에서 activeElement가 `CAREER-<id>-month`이고 이 입력칸만 aria-invalid. 월 선택→사진과 영상 이동→이전 단계 복귀 및 새로고침 뒤 같은 작품명·8월 복원. 페이지 scrollWidth=clientWidth(373/303). `application-month-error-{390,320}.jpg`.
- 회귀 검증: `npm test -- src/components/applications/public-application-career.test.tsx src/features/applications/application-careers.test.ts src/features/otr-auditions/application-form.test.ts` 3개 파일·14개 테스트 PASS. 작품명·배역·연도·월 오류가 각각 정확한 입력칸과 설명에 연결되는 4개 사례 포함.
- 전체 `npm run lint` PASS, 마지막 수정 파일 eslint PASS. `npm run build -- --webpack` PASS(56개 정적 페이지, TypeScript 포함). 독립 평가 뒤 한 줄 스크롤 대상 수정·테스트 환경 수정 후 `npx tsc --noEmit` PASS, 대상 테스트 6개 재실행 PASS.
- B04 수정 후 스크롤 위치: 390px 입력 y400.02~444.01 / 오류 y456.01~480.01 / 고정바 시작 y744.46. 320px 입력 y400.36~444.35 / 오류 y456.35~480.35 / 고정바 시작 y744.46. 화면 캡처를 최종 결과로 교체했다.
- 독립 평가 1회(별도 평가자, 읽기 전용). 상대 평가 도구가 설치되어 있지 않아 같은 종류의 별도 에이전트로 대체했다. F03 발견 후 구현자가 해당 부분만 수정·화면 재검증했다. 미사용 코드·파일·설정·의존성 추가 없음, `careerDraftIssue` 소비자와 기존 wrapper 참조 확인, 단계 상태는 aria-label에 보존. `git diff --check` PASS.
- 로컬 MSW 프로필 테스트 저장과 익명 지원서 테스트 초안만 사용했고 실제 제출·공개는 실행하지 않았다. 익명 테스트 초안은 이 브라우저에 남아 있다. 임시 viewport는 reset하고 원래 배우 상세 URL로 복귀했다.

## 발견 문제

| 문제 ID | 심각도·유형·유입 | 경로 | 근거·조치 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-11-03-career-month-mobile-F01 | P2 / FLOW / EXISTING | PRECHECK | 지원서 경력 월 누락 시 카드 첫 버튼(삭제)에 초점. 검증 결과에 필드 정보를 포함하고 해당 필드만 aria-invalid, 오류 초점은 invalid control 우선. 390/320 DOM·조작 및 오류 4종 회귀 테스트로 확인. | FIXED |
| 2026-11-03-career-month-mobile-F02 | P3 / CODE / EXISTING | PRECHECK | 단계 버튼의 absolute sr-only 상태 문구가 스크롤 영역 밖으로 빠져 390px 페이지 scrollWidth381/clientWidth373. 같은 상태가 이미 aria-label에 있어 중복 span 제거. 390/320에서 페이지 가로 넘침 해소, 단계 접근 가능한 이름의 완료/오류 상태 유지. | FIXED |

| 2026-11-03-career-month-mobile-F03 | P2 / FLOW / EXISTING | INDEPENDENT_REVIEW | 카드 전체 중심으로 스크롤해 월 입력·오류가 하단바에 가려짐. 실제 오류 control을 중심으로 스크롤하도록 변경. 두 폭에서 입력·오류 bottom < 하단바 top 확인 및 최종 캡처. | FIXED |
| 2026-11-03-career-month-mobile-F04 | P3 / TEST / INTRODUCED | POST_FIX_CHECK | 테스트에서 직접 jsdom import 시 타입 선언 부재로 tsc TS7016. 기존 프로젝트 방식의 Vitest jsdom 환경·전역 DOM 사용으로 변경, 새 의존성 없음. 테스트6·eslint·tsc PASS. | FIXED |

| 사건 ID | 문제 ID | 사건 | 시각 | 최초 기록 PR | 근거 |
| --- | --- | --- | --- | --- | --- |
| M01 | 2026-11-03-career-month-mobile-F01 | CONFIRMED | 2026-11-03T16:29:55+09:00 | PENDING | 모바일 UI에서 삭제 버튼 초점 재현, 최초 기록 |
| M02 | 2026-11-03-career-month-mobile-F01 | FIXED | 2026-11-03T16:29:55+09:00 | PENDING | 390/320 월 입력 초점·14개 테스트 PASS |
| M03 | 2026-11-03-career-month-mobile-F02 | CONFIRMED | 2026-11-03T16:29:55+09:00 | PENDING | 페이지 가로 넘침·sr-only 위치 확인, 최초 기록 |
| M04 | 2026-11-03-career-month-mobile-F02 | FIXED | 2026-11-03T16:29:55+09:00 | PENDING | 두 폭 scrollWidth=clientWidth, 상태 이름 유지 |
| M05 | 2026-11-03-career-month-mobile-F03 | CONFIRMED | 2026-11-03T16:34:43+09:00 | PENDING | 독립 평가에서 캡처로 가림 확정, 최초 기록 |
| M06 | 2026-11-03-career-month-mobile-F03 | FIXED | 2026-11-03T16:34:43+09:00 | PENDING | 실제 input으로 스크롤 후 390/320 좌표·화면 확인 |
| M07 | 2026-11-03-career-month-mobile-F04 | CONFIRMED | 2026-11-03T16:34:43+09:00 | PENDING | 최종 tsc TS7016, 최초 기록 |
| M08 | 2026-11-03-career-month-mobile-F04 | FIXED | 2026-11-03T16:34:43+09:00 | PENDING | 환경 주석 방식 전환 후 테스트·lint·tsc PASS |

최초 시각은 보존 가능한 최초 기록 시각이며 재현 시각을 소급 추정하지 않았다.

- 독립 평가 1회 / 필수 PASS5·FAIL0·UNVERIFIED0 / N/A: 실기기·키보드, 외부 전송·실제 제출·운영 변경.
- 신규 확정 발견4 / 해결4 / 미해결0 / P0=0·P1=0·P2=2·P3=2 / PRECHECK=2 / INDEPENDENT_REVIEW=1 / POST_FIX_CHECK=1 / 오탐0.
- 검증률 5/5(이번 평가표 범위). 실기기 Safari/Chrome과 화면 키보드는 미확인. PR은 생성·게시하지 않았고 다음 PR에 이 기록을 포함한다.
