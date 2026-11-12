# 공개 공고 카드 자동 prefetch 평가

- 작업 ID: `2026-11-12-auditionpost-card-prefetch`
- 평가일: 2026-11-12 (Asia/Seoul)
- 평가표: v1
- 기준: 공개 공고 상세 흐름과 [공통 평가 규칙](../../../../../../../../../docs/agent-review.md)

| 항목 | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| C01 | 홈·공고 목록에서 카드 노출 | 상세를 클릭하기 전에 자동 조회 발생 | 카드 노출 시 상세 네트워크 요청 없음 | 같은 브라우저 조건에서 기존·신규 Preview의 `/posts/{id}` 요청 비교 | 예 |
| C02 | 홈·공고 목록에서 카드 클릭 | 목적지 변경, 응답 실패 또는 상세 본문 미표시 | 해당 공고 상세가 정상 응답하고 제목·본문 표시 | 신규 Preview의 두 진입점에서 실제 클릭 및 네트워크 응답 확인 | 예 |
| C03 | 공개 공고와 상세 기능의 경계 | 다른 링크, 조회수·출처·첨부·관리자 미리보기에 변경 유입 | 공용 포스터 카드의 자동 prefetch 설정 한 곳만 변경 | 코드 비교 및 기존 공고 관련 테스트 | 예 |
| C04 | 배포 대상 | 변경 커밋이 Production에 연결됨 | 변경 커밋은 Preview에 배포되고 Production 커밋 유지 | Vercel 배포 환경과 커밋 대조 | 예 |

권한, 저장, 재시도·중단 흐름은 링크의 선행 조회 설정만 바꾸므로 이번 범위에서 N/A.

## 결과

- 변경 커밋: `8a1ab247cb985ddaa03308940bd7caab1dd7c9f7`, `perf/disable-audition-card-prefetch`
- 비교: [변경 전 ISR Preview](https://yesulin-frontend-git-perf-home-isr-yesul-in.vercel.app/) / [변경 후 Preview](https://yesulin-frontend-hv6be4tat-yesul-in.vercel.app/)
- 같은 인앱 브라우저의 기본 뷰포트에서 페이지 진입 후 클릭 전 동일 출처의 `/posts/{id}` 리소스를 셌다. 이 값은 해당 브라우저 관측치다.

| 항목 | 판정 | 근거 |
| --- | --- | --- |
| C01 | PASS | 홈 10건 → 0건, 오디션 목록 24건 → 0건. 기존 Preview의 요청은 모두 RSC 요청이었다. |
| C02 | PASS | 두 화면에서 실제 카드 클릭 후 `/posts/4104` RSC 요청이 각각 1건 발생했고, 해당 제목과 경로가 일치했다. 상세 직접 GET은 200이며 상세 article을 포함했다. |
| C03 | PASS | 공용 공고 카드 링크의 prefetch 설정 한 줄만 변경했다. 기존 공고 관련 테스트 5개 파일 33개, 변경 파일 lint, diff 검사 통과. 상세 조회수·분석·첨부·원문 및 관리자 코드는 동일하다. |
| C04 | PASS | [Vercel 배포](https://vercel.com/yesul-in/yesulin-frontend/6ME7dkd1xZcdnd11DuwBpTJaptQU) 성공. GitHub 배포 환경 Preview, `production_environment=false`. 검증 뒤 main과 최신 Production 기록 모두 `a49e6c4`. |

로컬 빌드는 컴파일 단계에서 결과가 나오지 않아 중단했다. 변경 커밋의 Vercel Preview 빌드는 성공했다. 운영 트래픽의 실제 절감량은 이번 브라우저 표본으로 산정하지 않는다.

## 독립 평가

독립 평가 1회 완료. 공용 카드의 사용처와 상세 기능 경계, 문서 링크, 미사용 변경을 확인했다. 검토에서 요청한 본문·배포 환경 근거는 상세 200 응답 및 Production SHA 재확인으로 보강했다.

- 필수 항목: PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0
- 신규 확정 문제: 발견 0 / 해결 0 / 미해결 0
- 신규 심각도: P0 0 / P1 0 / P2 0 / P3 0
- 발견 경로별 신규 확정: PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0
- 오탐(REJECTED): 0
- 문제별 상태 사건: 없음
