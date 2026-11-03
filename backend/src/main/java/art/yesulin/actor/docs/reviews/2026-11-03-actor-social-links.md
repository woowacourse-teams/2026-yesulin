# 배우 페이지 상단 SNS 링크

- 작업 ID `2026-11-03-actor-social-links` / 평가표 v1 / PR PENDING
- 공개 API·본인 미리보기가 제공한 링크를 기본정보 아래, 캐스팅 문의 위에 배치한다. SNS는 브랜드 아이콘, 일반 웹사이트는 호스트 이름과 링크 아이콘. 하단 중복 링크 제거.

| ID | 경계·실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| S01 | 알려진 SNS·위장 호스트 | 정확한 호스트만 브랜드로 구분 | 단위 테스트 | Y | PASS |
| S02 | 잘못된 URL·실행 스킴·중복 | HTTP(S)만 연결, 중복·빈 영역 없음 | 단위·렌더 테스트 | Y | PASS |
| S03 | 공개·본인 미리보기 | 전달된 공개 링크만 사용, 같은 상단 배치 | 렌더 테스트·코드 | Y | PASS |
| S04 | 키보드·모바일·긴 홈페이지 | 이름·새 창 안내·44px, 줄바꿈·overflow 없음 | 렌더 테스트·320px/PC 브라우저 | Y | PASS |
| S05 | 기존 본문 | SNS 중복 제거, 학력·국적·취미 유지 | 렌더 테스트 | Y | PASS |
| S06 | 정리·정적 검증 | 미사용 코드·파일·의존성 없음, lint·build | 독립 평가·명령 | Y | PASS |

저장·공개 동의·권한·API 계약 변경은 N/A. 외부 SNS 로그인·네트워크 접근 검증은 범위 밖이며 링크를 대신 열거나 계정을 연결하지 않는다.

## 평가·검증 결과

- 2026-11-03 독립 평가 1회 완료. 상대 CLI를 사용할 수 없어 같은 종류의 별도 읽기 전용 평가로 대체했다.
- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 0. 검증률 6/6(이 변경의 로컬 검증 범위).
- 신규 확정 발견 0 / 해결 0 / 미해결 0 / P0~P3 각 0 / 오탐 0 / 평가표 미확인 0.
- 발견 경로 PRECHECK·INDEPENDENT_REVIEW·POST_FIX_CHECK·EXTERNAL 각 0. 확정 문제와 상태 사건 이력은 해당 없음.
- `npm test -- --maxWorkers=2 src/components/actor-pages src/features/actor-pages`: 11파일 75항목 PASS. URL 분류·위장 호스트·인증정보·실행 스킴·중복, 공개/미리보기 동일 배치, 빈 영역 생략·본문 유지·접근 가능한 이름 검증.
- 변경 TS/TSX 6개 파일 대상 eslint PASS. `git diff --check` PASS. `npm run build -- --webpack` PASS(컴파일·TypeScript·정적 페이지 56개).
- 브라우저 MSW: `/actors/@actor2` 링크 없음 → SNS 영역 없음. `/actors/@min.zzun_` 기존 인스타그램 링크 → 기본정보 아래·문의 위에 아이콘 1개, 하단 주소 중복 없음.
- 320 CSS px: 문서 scrollWidth 303px, 링크 조작 영역 44×44px(소수점 측정 오차 제외), 키보드 Tab으로 SNS 다음 캐스팅 문의 이동. 일반 사이트는 호스트 이름 렌더 테스트와 max-width/min-width·break-all·flex-wrap 코드로 줄바꿈 확인.
- 스크린샷 `output/actor-social-links-2026-11-03/{desktop,mobile-320}.jpg`는 로컬 산출물로 커밋 제외.
- 독립 평가: 제품 소비자·문서 연결 정상, 옛 ExternalLink 및 중복 렌더 제거, 불필요한 파일·설정·의존성 없음. 기존 react-icons의 브랜드 SVG와 공통 SiteIcon만 사용하며 외부 SDK·계정 조회 없음.
- 실제 기기와 SNS 외부 목적지의 로그인·서비스 응답은 검증 범위 밖이다. 저장·공개 설정·API 계약 변경 없음. GitHub 인증 만료로 이슈/PR은 미생성.
