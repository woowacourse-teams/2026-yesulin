# 심사 상세 원본 다운로드 버튼 배치

작업 ID `2026-11-27-review-download-sidebar`. 2026-11-27 KST, [Audit 평가표 v1](../../../backend/src/main/java/art/yesulin/audit/docs/reviews/criteria.md)을 적용했다.

| ID | 흐름과 실패 조건 | 검증 방법 및 결과 |
| --- | --- | --- |
| UI1 | 변환 대기·실패·준비 상태에서 원본을 다운로드할 수 있을 때, 내부 메모 바로 앞에 버튼 하나만 보인다. 권한을 잃으면 버튼이 사라지고 메모 입력값은 유지된다. | PASS. 실제 ScreeningBoard를 렌더링해 세 상태의 버튼 개수와 DOM 순서, 메타데이터 조회 1회, 다운로드 요청이 403을 받은 뒤의 메모와 버튼 상태를 확인했다. 모바일 단일 열에서도 동일한 DOM을 쓰고 전체화면에서는 배경 패널을 inert로 만든다. |
| A08 | 메모 패널이 없는 합격자 연락처 뷰어에서 원본 다운로드를 계속 제공한다. | PASS. ReviewPassedContacts의 기존 호출과 ReviewOriginalDocument의 단독 렌더링 테스트를 확인했다. 다운로드 시 재인가, 일시 오류 뒤 재시도, 한글 배치 안내, 원본 요청 이벤트 발생 기준을 유지한다. |

Node 24.22.3에서 프런트 테스트 226개 파일 1,280건, ESLint, TypeScript, Next.js 프로덕션 빌드를 통과했다. 권한·오류·배치·전체화면·단독 뷰어의 관련 테스트 42건과 변경 경로를 독립 평가자가 검토했다. 사용하지 않는 파일·의존성·설정은 발견되지 않았다. 모바일과 데스크톱의 배포 화면 검증은 이 로컬 평가의 범위 밖이다.

## 평가 집계

독립 평가 1회. 필수 PASS 2, FAIL 0, UNVERIFIED 0, N/A 0. 신규 확정 문제는 발견 0, 해결 0, 미해결 0이다. P0~P3와 PRECHECK·INDEPENDENT_REVIEW·POST_FIX_CHECK·EXTERNAL 각 0건, 오탐 0건이다.

## 상태 이력

확정·해결·재개·오탐 사건 없음.
