# 합격자 연락처 이메일 표시

- 작업 ID: `2026-10-31-audit-contact-email`. 평가표 v1, 평가일 2026-10-31.
- 요청: 기존 합격자 연락처에 PDF에 기재된 이메일도 표시.
- 범위: 기존 본문 조회에서 전화번호와 이메일을 독립적으로 읽는다. 별도 API/재분석/추출 payload 변경 없음.

| ID | 필수 | 기대 결과·실패 경계 | 검증 방법·결과 |
| --- | --- | --- | --- |
| R01 | 예 | 명시된 이메일 읽기, 중복 제거, 누락/다중 구분. 잘못된 주소 부분 추출·URL/줄바꿈 추정 금지 | PASS — contact-email 테스트: 일반/plus/전각/mailto/중복/로컬case보존/다중/누락/잘못된 토큰/URL/길이/줄바꿈 |
| R02 | 예 | 전화번호와 독립 표시, 동일 PDF 조회 재사용. PASS·취소·401 제거 유지 | PASS — use-passed-contacts 독립값·추가 요청 부재·오류 상태 테스트, workbench의 원문/상위401 뒤 이메일 제거 통합 테스트 |
| R03 | 예 | 이메일 열/확인 인원/상태·긴 주소 표시 및 모바일 넘침 제어 | PASS — 실제 로컬 API 합성 PDF 3명 추가 후 브라우저 단일2/다중1/기존누락 행 확인, 긴 주소 줄바꿈. viewport 390×844 설정에서 문서 가로 넘침 false, 표 내부 스크롤. 설정 원복 |
| R04 | 예 | 이메일 저장소·분석 미전송, 기존 이벤트 의미/집계 유지 | PASS — 정확한 분석 이벤트 속성 테스트에 이메일 본문 포함. analytics 문서/대시보드 기준 검토 및 관련 회귀 통과. 신규 저장/이벤트 경로 없음 |
| R05 | 예 | lint/타입/빌드, 독립 평가1회, 미사용/임시 경로 정리 | PASS — 관련 테스트136개, lint, webpack 프로덕션 빌드, diff check 통과. 독립 읽기전용 평가1회, 신규 심볼 참조 존재/설정·의존성 추가 없음 |

서버 계약·권한·추출 payload·AI·메일 발송/명의 검증은 변경하지 않는다. 실제 개인정보/운영 테스트는 범위 밖.
## 실행 근거와 제한

- frontend: `npm test -- src/features/pdf-reviews src/components/pdf-reviews src/features/analytics` → 17파일/136개 통과.
- `npm run lint`, `npm run build -- --webpack` → exit 0. 기본 Turbopack 빌드 결과로 바꾸어 표현하지 않는다.
- `/private/tmp/yesulin-email-create.py`, `/private/tmp/yesulin-email-seed.py`로 로컬 테스트 심사함에 합성 PDF 3명만 추가했다.
  기존 8명의 payload/판정은 갱신하지 않았다. 사용자가 바꾼 기존 합격 상태를 유지해 확인 시 전체11명/PASS9명이었다.
  가짜 원본3개와 추출결과3개 실제 조회, 완료집계11 확인. 추가한 단일 이메일2개와 다중1개가 UI에 일치했다.
  로컬 fixture payload를 직접 넣었으며 실제 추출 워커/AI 성공 시험은 아니다. 제품 코드에 임시 fixture를 넣지 않았다.
- 스크린샷: `/private/tmp/yesulin-contact-email-desktop.png`, `/private/tmp/yesulin-contact-email-mobile.png`.
  이메일은 예약된 테스트 도메인으로만 만들었다. 원본 PDF는 대표 긴 주소를 Poppler로 렌더링해 잘림이 없음을 확인했다.
- 기존 저장된 본문만 사용하므로 이미지 속 이메일, 줄바꿈으로 분리된 주소, 비ASCII 로컬 주소 등의 자동 확인은 보장하지 않는다.
  수신 가능 여부나 주소 명의는 검사하지 않는다. 이메일 발송은 구현/실행하지 않았다.
- 독립 평가1회: 별도 실행 가능한 타 종류 도구가 없어 동일 종류의 별도 에이전트로 읽기전용 검토. 파서/훅/UI/문서/개인정보 경로/신규 참조/불필요 설정·의존성 및 diff check 확인, 확정 문제 없음. 재귀 평가 없음. 테스트·브라우저는 작성자 실행 근거다.

필수 PASS5 / FAIL0 / UNVERIFIED0 / N/A0. 5/5는 위 확인 범위이며 이메일 추출 정확도나 운영 품질 점수가 아니다.
PR 없음(PENDING). 발견/해결/미해결 0/0/0, P0~P3 모두0. PRECHECK0 / INDEPENDENT_REVIEW0 / POST_FIX_CHECK0 / EXTERNAL0. 오탐0 / 미확인0. 문제 상태 사건 없음.
