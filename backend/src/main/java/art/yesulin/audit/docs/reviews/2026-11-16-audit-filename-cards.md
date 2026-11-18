# PDF 심사 카드·표의 파일 이름 표시와 업로드 중 표시

작업 ID `2026-11-16-audit-filename-cards`, Audit v1. 프런트 표시만 바꾸며 API·DB는 그대로다.

| ID | 흐름·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| S01 | 카드·표 제목은 올린 PDF 파일 이름. `이름 미입력`·`미배정` 자리 표시와 자동 추출 이름을 보이지 않음 | 렌더 테스트·로컬 화면 | Y | PASS |
| S02 | 직접 적은 이름과 배정한 배역만 덧붙임. 공백만 적은 이름은 비어 있는 것으로 봄. 표의 미배정 배역은 `—` | 라벨·렌더 테스트 | Y | PASS |
| S03 | 한 명씩 보기의 화면 읽기용 이름과 전체화면 캡션도 같은 기준(직접 적은 이름, 없으면 파일 이름) | 기존 동작 테스트 수정 | Y | PASS |
| S04 | 업로드 확인 전 지원서는 카드·표에 진행 표시와 `업로드 중` | 렌더 테스트 | Y | PASS |
| S05 | 업로드 버튼은 올리는 동안 진행 표시 | 렌더 테스트 | Y | PASS |
| S06 | 원본 주소가 아직 없으면 오류 대신 진행 표시, 1.5초마다 다시 조회, 다시 조회하는 동안 문구 유지, 40번 뒤 오류와 수동 재시도 | 컴포넌트 테스트 | Y | PASS |
| S07 | 분석 이벤트 발생 지점·의미 변화 없음, MSW·fixture 변경 불필요 | 코드 검토 | Y | PASS |
| S08 | dev 실제 업로드에서 진행 표시와 다시 조회 동작 | dev 배포 후 확인 | Y | UNVERIFIED |

## 검증 근거 (2026-11-16)

- 프런트 전체 Vitest 214파일·1170건 PASS, lint PASS, 프로덕션 build PASS.
- `npx tsc --noEmit`의 `original-screening.test.tsx(85) guarded` 오류는 변경 전 코드에서도 같게 나는 기존 문제다.
- 로컬 프런트를 dev API에 붙여 시연 계정으로 카드·표를 확인했다. 파일 이름이 제목이고, 직접 적은 이름·배정 배역만 보이며 표의 미배정 배역은 `—`였다.
  로컬 주소에서는 S3가 원본·업로드 요청을 막아 원본 표시와 실제 업로드는 확인하지 못했다(S08).
- 독립 평가 1회: 상대 도구를 연결할 수 없어 같은 종류의 별도 에이전트가 읽기 전용으로 검토하고 관련 테스트를 실행했다.

## 미사용·호환 정리

`applicantListLabel`, `Spinner`·`LoadingStatus`, `UNASSIGNED_ROLE`, `sourceDocument.uploading`은 모두 새 화면 코드가 쓴다.
`Applicant.name`(`이름 미입력` 기본값)은 다른 화면이 계속 쓰므로 남겼다. 합격자 연락처 표와 연락처 복사는 이번 범위 밖이라
`entry.title || entry.applicantName || "이름 미입력"`을 그대로 둔다. 자유 배역 심사에서 카드에 `자유 배역`이 보이는 것도 기존 표시를 유지한다.

## 평가 결과

필수 PASS7 / FAIL0 / UNVERIFIED1 / N/A0.

발견4 = 해결4 + 미해결0. P0 0 / P1 0 / P2 0 / P3 4.
PRECHECK0 / INDEPENDENT_REVIEW4 / POST_FIX_CHECK0 / EXTERNAL0 / REJECTED0. 최초 PR은 모두 PENDING.
수정 확인 중 원본이 준비돼도 대기 문구가 먼저 보이던 순서 문제를 테스트로 찾아 같은 F01 수정 안에서 고쳤다.

| 문제 ID | 심각도/유형/유입/경로 | 근거·조치·검증 | 상태 |
| --- | --- | --- | --- |
| 2026-11-16-audit-filename-cards-F01 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 다시 조회하는 동안 `불러오는 중`으로 바뀌어 1.5초마다 문구·알림이 깜빡임. 직전 실패가 업로드 대기면 조회 중에도 `올리는 중`을 유지하고, 원본이 준비되면 가장 먼저 표시. 테스트 추가 PASS | FIXED |
| 2026-11-16-audit-filename-cards-F02 | P3/FLOW/EXISTING/INDEPENDENT_REVIEW | 한 명씩 보기 캡션·화면 읽기용 이름이 `이름 미입력`·자동 추출 이름을 보임. 직접 적은 이름 또는 파일 이름으로 통일, 기존 테스트 기대값 수정 PASS | FIXED |
| 2026-11-16-audit-filename-cards-F03 | P3/CODE/INTRODUCED/INDEPENDENT_REVIEW | 표가 다듬지 않은 제목을 직접 그려 공백 제목이면 빈 줄. 라벨이 다듬은 이름을 돌려주고 카드·표가 같은 값을 씀. 테스트 PASS | FIXED |
| 2026-11-16-audit-filename-cards-F04 | P3/TEST/INTRODUCED/INDEPENDENT_REVIEW | 카드·표·업로드 버튼 렌더 테스트 없음. 3건 추가 PASS | FIXED |

## 추가 전용 상태 이력

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-16-audit-filename-cards-F01 | CONFIRMED | 2026-11-16T18:22:00+09:00 | 독립 평가 / PENDING |
| E02 | 2026-11-16-audit-filename-cards-F01 | FIXED | 2026-11-16T18:22:00+09:00 | 수정·테스트 / PENDING |
| E03 | 2026-11-16-audit-filename-cards-F02 | CONFIRMED | 2026-11-16T18:22:00+09:00 | 독립 평가 / PENDING |
| E04 | 2026-11-16-audit-filename-cards-F02 | FIXED | 2026-11-16T18:22:00+09:00 | 수정·테스트 / PENDING |
| E05 | 2026-11-16-audit-filename-cards-F03 | CONFIRMED | 2026-11-16T18:22:00+09:00 | 독립 평가 / PENDING |
| E06 | 2026-11-16-audit-filename-cards-F03 | FIXED | 2026-11-16T18:22:00+09:00 | 수정·테스트 / PENDING |
| E07 | 2026-11-16-audit-filename-cards-F04 | CONFIRMED | 2026-11-16T18:22:00+09:00 | 독립 평가 / PENDING |
| E08 | 2026-11-16-audit-filename-cards-F04 | FIXED | 2026-11-16T18:22:00+09:00 | 테스트 추가 / PENDING |
