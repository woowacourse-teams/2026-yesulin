# PR #533 리뷰 반영·dev 갱신

작업 ID `2026-11-05-audit-pr-feedback`, Audit v1, PR #533. 외부 리뷰는 현재 코드로 재현/확인한 뒤 반영한다. 마이그레이션 순서는 기존 migration-ci-F01로 참조하며 중복 집계하지 않는다.

| ID | 흐름·기대 결과 | 필수 | 결과 |
| --- | --- | --- | --- |
| R01 | 저장 timeout/CSRF·실패입력·외부값 sync·필드 오류 연결 | Y | PASS |
| R02 | 목록 복귀/모바일 및 내부 링크 이탈 전 flush·빈 이름 권위 | Y | PASS |
| R03 | 첫페이지 점진 표시·zoom한계 무효렌더 방지·QR과 내장링크 독립 | Y | PASS |
| R04 | 원본주소 갱신 재시도·checkbox타깃·PII없는오류수집 | Y | PASS |
| R05 | 지표버전별집계·문서/실패성공 의미·소유권/Worker/자동표시회귀 | Y | PASS |
| R06 | 최신dev·lint/build/관련검증·독립평가·미사용정리 | Y | UNVERIFIED |

사용자 범위 보정: 합격자 연락처·일정과 그 전용 원본 모달 높이 추가 수정은 제외한다. 해당 파일과 fill 전달/CSS 변경을 현재 PR HEAD 상태로 복원했고, 임시 로컬 QA 판정도 원상복구했다. 기존 커밋 기능 자체를 새로 확대하거나 배포하지 않는다.

## 검증·범위

- 관련39파일·244테스트 PASS, lint PASS. 프론트 build/최종 dev 통합·외부 CI 결과는 push 후 PR 본문에 연결한다.
- 백엔드 AuditServiceTest·checkstyleTest PASS. 이번 백엔드 변경은 소유권 보호 테스트의 실제 이름/처리 상태 검증 보강뿐이다.
- 실제 브라우저: 카드 원본 상세→목록 복귀 확인. 낮은 모달 높이 보완을 QA했으나 사용자 범위 정정 후 해당 구현을 되돌려 이 작업의 PASS 근거에 포함하지 않는다. 임시 로컬 판정은 원상복구했으며 외부 발송·dev/prod 수정은 없다.
- 독립 평가1회: 별도 평가자가 전반 검토 및6파일29테스트 PASS, 새 크기 변경 시 렌더 키 누락(F17)을 발견했다. 담당 평가자의 사용량 중단 후 다른 별도 평가자가 수정된1파일1테스트를 표적으로 확인해 PASS했다. 추가 전체 평가를 반복한 것은 아니다. 상대 도구 연결이 없어 동일 종류의 별도 평가자로 대체했다.
- 새 guard/오류 정제/이름 helper는 실제 심사 소비자가 있으며 새 의존성 없음. 합격자 연락처·일정·전용 모달 추가 변경은 HEAD 상태로 복원해 작업 diff에서 제외했다.

## 리뷰 판단

이미 해결된 migration 지적은 `2026-11-05-audit-migration-ci-F01`을 참조하며 중복 발견으로 세지 않는다.
일괄 docstring은 현재 저장소의 역할명·작은 함수 우선 규칙 및 필수 CI와 별개라 채우기 위한 변경을 하지 않는다. QR 실패 알림/재시도는 문서화된 best-effort에 대한 선택 제안이고, JPA 전용 새 테스트는 presentation/infrastructure 신규 테스트 제한과 실제 로컬 HTTP 검증 범위를 고려해 추가하지 않는다. 자동 표시 클릭0과 Worker timeout 후 새 스캔은 의미 있는 기존 회귀를 보강했다.
QR raster의 동일 queue는 한 페이지 최대8MP bitmap 동시성을 제한하기 위해 유지한다. QR CPU 대기는 이미 별도 queue이고 내장 링크는 이번에 분리했다. 진행 중 한 번의 raster 지연을 없애려고 병렬 raster를 늘리는 선택은 별도 자원 측정 전 보류한다.

아래 F09/F18은 유효하지만 사용자가 이번에 하지 않겠다고 명시한 합격자 범위라 OPEN/보류한다. 구현을 남기거나 해결했다고 기록하지 않는다.

| 문제 ID 접미사 | 심각도/유형/유입 | 발견 경로 | 문제·조치·검증 | 상태 |
| --- | --- | --- | --- | --- |
| F01 | P1/FLOW/INTRODUCED | EXTERNAL | 이중 navigate로 목록 복귀 중단 → 단일 이동 경로, 카드/표 회귀·실제 브라우저 PASS | FIXED |
| F02 | P1/FLOW/INTRODUCED | EXTERNAL | CSRF/PATCH 무기한 저장 → 토큰 조회부터15초 signal, timeout 회귀 PASS | FIXED |
| F03 | P1/FLOW/INTRODUCED | EXTERNAL | 내부 홈 링크에서 저장 유실 → 같은 출처 일반 링크 capture/flush gate, Next Link 지연 저장 회귀 PASS | FIXED |
| F04 | P2/CODE/INTRODUCED | EXTERNAL | 모든 metadata 대기로 첫페이지 차단 → fallback 즉시 게시·개별 크기 갱신, 지연 metadata 회귀 PASS | FIXED |
| F05 | P2/CODE/INTRODUCED | EXTERNAL | 내장 링크가 다른 QR CPU 대기 → 독립 annotation 준비, 멈춘 다른 QR 회귀 PASS | FIXED |
| F06 | P2/FLOW/INTRODUCED | EXTERNAL | 심사 카드/표가 지운 이름을 추출 이름으로 복원 → 명시 title 권위, 이전 응답만 fallback·회귀 PASS | FIXED |
| F07 | P2/CODE/INTRODUCED | EXTERNAL | 저장 중 외부 갱신 손실 → 대기 갱신 반영·자기 정규화 보존, 성공/실패 회귀 PASS | FIXED |
| F08 | P2/CODE/INTRODUCED | EXTERNAL | 배율 한계 반복이 canvas 삭제 → 실제 값 변경만 revision, 회귀 PASS | FIXED |
| F09 | P2/FLOW/INTRODUCED | EXTERNAL | 합격자 원본 모달의 낮은 높이 잘림 → 사용자 범위 제외로 추가 변경 복원, 후속 보류 | OPEN |
| F10 | P2/FLOW/INTRODUCED | EXTERNAL | 페이지 재시도가 만료 주소 재사용 → source refresh 연결, callback 회귀 PASS | FIXED |
| F11 | P2/CODE/INTRODUCED | EXTERNAL | 이름/메모·PDF 표시 실패 누락 → 정제된 오류 분류 수집, 4xx/취소 제외·PII 회귀 PASS | FIXED |
| F12 | P2/CODE/INTRODUCED | EXTERNAL | 필드와 오류 연결 없음 → errorField·aria-invalid/describedby, UI 회귀 PASS | FIXED |
| F13 | P3/CODE/INTRODUCED | EXTERNAL | 표 checkbox 작은 타깃 →44px label로 확대·lint/build 확인 | FIXED |
| F14 | P2/CODE/INTRODUCED | EXTERNAL | 활동 시간v1/v2 합산 → metric_version 선택/그룹, 스크립트 문법 확인 | FIXED |
| F15 | P3/DOC/INTRODUCED | EXTERNAL | 메모 실패 이벤트 문서 불일치 → 시도/결과와 성공 전용 이벤트 구분 | FIXED |
| F16 | P3/TEST/INTRODUCED | EXTERNAL | 타 소유자 결과 무시 회귀 약화 → 이름 포함 payload·이름null/UPLOADING 단정, 서비스 테스트 PASS | FIXED |
| F17 | P2/CODE/INTRODUCED | INDEPENDENT_REVIEW | progressive size 변경이 이전 완료 키 재사용 → 크기 포함 렌더 키, 독립 지연 렌더 회귀 PASS | FIXED |
| F18 | P2/FLOW/INTRODUCED | EXTERNAL | 합격자 연락처/일정의 빈 이름 fallback → 사용자 범위 제외로 추가 변경 복원, 후속 보류 | OPEN |

발견18=해결16+미해결2, P0 0/P1 3/P2 12/P3 3. PRECHECK0/INDEPENDENT_REVIEW1/POST_FIX_CHECK0/EXTERNAL17/REJECTED0.
필수 push 전 PASS5/FAIL0/UNVERIFIED1/N/A0. R06의 원격 CI 결과는 PR #533 최신 실행 링크로 보완한다. OPEN2는 사용자 지정 후속 범위다.

## 추가 전용 상태 이력

과거 시각을 추정하지 않고 아래 기록에서 확인·수정 검증을 정리한 시각을 사용한다. 최초 PR은 #533이다.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-05-audit-pr-feedback-F01 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E02 | 2026-11-05-audit-pr-feedback-F01 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E03 | 2026-11-05-audit-pr-feedback-F02 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E04 | 2026-11-05-audit-pr-feedback-F02 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E05 | 2026-11-05-audit-pr-feedback-F03 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E06 | 2026-11-05-audit-pr-feedback-F03 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E07 | 2026-11-05-audit-pr-feedback-F04 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E08 | 2026-11-05-audit-pr-feedback-F04 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E09 | 2026-11-05-audit-pr-feedback-F05 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E10 | 2026-11-05-audit-pr-feedback-F05 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E11 | 2026-11-05-audit-pr-feedback-F06 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E12 | 2026-11-05-audit-pr-feedback-F06 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E13 | 2026-11-05-audit-pr-feedback-F07 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E14 | 2026-11-05-audit-pr-feedback-F07 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E15 | 2026-11-05-audit-pr-feedback-F08 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E16 | 2026-11-05-audit-pr-feedback-F08 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E17 | 2026-11-05-audit-pr-feedback-F09 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E18 | 2026-11-05-audit-pr-feedback-F10 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E19 | 2026-11-05-audit-pr-feedback-F10 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E20 | 2026-11-05-audit-pr-feedback-F11 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E21 | 2026-11-05-audit-pr-feedback-F11 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E22 | 2026-11-05-audit-pr-feedback-F12 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E23 | 2026-11-05-audit-pr-feedback-F12 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E24 | 2026-11-05-audit-pr-feedback-F13 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E25 | 2026-11-05-audit-pr-feedback-F13 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E26 | 2026-11-05-audit-pr-feedback-F14 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E27 | 2026-11-05-audit-pr-feedback-F14 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E28 | 2026-11-05-audit-pr-feedback-F15 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E29 | 2026-11-05-audit-pr-feedback-F15 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E30 | 2026-11-05-audit-pr-feedback-F16 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E31 | 2026-11-05-audit-pr-feedback-F16 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E32 | 2026-11-05-audit-pr-feedback-F17 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E33 | 2026-11-05-audit-pr-feedback-F17 | FIXED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
| E34 | 2026-11-05-audit-pr-feedback-F18 | CONFIRMED | 2026-11-05T23:11:51+09:00 | 위 리뷰/수정·회귀, F09/F18 범위 보류 / #533 |
