# PR 프리뷰 빌드 분리 평가

- 작업 ID `2026-11-19-frontend-vercel-preview`
- 평가표 버전 `v1`
- 기준 [프론트 배포](../deployment.md), [공통 평가 절차](../../../docs/agent-review.md)

| ID | 단계 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| VP-01 | 백엔드 전용 PR | Vercel이 프론트를 빌드함 | 빌드 생략 | 규칙 테스트, 실제 PR의 Vercel 상태 | 예 |
| VP-02 | 프론트·혼합 PR | 이전 커밋의 변경, 공유 입력, 삭제·이동을 놓침 | 빌드 계속 | 규칙 테스트, 실제 프론트 PR의 Preview 상태 | 예 |
| VP-03 | 조회 실패·경쟁 상태 | 불완전한 응답이나 다른 SHA로 생략 | 빌드 계속 | 누락·요청 실패·SHA 불일치·응답 한도 테스트 | 예 |
| VP-04 | 통합 브랜치·PR 이전 푸시 | PR 외 배포를 생략함 | 빌드 계속 | 테스트, 설정과 차이 검토 | 예 |
| VP-05 | 연결·정리 | 설정이 스크립트를 가리키지 않거나 미사용 파일이 남음 | 진입점과 문서가 일치 | lint, 독립 평가 | 예 |

이 작업은 빌드 여부를 결정한다. 화면 기능, API 계약, 운영 배포 검증은 평가 범위에서 제외했다.

## 검증 근거

| ID | 결과 | 근거 |
| --- | --- | --- |
| VP-01 | PASS | [백엔드 검증 PR #619](https://github.com/woowacourse-teams/2026-yesulin/pull/619)의 `3bf3a03f`에는 백엔드 테스트 리소스 한 개만 들어 있다. 2026-11-19 12:48:00 KST에 [Vercel](https://vercel.com/yesul-in/yesulin-frontend/BCmj3GdXrgSCER98UbUPtsJHZhW3)이 `Canceled by Ignored Build Step`을 보고했다. |
| VP-02 | PASS | [프론트 검증 PR #620](https://github.com/woowacourse-teams/2026-yesulin/pull/620)의 `28280797`에는 프론트 정적 파일 한 개만 들어 있다. 2026-11-19 12:51:18 KST에 [Vercel](https://vercel.com/yesul-in/yesulin-frontend/3N4bVHxU5erwM7VZYqErtpfiWyja)이 `Deployment has completed`를 보고했다. [프리뷰 검증 경로](https://yesulin-frontend-git-test-vercel-frontend-preview-yesul-in.vercel.app/vercel-preview-verification.txt)에서 최종 커밋의 내용을 확인했다. 혼합·공유 경로·삭제·이동은 로컬 규칙 테스트에서 확인했다. |
| VP-03 | PASS | SHA 불일치, 비교 파일 수 불일치, 조회 실패, 응답 한도 테스트 통과. |
| VP-04 | PASS | 로컬에서 `dev`·`main`, 운영, PR ID 없음의 계속 빌드 규칙을 확인했다. #619의 PR 생성 전 `4832e569`에서 Vercel 배포가 완료된 것도 확인했다. |
| VP-05 | PASS | 변경 스크립트 ESLint 통과. 독립 평가에서 실행 진입점, 파일·의존성 참조와 문서 링크 확인. |

로컬 규칙 테스트 `npm test -- scripts/ignore-preview-build.test.mjs` 26건 통과. #618의 초기 구현 커밋 `e2126939`에서 GitHub Actions `Frontend`·`Backend` 체크 통과.

## 평가 집계

- 평가일 2026-11-19 (Asia/Seoul), 독립 평가 1회. 우선 검토 도구가 응답 기한을 넘어 별도 평가 에이전트로 진행했다.
- 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0.
- 신규 확정 문제 발견 0 / 해결 0 / 미해결 0 / P0 0 / P1 0 / P2 0 / P3 0
- 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0. 오탐 0.
- 기록할 문제 상태 사건은 없다.
