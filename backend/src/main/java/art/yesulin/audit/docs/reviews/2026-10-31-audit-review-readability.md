# PDF 심사 주변 UI 가독성 개선

- 작업 ID: `2026-10-31-audit-review-readability`
- 평가일: 2026-10-31 / 도메인: Audit / 기준: criteria v1, 작업 평가표 v1
- 범위: 배역·상태 필터, 보기 방식·연락처 도구, 지원자 정보·메모, 표·선택 도구의 크기와 간격.
- 유지: PDF 열람, 사진 영역과 판정·이전/다음 구성 및 동작, API, 권한, 저장/분석 이벤트.

## 구현 전 디자인 계획

기존 서체를 유지한다. 흰색 #FFFFFF, 바탕 #F7F9FC, 본문 #111722, 보조 #475569, 경계 #E2E8F0, 강조 #246BFE를 기존 토큰으로 사용한다. 제목 20px, 정보 15~16px, 도구 14px, 클릭 영역 최소 44px. 상단은 좌측 정렬된 제목/현황 → 배역/업로드 → 상태/보기/연락처 순서로 묶고, 정보 패널은 라벨과 값의 대비·행간을 높인다.

```text
심사함 / 제목                                    전체 · 판정 완료
배역 필터                                         폴더 · PDF 업로드
대기 · 합격 · 보류 · 불합격             한 명씩 · 카드 · 표 | 합격자 연락처
기존 PDF/사진과 판정 영역                         지원자 정보 / 메모
```

요청 대조: 새 대시보드·장식·별도 지표를 추가하지 않는다. 기존 심사 중심 배치가 고유한 작업 흐름이므로 유지하고, 연락처의 별도 줄만 도구 모음으로 합쳐 세로 공간을 줄인다. 작은 화면에서는 도구가 줄바꿈하며 표만 내부 가로 스크롤을 허용한다.

## 수정 전 평가표

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R1 | PDF·판정·이전/다음 구성 또는 동작 변경 | 기존 순서·핸들러·단축키 유지 | diff + 관련 테스트 + 로컬 원본 열람 | Y | PASS |
| R2 | 도구 글씨가 작거나 클릭이 어려움 | 주변 도구 14px 이상, 44px 클릭 영역, 정보 가독성 확보 | CSS + 브라우저 치수/화면 | Y | PASS |
| R3 | 좁은 화면 도구 겹침·페이지 가로 넘침 | 데스크톱/391px에서 줄바꿈, 표만 가로 스크롤 | 브라우저 | Y | PASS |
| R4 | 보기 전환·연락처 진입 때 메모 유실/권한 회귀 | 기존 이동 보호·만료 처리 유지 | workbench/focus 테스트, diff | Y | PASS |
| R5 | 잘못된 참조·불필요 파일/의존성·분석 변경 | 신규 클래스 소비 확인, lint/build, 분석 계약 유지 | 독립 평가·정적 검사·분석 테스트 | Y | PASS |

추출 콜백·AI·배포·중복 업로드는 N/A: 이번 변경은 표시와 배치이며 해당 실행 경로를 수정하지 않는다. 기존 수동 저장 보호는 R1/R4로 확인한다. `frontend/docs/analytics.md`와 `frontend/scripts/posthog/dashboards.mjs`의 열람/저장/진행 집계를 확인했으며 이벤트 의미·성공 지점은 변경하지 않는다.

## 평가 결과

- 로컬 실제 API + 합성 지원자 11명으로 확인. 테스트 계정의 판정·메모·배역은 변경하지 않았다.
- 데스크톱 CSS 1440px, 작은 화면 CSS 391px(브라우저 배율을 보정한 viewport override)에서 문서 폭과 scrollWidth가 같음. 기본 viewport 복원 완료.
- 상태 탭 실제 글꼴 14px / 높이 44.4px, 보기 방식 14px / 높이 44px. 배역 설정 모달 열기/취소, 표/한 명씩 전환, 원본 PDF 앱 보기 렌더링/닫기 확인.
- `npm test -- src/components/pdf-reviews src/features/pdf-reviews src/features/analytics/pdf-analytics.test.ts`: 11파일 97테스트 통과. 판정, 이동, 미저장 메모, 로그인 만료, 분석 개인정보 제외 관련 기존 테스트 포함.
- `npm run lint`: 통과. `npm run build -- --webpack`: 통과. `git diff --check`: 통과.
- 스크린샷: `/private/tmp/yesulin-review-readability-desktop.png`, `/private/tmp/yesulin-review-readability-mobile.png` (합성 데이터).
- 검증 한계: 실제 모바일 기기·Safari·실제 인물 사진은 실행하지 않았다. 해당 보기/사진 기하·판정 동작은 이번 변경 범위 밖이며 사진 부재 상태와 PDF 원본으로 로컬 확인했다. 생산 환경 배포 없음.
- 독립 읽기 전용 평가 1회 완료: 이번 변경에서 신규 확정 문제 없음. 상대 도구가 제공되지 않아 같은 종류의 별도 에이전트로 대체했다. 평가자는 diff/참조/토큰/동작 유지 및 미사용 코드 점검을 수행했고, 브라우저·테스트·빌드는 작성자의 실행 근거임을 구분했다. PR 미생성.
- R1: PDF 앱 보기 렌더링과 닫기, 기존 판정/이동 테스트 및 geometry/핸들러 diff로 PASS.
- R2: 상태·보기·업로드·정보 도구 크기와 이름/메모 계층 확인으로 PASS. 보존 요청된 판정 버튼과 기존 기타 화면은 크기 조정 대상이 아니다.
- R3: CSS 1440/391px에서 page overflow 없음, 표 이름 세로 압축 해소, 배역 모달 확인으로 PASS.
- R4: 기존 workbench/focus 보호 테스트와 navigate/만료 분기 불변 확인으로 PASS.
- R5: 새 클래스 7개와 import 모두 사용, 설정/의존성 추가 없음. lint/build/분석 테스트·독립 검토로 PASS. 수정 범위 밖 legacy CSS 정리는 수행하지 않았다.

## 고정 집계

- 작업 ID: `2026-10-31-audit-review-readability` / 평가일: 2026-10-31 / Audit 기준 v1 + 작업 평가표 v1
- 독립 평가: 1회
- 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0, 검증률 5/5
- 신규 확정 문제: 발견 2 / 해결 2 / 미해결 0 / P0 0 / P1 0 / P2 2 / P3 0
- 발견 경로: PRECHECK 2 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0
- 오탐 0 / 미확인 항목 0. 실제 모바일 기기·Safari·실제 사진 검증은 범위 밖이며 완료 주장에 포함하지 않는다.
- 최초 기록 PR: PENDING. 이후 PR 본문에 위 ID와 집계를 반영한다.

## 문제 기록

| 문제 ID | 심각도/유형/유입/발견 경로 | 근거·조치 | 상태 | 최초 확정 / 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-10-31-audit-review-readability-F01 | P2 / CODE / EXISTING / PRECHECK | 최종 심사 CSS 블록에서 미정의 `--card`, `--border`, `--surface`, `--foreground` 등을 참조하여 패널 경계/보기 선택 배경이 빠짐. globals의 실제 root 토큰으로 맞추고 화면에서 경계·활성 배경 확인. | FIXED | 2026-10-31T14:11:03+09:00 / 2026-10-31T14:11:03+09:00 | PENDING |
| 2026-10-31-audit-review-readability-F02 | P2 / CODE / EXISTING / PRECHECK | 지원자 표의 최소 폭이 없어 좁은 화면에서 이름이 한 글자씩 세로로 줄바꿈됨. 표 860px/지원자 열 200px 최소 폭을 주고 내부 스크롤로 유지, CSS 391px에서 이름과 페이지 넘침 재확인. | FIXED | 2026-10-31T14:11:03+09:00 / 2026-10-31T14:11:03+09:00 | PENDING |

확정 시각은 문제 표에 확정 기록한 시각이며 수정·화면 검증은 같은 기록 시점 이전에 완료했다.

| 사건 ID | 문제 ID | 사건 | 시각 | 근거 / PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audit-review-readability-F01 | CONFIRMED | 2026-10-31T14:11:03+09:00 | 수정 전 CSS와 globals 대조·브라우저 / PENDING |
| E02 | 2026-10-31-audit-review-readability-F01 | FIXED | 2026-10-31T14:11:03+09:00 | 실제 토큰 사용·데스크톱 화면 / PENDING |
| E03 | 2026-10-31-audit-review-readability-F02 | CONFIRMED | 2026-10-31T14:11:03+09:00 | 기존 무최소폭 표 레이아웃·520px 재현 / PENDING |
| E04 | 2026-10-31-audit-review-readability-F02 | FIXED | 2026-10-31T14:11:03+09:00 | 최소폭 지정·391px 재확인 / PENDING |

