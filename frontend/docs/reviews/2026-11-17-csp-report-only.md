# CSP 관찰 헤더 배포 검증

작업 ID `2026-11-17-frontend-csp-report-only`, 평가일 2026-11-17 (Asia/Seoul), 평가표 v1.

| ID | 실패 조건 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| S01 | 브라우저가 이 정책으로 리소스를 차단함 | 구성 테스트와 Preview 응답 헤더, Chrome의 `report` 위반 이벤트 확인 | 예 | PASS |
| S02 | Next.js 식별 헤더 노출이나 Preview 검색 제외 회귀 | 구성 테스트와 Preview HTML 응답 확인 | 예 | PASS |
| S03 | 로그인 뒤 확인 없이 인증을 통과로 기록함 | Preview에서 이메일 인증을 완료한 개발 테스트 공연사의 로그인과 세션 상태 확인 | 예 | PASS |
| S04 | 운영 배포 또는 Preview의 전체 업로드·원본 읽기 흐름을 검증했다고 기록함 | 운영 배포와 실제 저장소를 포함한 Preview 통합 검증 | 아니요 | UNVERIFIED |

## 검증 결과

- 최신 `dev`에서 설정 테스트 19건, 변경 파일 ESLint, 목 API를 사용하는 Next.js webpack production 빌드가 통과했다. 생성된 라우트 매니페스트에서 Report-Only 헤더를 확인했다.
- [검증한 Vercel Preview](https://yesulin-frontend-gmcp02zxs-yesul-in.vercel.app)의 홈과 로그인은 200, `Content-Security-Policy-Report-Only`, `X-Robots-Tag: noindex`를 반환했다. `X-Powered-By`와 강제 CSP 헤더는 응답에 없었다. 브라우저는 Next.js 인라인 스크립트와 Vercel 툴바의 `script-src-elem` 위반을 기록했다.
- Preview 개발 공연사 세션은 정상 로그인 및 이메일 인증을 완료했다. 합성 PDF의 원본 응답만 대체한 독립 브라우저에서 PDF.js 캔버스와 QR용 WASM 로딩을 확인했다. 이 샘플에서 추가 `connect-src`·`worker-src`·WASM 위반은 관찰되지 않았다.
- 기본 Preview에서 GTM은 비활성이다. 격리 브라우저에 실제 GTM·GA 스크립트를 로드했을 때 둘 다 200이었다. 수집 전송을 중단한 상태에서 `www.google.com/g/collect`의 `connect-src` 위반을 관찰했다.
- 인라인 스크립트 허용 방식과 캐시 영향을 확인한 뒤 강제 CSP를 별도로 검증한다. 기존 진단의 CSP 강제 적용(`2026-11-17-frontend-response-headers-F01`)과 식별 헤더 제거의 운영 반영(`2026-11-17-frontend-response-headers-F02`)은 배포 후 확인한다.

독립 평가 1회 완료. 필수 PASS 3건, FAIL 0건, UNVERIFIED 0건, N/A 0건. 비필수 UNVERIFIED는 S04 1건이다. 신규 발견·해결·미해결·P0~P3·오탐 0건. 기존 Preview와 변경 파일 3개의 내용 일치, Report-Only·noindex·rewrite 조건, 미사용 코드·설정·의존성 유입 여부를 확인했다.
