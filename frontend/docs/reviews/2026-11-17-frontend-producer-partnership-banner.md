# 홈 공연사 협업 모집 배너

- 작업 ID `2026-11-17-frontend-producer-partnership-banner`
- 평가일 2026-11-17 (+09:00), frontend 평가표 v1
- `fix/home-audition-alert-banner`의 홈 캐러셀에 공연사 협업 모집 배너를 추가한다.
- [홈 구조](../architecture.md), [공개 UI](../design-system.md), [분석 계약](../analytics.md)을 기준으로 검증했다.
- 최초 시안 검증 기록이다. 이후 적용 자산은 [공연 제작팀 배너 시안 개정](2026-11-17-frontend-producer-partnership-revision.md)에 연결했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| P01 | 제안 메시지 | 모집 대상, 협업 내용 또는 CTA가 모호함 | 공연사 모집, 인터뷰를 통한 기능 개발, 오디션 공고 홍보·심사, 카카오톡 문의 순서로 읽힘 | 최종 이미지, 축소본과 대체 문구 비교 | 예 |
| P02 | 반응형과 로고 | 틀린 자산, 로고 변형, 크기 또는 탐색 조작부 겹침 | 현재 워드마크, PC 2160×675, 모바일 1440×1080, 탐색 조작부 여백 | 메타데이터·로고 RGB 비교, 1280·761·390·320px Chromium | 예 |
| P03 | 새 창 이동 | 신청 주소가 다르거나 접근 가능한 이름 없음 | 사용자 제공 오픈채팅을 새 창으로 열고 새 창 안내 표시 | 링크 설정 및 대체 응답을 사용한 브라우저 팝업 검증 | 예 |
| P04 | 탐색과 이벤트 | 순서 변경, 이벤트 실패 시 노출 실패, 키보드 탐색 회귀 | 이벤트 우선, 오디션 다음 협업, 오류 시 두 고정 배너, 자동 전환·움직임 감소 경계 유지 | 서버 렌더링, 단위 테스트와 Chromium 이벤트 테스트 응답 | 예 |
| P05 | 분석·정리 | 공연사 문의를 오디션 클릭으로 집계하거나 미사용 자산·설정 포함 | 기존 오디션 집계 의미 보존, 두 새 자산 모두 홈에서 사용 | 이벤트 발생 위치와 대시보드 확인, Git diff, 독립 평가 | 예 |
| P06 | 운영 환경 | 실기기에서 오픈채팅 앱 진입은 미확인 | 배포 이후 실제 기기에서 확인 | 운영 사이트와 모바일 카카오톡 | 아니오 |

| ID | 결과 | 검증 근거 |
| --- | --- | --- |
| P01 | PASS | ‘예술in과 함께할 공연사를 찾습니다’, ‘인터뷰로 필요한 기능을 만들고’, ‘오디션 공고 홍보와 심사를 함께 진행해요’, ‘카카오톡으로 문의하기’를 PC·모바일에서 읽었다. 대체 문구와 내용이 일치한다. |
| P02 | PASS | WebP가 2160×675와 1440×1080이고 두 로고 영역이 현재 워드마크의 동일 크기 합성 픽셀과 일치했다. Chromium의 1280·390px에서 최적화 이미지를 로드했다. 이벤트 5개와 고정 배너 2개가 있는 761·320px에서는 선택 영역과 CTA 사이 간격이 각각 0.94·7.65 CSS px였다. |
| P03 | PASS | 새 창 안내가 있는 링크의 목적지는 `https://open.kakao.com/o/sKRpDXOi`이며 `target="_blank"`와 `rel="noopener noreferrer"`가 함께 렌더링됐다. PC와 모바일 폭에서 링크를 눌러 같은 주소의 팝업을 확인했다. 카카오톡 응답은 로컬 검증에서 대체했다. |
| P04 | PASS | 이벤트가 비었거나 503이면 오디션 알림과 공연사 협업이 노출됐다. 정상 이벤트로 재조회하면 이벤트 상세가 우선했다. 데스크톱 방향키와 움직임 감소, 모바일 페이지 선택, SSR과 이미지 최적화 테스트가 통과했다. |
| P05 | PASS | 공연사 협업 배너는 기존 오디션 알림 ID와 별개다. 수집 코드에서 `kakao_openchat_click`은 오디션 알림에만 적용된다. 새 WebP 2장의 사용처를 확인했고 린트, 관련 테스트 60개, Webpack 빌드와 `git diff --check`가 통과했다. |
| P06 | UNVERIFIED | Chromium과 로컬 API 대체 응답으로 확인했다. 실제 휴대전화에서의 앱 전환은 확인하지 않았다. |

독립 평가 1회. 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 전체 미확인 1건 (선택 P06). 신규 확정 문제 발견 1 / 해결 1 / 미해결 0. P0 0 · P1 0 · P2 0 · P3 1. PRECHECK 0 · INDEPENDENT_REVIEW 1 · POST_FIX_CHECK 0 · EXTERNAL 0. 오탐 0. 수정 후 관련 테스트 16개를 독립 재실행했다. Claude CLI를 사용할 수 없어 별도 에이전트로 평가했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 및 최초 확정 | 근거 및 조치 | 상태 및 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-frontend-producer-partnership-banner-F01 | P3 / UNUSED / INTRODUCED | INDEPENDENT_REVIEW · 2026-11-17T10:41:32+09:00 | 항상 두 고정 배너를 반환하면서 단일 고정 배너용 화면 분기와 커서 스타일에 도달할 수 없게 됐다. 해당 분기와 스타일을 정리하고 고정 배너 두 개 및 이벤트 포함 상태의 탐색과 링크를 재검증했다. | FIXED · 2026-11-17T10:41:58+09:00 | PENDING |

| 사건 ID | 문제 ID 접미사 | 종류 | 시각 (+09:00) | 근거 / 관련 PR |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-17T10:41:32+09:00 | 두 고정 배너 구성에서 단독 표시 분기가 실행되지 않는 것을 독립 평가로 확인 / PENDING |
| E02 | F01 | FIXED | 2026-11-17T10:41:58+09:00 | 단독 표시 전용 코드·스타일 제거와 관련 테스트 재실행 / PENDING |

## 생성 프롬프트

내장 ImageGen으로 공연 프로그램 책자 삽화를 만들고, 공개 헤더의 워드마크·한글 문구·버튼을 각 비율에 맞춰 합성했다.

```text
Use case: ads-marketing.
Asset type: one supporting cutout illustration for a Korean theatre platform's website banner recruiting performing arts company partners. It sits to the right of Korean typography.
Create a single small three-dimensional theatre program booklet, slightly open, made of softly rounded matte seafoam ceramic. On its facing cover, an elegant shallow relief of a proscenium with two pulled-back stage curtains immediately evokes live theatre. The open booklet and the relief form one clear compact object. Three-quarter view facing the viewer, only a subtle angle, legible silhouette with soft corners and a softly rounded spine. Art-directed soft studio light from upper left; muted mint green, pale jade, and subtle off-white highlights. Restrained and contemporary, with the same gentle satin quality as a modern 3D app icon, no harsh outlines, visually subordinate to navy text and a yellow action in the final banner.
Center the whole booklet in a square transparent canvas with modest clean margins. True alpha with unobstructed edges, no detached shadow floor. One object only. No lettering, no fake text lines, no typography, no logos, no glyphs apart from the sculpted theatre arch, no floating shapes, no stage scene, no people, no skyline, no poster layout.
```
