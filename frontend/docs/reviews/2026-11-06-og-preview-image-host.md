# Preview OG 이미지 호스트 수정 평가

- 작업 ID: `2026-11-06-og-preview-image-host`, 평가표 v1
- 범위: Vercel Preview 메타데이터가 preview 배포 이미지를 공유 크롤러에 전달하도록 수정
- 영향: 공유 링크가 운영에서 dev로 이동하는 코드 설정은 PR #564에 들어갔고, 이 후속 문제는 Preview의 `og:image`가 운영 호스트를 가리켜 dev 카드가 이전 이미지를 받게 한 점임
- 근거: 사용자 스크린샷 및 HTTP 검사에서 `dev.yesulin.art` 문서의 `og:image`가 운영 `yesulin.art`를 가리키고, 그 URL 응답은 변경 전 686329-byte 이미지였음. 같은 경로의 dev 응답은 변경된 977630-byte 이미지였음

| ID | 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| P01 | Preview 링크가 운영의 구 이미지 사용 | Preview에선 dev 이미지 origin 사용, production/local은 공통 경로 유지 | URL helper의 preview/production/local 단위테스트 | Y | PASS |
| P02 | OG와 Twitter 메타 불일치 | 두 메타 모두 동일한 이미지 주소 사용 | 공통 `SHARE_IMAGE`를 이용한 OG/Twitter 테스트 | Y | PASS |
| P03 | 새 URL에서 이미지 조회 실패 | Preview HTML이 dev 이미지를 가리키고 대상 자산 응답 200 | Vercel PR Preview를 카카오 크롤러 User-Agent로 HTTP 조회, dev PNG 200·977630 bytes·SHA256 일치 | Y | PASS |
| P04 | 회귀·불필요 변경 | 기존 배포·개별 포스터 동작 유지, 코드·문서 범위 최소 | lint·관련 테스트 28개·diff, 제품 변경 파일2개와 평가 기록만 추가 | Y | PASS |
| P05 | 메신저 썸네일 캐시 문제 | 실제 스크랩 갱신 결과 확인 | 카카오에서 OG 재요청 후 확인 | N | UNVERIFIED |
| P06 | API·인증·저장·권한 | 정적 공유 메타 변경이라 해당 없음 | 코드 범위 확인 | N | N/A |

## 조사 근거

- 2026-11-06 사용자 확인: 카카오톡 공유 카드에 이전 관리 화면 이미지가 표시됨
- `dev.yesulin.art/`를 브라우저·facebookexternalhit·Twitterbot·kakaotalk-scrap User-Agent로 HTTP 200 조회
- 페이지 메타데이터는 새 버전 쿼리·1200×630 크기를 반환하나 `og:image` 호스트는 운영 `yesulin.art`
- `https://yesulin.art/images/og-image.png?v=20261106-open-door`: 200, 686329 bytes, SHA256 `bcb42817ca0b9c35427149d38af121356e7bc9a8dc43fec194e0e2f683a7fe0e`
- `https://dev.yesulin.art/images/og-image.png?v=20261106-open-door`: 200, 977630 bytes, SHA256 `b830226c2d1474f71f525b0108aa32ba67d091619f4a769ebfacd639ba0b81ff`

## 검증과 독립 평가

- `npm run lint`: 성공
- 관련 3개 테스트 파일 28개 통과
- Vercel PR Preview의 실제 HTML·이미지를 카카오 크롤러 User-Agent로 조회: HTML200, OG와 Twitter 모두 `https://dev.yesulin.art/images/og-image.png?v=20261106-open-door`, 1200×630, 이미지200·977630 bytes, SHA256이 dev 최신 PNG와 일치
- PR #567 Frontend·Backend·CodeQL·Vercel 검사 성공
- 독립 평가 1회 완료: 수정 코드 신규 결함0, P01·P02·P04 PASS, P03 Preview 런타임 검증 대기 권고, P05 카카오 갱신 UNVERIFIED, P06 N/A
- 검토 중 지적된 문서 집계 불일치(미확인5)는 고쳤고, 미확인은 P03·P05 2건임을 확인
- 모든 Preview가 dev 도메인의 최신 이미지 자산을 읽으므로 PR 전용 Preview 이미지와 혼동하지 않음
- dev alias 후속 확인: `https://dev.yesulin.art/`에서 카카오 크롤러 User-Agent가 OG와 Twitter 모두 dev 호스트 이미지 URL을 받고, 자산 응답 200·977630 bytes·SHA256 일치를 확인
- 후속 표적 확인으로 P03 PASS 갱신, 카카오 실제 카드 재요청만 미검증
- 최종 필수 PASS4 / FAIL0 / UNVERIFIED0, 비필수 UNVERIFIED1 / N/A1, 필수 검증률100%(4/4)

## 문제와 집계

| 문제 ID | 심각도·유형·유입 | 최초 확정 / 최초 PR | 해결 시각 | 근거·상태 |
| --- | --- | --- | --- | --- |
| 2026-11-06-og-preview-image-host-F01 | P2·CODE·INTRODUCED | 2026-11-06T23:33:01+09:00 / #564 | 2026-11-07T10:07:45+09:00 / #567 | #564의 공통 이미지 URL이 preview에서 운영 호스트를 생성, 사용자 화면·HTTP 해시로 확인. #567 수정 후 dev alias에서 크롤러 메타와 이미지 응답을 확인해 FIXED. 실제 카카오 카드 캐시 갱신은 미확인 |

## 추가 전용 상태 사건 이력

| 사건 ID | 문제 ID | 사건 | 발생 시각(+09:00) | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| 2026-11-06-og-preview-image-host-E01 | 2026-11-06-og-preview-image-host-F01 | CONFIRMED | 2026-11-06T23:33:01+09:00 | 사용자 카카오톡 캡처와 dev HTML의 운영 이미지 호스트·이미지 해시 불일치 / #564 |
| 2026-11-06-og-preview-image-host-E02 | 2026-11-06-og-preview-image-host-F01 | FIXED | 2026-11-07T10:07:45+09:00 | dev alias가 OG·Twitter에 dev 이미지 URL을 전달하고 이미지 200·977630 bytes·SHA256 일치 / #567 |

발견1 / 해결1 / 미해결0 / P0 0 / P1 0 / P2 1 / P3 0, PRECHECK0 / INDEPENDENT_REVIEW0 / POST_FIX_CHECK1 / EXTERNAL1, 오탐0, 미확인1
