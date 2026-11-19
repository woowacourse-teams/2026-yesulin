# 공연사 메뉴·PDF 심사 UI 정리

- 작업 ID: `2026-11-19-audit-producer-ui`
- 기준: Audit 평가표 v1, 프론트 UI·API·분석 규칙.
- 범위: 프론트 메뉴/접수 심사 진입 제거, PDF 카드·메모·제목·상태 필터. 백엔드 런타임 변경 없음.
- 사전 평가표 작성: 2026-11-19 KST, 구현 전.

| ID | 흐름·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| U01 | 접수 심사 메뉴/안내/직접 URL/전역 조회 잔존 | 메뉴·빈 문구·가이드·일정 제거, 기존 공연사 URL은 대시보드 이동 | 참조 검색·메뉴/대시보드 테스트·빌드 | 예 | PASS |
| U02 | 카드 내부 체크박스가 상세를 함께 엶 | 카드 전체와 키보드로 상세 열기, 선택은 독립·이벤트 1회 | 카드 상호작용 테스트 | 예 | PASS |
| U03 | 메모 판별·갱신이 상태를 덮음 | 판정과 메모 있음/없음 동시 표시, 공백은 없음, 저장/삭제 후 즉시 반영 | 목록/자동 저장 회귀 | 예 | PASS |
| U04 | 목록에서 PDF 상세를 선조회함 | 기존 심사함 응답 memo 사용, 추가 호출 없음 | 기존 원본 지연 조회 테스트 | 예 | PASS |
| U05 | 좁은 화면·긴 파일명·높은 메모로 조작 불가 | 제목 16px, 구분된 상태 필터, 커진 메모·판정 접근 유지 | 모바일/데스크톱 렌더 | 예 | PASS |
| U06 | 메모 저장 실패 후 이동/판정·분석 중복 | 입력 보호·이동 차단, 정상 저장과 분석 의미 보존 | 심사·분석 관련 테스트 | 예 | PASS |
| A08 | 죽은 프론트 코드/문서 | 제거 기능의 전용 UI/API 정리, 공용·공개 소비자 보존 근거 | 독립 평가·검색 | 예 | PASS |
| A09 | 흐름 문서 불일치 | 프론트 흐름/분석 설명 갱신, 백엔드 계약 유지 | 문서 확인 | 예 | PASS |
| A10 | 독립 평가 미실시 | 독립 평가 1회와 문제 집계 기록 | 읽기 전용 평가 | 예 | PASS |

A01~A04/A06~A07 서버 권한·업로드·추출·AI·진행률·배포는 N/A: 이번 변경에서 해당 계약·런타임을 바꾸지 않음. A05의 수동 입력 보호는 U03/U06에서 확인.

## 독립 평가

독립 평가 1회 완료. 상대 도구 CLI를 우선 시도했으나 API timeout 3회로 실행되지 않아 같은 종류의 별도 읽기 전용 평가자로 대체했다. 실패한 CLI 시도는 평가 횟수에 포함하지 않는다.
평가자가 관련19파일115테스트를 별도로 실행했고, F02 수정 후1파일1테스트를 표적 재실행해 통과했다. 추가 전체 평가는 시행하지 않았다.
발견2/해결2/미해결0, P0 0/P1 1/P2 0/P3 1, 오탐0. 발견 경로: PRECHECK 0, INDEPENDENT_REVIEW 2, POST_FIX_CHECK 0, EXTERNAL 0.
필수 PASS9/FAIL0/UNVERIFIED0, 제외 서버 기준 N/A6(A01~A04/A06~A07). 검증률9/9=100%는 이번 프론트 평가 범위만 뜻한다. 실서비스 배포 검증은 수행하지 않았다.
PR은 생성하지 않았다. 최초 PR은 PENDING이며 다음 PR에 동일 문제 ID와 이력을 포함한다.

## 문제·사건 이력

확정 문제 F01/F02와 추가 전용 사건 이력은 아래에 기록한다. PR 없음(PENDING).

## 구현자 검증 근거

2026-11-19 KST, Node24.22.3. frontend npm run lint/build 통과. 관련19파일115테스트 통과(심사 컴포넌트·메뉴·대시보드·분석).
U02: 실제 브라우저에서 체크박스 선택만 변경, 카드 빈 영역 좌표 클릭과 버튼 Enter로 상세 진입 확인.
U03/U06: original-screening 테스트의 메모 추가/삭제 후 목록 배지·미리보기 반영 및 저장 실패 이동 차단.
U04: 원본 지연 조회 테스트, 기존 entries.memo adapter 사용 정적 검토.
U05: 로컬 합성 API/PDF, 1440×1000·390×844 scrollWidth≤innerWidth. 제목16px, 메모 PC360px/모바일224px.
U01: 모바일·데스크톱 메뉴와 기존 중첩 producer URL → /producers 이동 확인.
이미지: ~/Documents/record/yesulin/images/2026-11-19-producer-review-ui/01~05, images.md에 설명 등록.
실서비스 데이터·백엔드 권한·배포 후 동작은 검증하지 않았으며 이번 프론트 범위의 통과와 구분한다.

## 독립 평가 발견·수정

| 문제 ID | 심각도/유형/유입 | 발견 경로 | 근거·조치 | 상태 | 최초 확정 | 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19-audit-producer-ui-F01 | P3/DOC/INTRODUCED | INDEPENDENT_REVIEW | architecture.md 기존 메뉴·접수 목록·마감 일정 설명이 종료 절과 모순. 기존 본문에 현재 흐름을 통합하고 중복 절 제거. 평가자 표적 재확인 완료. | FIXED | 2026-11-19T19:58:31+09:00 | 2026-11-19T19:58:31+09:00 | PENDING |
| 2026-11-19-audit-producer-ui-F02 | P1/CODE/INTRODUCED | INDEPENDENT_REVIEW | 전역 접수 provider 제거 때 계정 key도 제거됨. 공연사 A→B 세션 전환 시 자식 심사 상태 잔존 가능. ProducerShellFrame에 credential/status key 복원, 같은 계정 재렌더 보존·다른 계정 초기화 회귀 테스트 추가. | FIXED | 2026-11-19T19:58:31+09:00 | 2026-11-19T19:58:31+09:00 | PENDING |

| 사건 ID | 문제 ID | 사건 | 시각 | 근거 | PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-11-19-audit-producer-ui-F01 | CONFIRMED | 2026-11-19T19:58:31+09:00 | 독립 평가와 원문 대조 | PENDING |
| E02 | 2026-11-19-audit-producer-ui-F01 | FIXED | 2026-11-19T19:58:31+09:00 | architecture.md 기존 본문 갱신·평가자 재확인 | PENDING |
| E03 | 2026-11-19-audit-producer-ui-F02 | CONFIRMED | 2026-11-19T19:58:31+09:00 | producer-shell keyed 경계 제거 diff 및 session refresh 경로 | PENDING |
| E04 | 2026-11-19-audit-producer-ui-F02 | FIXED | 2026-11-19T19:58:31+09:00 | accountKey를 ShellFrame에 복원, producer-shell.test.tsx | PENDING |

## 잔존 호환 코드·후속 범위

공개 배우 지원 폼 components/otr-auditions/otr-application-page.tsx는 /apply/standard/{id}의 실제 소비자다. 공용 screening-source/OTR 타입·MSW 계약은 기존 공개 제출·공용 심사 어댑터와 백엔드 계약을 위해 유지한다. 서버와 기존 공개 지원 링크의 종료 범위가 확정되면 후속 작업으로 함께 정리한다. 공개 공고 수집/OTR 원문 redirect는 별도 기능이므로 이 종료 대상에 포함하지 않는다.
메모 여부는 기존 ReviewDetail.entries.memo를 사용하므로 API 신설·건별 상세 fan-out은 필요 없다.

최종 F02 수정 후 lint와 production build(TypeScript 포함)를 다시 실행해 통과했다. git diff --check 통과.
