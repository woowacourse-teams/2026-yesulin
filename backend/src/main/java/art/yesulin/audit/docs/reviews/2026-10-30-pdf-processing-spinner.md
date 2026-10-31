# PDF 처리 중 빈 심사 화면 안내

작업 ID: `2026-10-30-pdf-processing-spinner`, 평가일 2026-10-30, Audit 평가표 v1 + 아래 UI 기준 v1.

## 구현 전 기준

| ID | 필수 | 실패 조건 / 기대 결과 | 검증 |
| --- | --- | --- | --- |
| U01 | 예 | 대기 탭에 표시할 항목이 없고 업로드·추출·AI 처리 중이면 스피너와 진행 안내 표시 | 렌더 조건 정적 검토 |
| U02 | 예 | 항목이 있으면 기존 심사 유지, 완료·실패·조회 오류·세션 만료 때 처리 중으로 오인하지 않음 | 분기·상태 검토 |
| U03 | 예 | 상태 안내를 보조기술로 전달하고 동작 감소 환경에서는 회전하지 않음 | ARIA·CSS 검토 |
| U04 | 예 | API·폴링·분석 성공 지점 유지, 추가 요청·미사용 코드 없음 | diff·참조 검사, lint·타입 검사 |
| U05 | 예 | 독립 평가 1회 및 기록·PR 연결 | 독립 검토 |

권한·콜백·수동 판정 로직 변경은 N/A: 표시만 바꾸며 기존 흐름을 유지한다. 실제 모델 정확도·속도·Dev 시각 확인은 이번 평가 범위 밖이다.

## 결과

독립 평가 1회 완료. 별도 평가자가 U02의 오류·세션 만료 시 회전 조건 누락을 발견했고 수정했다.
U01~U05 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0 (표시 조건·ARIA/CSS 정적 검토 기준).
발견 1 / 해결 1 / 미해결 0, P0 0 / P1 0 / P2 0 / P3 1.
PRECHECK 0 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0 / EXTERNAL 0, 오탐 0.
미사용 코드·설정·파일 없음. API·폴링·분석 이벤트 및 성공 시점 변경 없음.
lint·TypeScript 검사 통과. 실제 Dev 화면의 시각 검증은 범위 밖이며 모델 정확도나 속도를 평가하지 않았다.

| 문제 ID | 심각도·유형·유입 | 경로 | 최초 확정(+09:00) / 최초 PR | 조치·상태 |
| --- | --- | --- | --- | --- |
| 2026-10-30-pdf-processing-spinner-F01 | P3/CODE/INTRODUCED | INDEPENDENT_REVIEW | 2026-10-30T14:26:00+09:00 / PENDING | 상세 목록 조회 오류와 세션 만료 시 회전을 차단. 상세 오류도 토스트 재조회 안내에 연결. FIXED |

## 추가 전용 상태 이력

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 |
| --- | --- | --- | --- | --- |
| E01 | 2026-10-30-pdf-processing-spinner-F01 | CONFIRMED | 2026-10-30T14:26:00+09:00 | 독립 검토에서 준비 화면의 detailError·토스트의 disabled 누락 확인 |
| E02 | 2026-10-30-pdf-processing-spinner-F01 | FIXED | 2026-10-30T14:26:00+09:00 | preparing의 detailError, spinning의 disabled/error 검사와 오류 전달로 차단. 수정 조건 표적 검토 |

최초 게시 연결: 위 F01 및 E01·E02의 최초 기록 PR은 [#466](https://github.com/woowacourse-teams/2026-yesulin/pull/466)이다. 최초 확정·해결 시각은 그대로 보존한다. 작업 이슈는 [#465](https://github.com/woowacourse-teams/2026-yesulin/issues/465).
