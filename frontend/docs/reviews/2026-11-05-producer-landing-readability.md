# 공연사 랜딩 가독성 정리 평가

- 작업 ID: `2026-11-05-producer-landing-readability`
- 평가일: 2026-11-05, Asia/Seoul
- 대상: `/producer-service`와 공개 헤더 로고, 기준 `origin/dev` 26901533, 최초 평가 커밋 2ff79d0f
- 독립 평가: 1회 완료. 구현 Claude, 평가 Codex(읽기 전용). 수정 후 검증은 구현자가 수행했고 재귀 평가는 하지 않는다.
- 기준: 최상위 AGENTS → frontend/AGENTS → frontend/docs/README → frontend/docs/AGENTS, docs/domain.md의 공연사 게시·PDF 심사함,
  design-system.md. 장식 패턴 점검은 사용자가 지정한 외부 참고(hallmark의 gates 목록)를 사용했다.
- 판정: 통과. 미해결 문제 없음. 실제 휴대폰 확인은 미확인이다.

## 평가표 producer-landing-readability-v1

| ID | 흐름 / 실패 조건 | 기대 결과 | 검증 방법·근거 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| R01 | 마무리 영역 제목 | 검은 배경 위 흰 글씨 | 선택자 우선순위 대조, 1440px 브라우저에서 계산된 색 rgb(255,255,255) | 예 | PASS |
| R02 | 기능 안내 | 메일 가져오기 미출시, PDF 심사함, 운영팀 공유 구분 | 문구와 domain.md 대조 | 예 | PASS |
| R03 | 장식 패턴 | 제목 위 라벨, 그라데이션 강조 글자, 가운데 점, 같은 숫자 반복, 가짜 창 버튼 없음 | 코드 검색, 랜딩 테스트(가운데 점 없음, 240+ 1회) | 예 | PASS |
| R04 | 단계 탭 접근성 | 기존 키보드·ARIA 유지 | 부모 커밋 대조, producer-flow-tabs.test | 예 | PASS |
| R05 | 테스트 | 관련 테스트 통과 | 평가자 환경은 임시 디렉터리 권한으로 미실행, 구현자 환경에서 18개 통과 | 예 | PASS |
| R06 | 코드 규칙 | else·삼항·주석 없음 | 정적 검토, ESLint | 예 | PASS |
| R07 | 미사용 정리 | 소비자 없는 선언 없음 | F01 수정 후 참조 0건 | 예 | PASS |
| R08 | 문서 | design-system.md 1200px 설명이 구현과 일치 | notebook-container 대조 | 예 | PASS |
| R09 | 로고 | main의 정렬 변경과 동일 | 570a9f2e diff 대조, 브라우저에서 transform 적용 확인 | 예 | PASS |
| R10 | 1440/375px 화면 | 겹침·가로 넘침 없음 | MSW 개발 서버 스크린샷, scrollWidth 차이 0 이하 | 예 | PASS |
| R11 | 실제 휴대폰 | 터치·스크롤 체감 | 미실행 | 아니오 | UNVERIFIED |

필수 PASS 10 / FAIL 0 / UNVERIFIED 0, 선택 UNVERIFIED 1.

## 확정 문제와 조치

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 시각 | 근거·조치·상태 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-05-producer-landing-readability-F01 | P3·UNUSED·INTRODUCED | INDEPENDENT_REVIEW | 2026-11-05T10:45:20+09:00 / 이번 PR | 2026-11-05T10:46:10+09:00 | 제목 위 라벨 삭제 후 `--p-blue-soft` 선언만 남음. 삭제 후 참조 0건, 테스트 통과. FIXED |

## 집계

발견 1 / 해결 1 / 미해결 0, P0 0 / P1 0 / P2 0 / P3 1, 미확인 1.
