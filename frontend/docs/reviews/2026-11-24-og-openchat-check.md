# 카카오 오픈채팅 공유 이미지 조사

- 작업 ID `2026-11-24-og-openchat-check`, 평가표 v3, 평가일 2026-11-24
- 기준 [프론트 구조](../architecture.md), [배포](../deployment.md), [공통 평가 절차](../../../docs/agent-review.md)
- 운영·개발 대표 이미지, 공개 공고 공유 링크, 카카오 오픈채팅방 초대 링크를 조사하고 예술in 공통 OG 이미지 파일명을 바꾼다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 운영·개발 홈과 운영 소개·목록 | 구 이미지 주소, 빈 태그 또는 잘못된 이미지 호스트 | 크롤러에 각 배포의 버전 이미지 제공 | 크롤러 User-Agent로 HTML `<head>` 확인 | Y | PASS |
| C02 | 배포 이미지 응답 | URL은 최신이지만 파일이 구 버전 | 최신 1200×630 PNG 응답 | HTTP 응답과 로컬 PNG의 SHA-256 비교 | Y | PASS |
| C03 | 공고 상세·OTR 공유 링크 | 본문 사진이 누락되거나 대체 이미지가 구 버전 | 본문 첫 사진 또는 최신 대표 이미지 | 운영 공고 상세 두 건 및 OTR 경유 한 건의 HTML 확인 | Y | PASS |
| C04 | 오픈채팅방 초대 링크 | 초대 카드의 이미지 출처를 예술in으로 오인 | 초대 페이지에 표시된 이미지의 호스트 확인 | 서비스 푸터의 초대 링크에서 `og:image`와 응답 확인 | Y | PASS |
| C05 | 문의가 발생한 카카오톡 카드 | 공유 시 실제 표시에 구 이미지 사용 | 공고 344의 카카오 미리보기에 현재 대표 이미지 표시 | 사용자 캡처·Git 이전 PNG·현재 HTML 및 이미지 대조 | Y | FAIL |
| C06 | 저장·인증·권한·재시도 | 런타임 동작 변경 | 공유 메타데이터와 정적 자산만 변경 | 변경 파일 점검 | N | N/A |
| C07 | 카카오 미리보기 재수집 | 같은 주소에서 구 이미지 재표시 | 새로운 카카오 공유 카드에 현재 대표 이미지 표시 | 공식 도구의 저장 정보와 새 메시지의 미리보기 확인 | Y | UNVERIFIED |
| C08 | 이름을 바꾼 공통 메타데이터 | OG 또는 Twitter가 이전 경로를 사용하거나 호스트가 틀림 | 운영·개발 환경에서 새 파일명을 사용 | 기존 주소 단위 테스트와 빌드 후 크롤러 HTML 확인 | Y | PASS |
| C09 | 정적 파일 배포 | 새 URL에서 파일 누락·바이트 변경 | 새 파일명으로 동일한 PNG 응답 | Git의 기존 파일과 빌드에서 반환하는 이미지 SHA-256 비교 | Y | PASS |
| C10 | 공지에 사용하는 공고 공유 링크 | 포스터 또는 공통 이미지 선택 규칙의 회귀 | 본문 첫 사진이 있으면 사진 사용, 없으면 새 대표 이미지 사용 | 공고 메타데이터 테스트 및 공유 쿼리를 포함한 크롤러 HTML 확인 | Y | PASS |
| C11 | 변경 범위 | 미사용 자산이나 이전 활성 경로가 남음 | 공통 사용처와 배포 테스트가 새 경로를 사용 | 경로 참조·변경 파일·빌드 검사 | Y | PASS |

## 확인 근거

- `kakaotalk-scrap/1.0` User-Agent로 운영 `/`, `/about`, `/producer-service`, `/auditions`의 응답을 확인했다. 모두 HTTP 200이며 `<head>`의 `og:image`는 `https://yesulin.art/images/og-image.png?v=20261106-open-door`였다. 개발 `/`도 HTTP 200이며 같은 이미지 경로를 `https://dev.yesulin.art`에서 제공한다.
- 운영·개발 대표 이미지는 모두 HTTP 200, PNG 1200×630, 977630바이트이며 SHA-256 `b830226c2d1474f71f525b0108aa32ba67d091619f4a769ebfacd639ba0b81ff`가 로컬 최신 파일과 일치한다. 운영의 쿼리 없는 이미지 주소도 같은 파일을 반환한다.
- 운영 `/posts/344?src=kakao_openchat`에는 대표 이미지, `/posts/345?src=kakao_openchat`에는 CloudFront의 공고 본문 첫 이미지가 지정된다. `/otr?vid=22764&src=kakao_openchat`에는 운영 대표 이미지가 지정된다. 해당 페이지와 이미지 응답은 HTTP 200이었다.
- 서비스 푸터의 초대 링크 `https://open.kakao.com/o/pCRrDXOi`는 `https://iopen.kakaocdn.net/img/og/v2/ko_scrap_sv_003.png`를 지정한다. 초대 페이지와 이미지는 HTTP 200이며 예술in 대표 PNG와 다른 파일이다.
- 사용자 캡처로 문제가 발생한 정확한 주소가 `https://yesulin.art/posts/344?src=kakao_openchat`임을 확인했다. 카드에 나온 ‘오디션 공고부터 공연 예매까지’ 이미지는 Git `f304dbf5`의 구 PNG와 시각적으로 일치한다.
- 12:17 KST에 정확한 공유 URL을 크롤러·카카오 인앱 브라우저 User-Agent로 다시 요청했다. HTML은 HTTP 200, `x-vercel-cache: MISS`, `age: 0`이었으며 `<head>`의 `og:image`가 한 개이고 최신 이미지였다. canonical 주소와 추가 쿼리를 붙인 테스트 주소도 같은 이미지를 지정했다. 이미지의 Vercel cache HIT 응답과 재검증 헤더를 붙인 응답 모두 최신 SHA-256이었다.
- [카카오 공식 메타정보 조회 도구](https://developers.kakao.com/tool/debugger/sharing)는 브라우저에서 로그인 화면으로 이동했다. 카카오 스크랩 메타데이터·썸네일·기기의 캐시 중 어느 곳에 구 버전이 남았는지와 새 메시지에서의 갱신은 확인이 필요하다. 카카오는 스크랩 메타데이터와 별도의 썸네일 캐시를 설명하고 새 이미지 URL을 안내한다. [카카오 데브톡 답변](https://devtalk.kakao.com/t/og/147109)
- 사용자가 같은 링크를 새로 공유해도 구 이미지가 표시된다고 확인했다. C07은 파일명 변경을 배포한 뒤 같은 URL로 다시 검증한다.

## 파일명 변경과 검증

- 공통 이미지 파일을 `og-image-20261124-open-door.png`로 옮기고 `SHARE_IMAGE_PATH`에서 쿼리 없는 새 경로를 사용한다. 기존 PNG와 새 파일은 바이트가 같으며 크기는 1200×630이다.
- 관련 Vitest 3개 파일에서 31개 테스트가 통과했고 변경한 TypeScript 파일 3개의 ESLint가 통과했다. 활성 코드와 테스트의 구 경로 참조는 0건이다.
- 다른 작업의 미커밋 변경과 분리하기 위해 HEAD에 OG 코드와 자산 변경만 적용한 사본에서 `VERCEL_ENV=production`, `VERCEL_ENV=preview`의 `npm run build`가 모두 통과했다.
- 두 빌드를 로컬에서 실행해 `kakaotalk-scrap/1.0` User-Agent로 `/`, `/about`, `/producer-service`, `/auditions`, `/posts/344?src=kakao_openchat`, `/posts/345?src=kakao_openchat`, `/otr?vid=22764&src=kakao_openchat`의 HTML을 검증했다. 공고 데이터는 로컬 HTTP fixture로 제공했다. 모두 HTTP 200이며 기본 이미지의 OG·Twitter 태그는 환경에 맞는 운영 또는 개발 호스트의 새 경로를 가리켰다. 사진이 있는 공고의 두 태그는 fixture 포스터를 유지했다.
- 두 로컬 빌드에서 새 PNG 경로는 HTTP 200 `image/png`와 기존 SHA-256을 반환했다. 운영·개발 실제 배포와 오픈채팅 재공유는 확인 대기다. PR Preview가 가리키는 개발 호스트의 새 파일은 dev 배포가 적용된 뒤 열린다.
- 파일을 옮겨 활성 코드의 이전 경로를 제거했다. 이전 이미지 주소를 저장한 외부 소비자의 결과는 확인하지 못했다.

- PR 브랜치를 최신 `dev`(`9a815d96`)에서 만들고 OG 변경만 옮겼다. 관련 테스트 31개와 표적 ESLint, Preview 빌드, 7개 HTML과 PNG 응답을 다시 검증했다.

## 평가 결과

- 필수 PASS 8 / FAIL 1 / UNVERIFIED 1, N/A 1. 필수 검증률 80%(8/10). C05는 수정 전 확인한 증상이다.
- 최초 독립 평가 1회에서 배포 근거와 코드·문서의 일치, 로컬 파일의 해시·크기, 문서의 내부 링크를 확인했다. HTTP 응답은 조사 결과를 근거로 대조했다. 미사용 파일·코드·설정·의존성·옛 문서 유입은 0건이었다. 지정 외부 평가 CLI를 사용할 수 없어 같은 유형의 별도 평가 세션을 사용했다.
- 캡처가 추가된 뒤 독립 평가자가 C05 FAIL, C07 UNVERIFIED와 P2 외부 발견을 표적 검토했다. 발송된 카드의 구 이미지와 새 메시지에서의 재현 여부를 구분했다. 공식 답변은 스레드 주소에서 다시 확인해 링크를 갱신했다.
- 파일명 변경 독립 평가 1회 완료. 평가자가 PNG 해시·크기, 공통 이미지 참조, 포스터 유지, 테스트·빌드 근거와 추가 문서 링크를 확인했다. 이번 변경으로 들어온 미사용 파일·코드·설정·의존성·옛 문서와 신규 확정 결함은 0건이다.
- 신규 확정 문제 발견 1 / 해결 0 / 미해결 1 / P0 0 / P1 0 / P2 1 / P3 0.
- PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 1, 오탐 0, 미확인 1.

- PR 게시 전 별도 검토에서 `dev` 대비 5개 변경과 PNG의 동일 바이트 이동, C05·C07·F01의 집계, 기록 링크를 확인했다.

## 문제와 사건 이력

| 문제 ID | 심각도·유형·유입 | 최초 확정 / 최초 PR | 해결 시각 | 근거 및 상태 |
| --- | --- | --- | --- | --- |
| `2026-11-24-og-openchat-check-F01` | P2·FLOW·UNKNOWN | 2026-11-24T12:17:29+09:00 / [#633](https://github.com/woowacourse-teams/2026-yesulin/pull/633) | 미해결 | 파일명을 변경하고 로컬 빌드에서 새 URL을 검증했다. 배포 후 같은 공고 링크를 공유한 결과 확인 대기. OPEN |

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거 및 관련 PR |
| --- | --- | --- | --- | --- |
| `2026-11-24-og-openchat-check-F01-E01` | `2026-11-24-og-openchat-check-F01` | CONFIRMED | 2026-11-24T12:17:29+09:00 | 오픈채팅 캡처와 운영 HTTP 응답 대조, PR [#633](https://github.com/woowacourse-teams/2026-yesulin/pull/633) |
