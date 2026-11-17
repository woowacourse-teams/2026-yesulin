# 홈 공연 제작팀 배너 문구와 디자인 개정

- 작업 ID `2026-11-17-frontend-producer-partnership-revision`
- 평가일 2026-11-17 (+09:00), frontend 평가표 v1
- [최초 협업 모집 시안의 평가](2026-11-17-frontend-producer-partnership-banner.md)에 이어 홈 배너의 문구와 사진을 수정했다. 기존 시안 파일은 원래 작업 공간의 산출물에 보관했다.
- [홈 구조](../architecture.md), [공개 UI 규칙](../design-system.md), [분석 계약](../analytics.md)을 기준으로 검증했다.
- 사진형 시안 검증 기록이다. 이후 적용 자산은 [말풍선 디자인 적용](2026-11-17-frontend-producer-partnership-bubble.md)에 연결했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| V01 | 제목과 협업 내용 | 대상을 좁게 해석하거나 긴 설명으로 제안의 목적이 흐려짐 | 공연 제작팀을 대상으로 제목, 협업 한 줄, CTA 순서 제공 | 문구 글자 수 비교 및 PC·모바일 이미지와 alt 대조 | 예 |
| V02 | 무대 사진과 반응형 | 사진·로고·글자·캐러셀 탐색 조작부가 겹침 | 연한 배경에 무대 사진 하나, 현재 워드마크, 기존 PC·모바일 비율과 요소 여백 | WebP 규격·픽셀, Chromium 1280·761·390·320px | 예 |
| V03 | 홈 링크와 회복 | 카카오톡 링크, 노출 순서, 이벤트 실패 및 재조회 동작 회귀 | 사용자 제공 링크, 이벤트 우선과 두 고정 배너, 키보드 탐색 유지 | SSR, 503 대체 응답과 정상 재조회, 로컬 카카오톡 팝업 | 예 |
| V04 | 파일 정리 | 이전 시안 유실, 중복 배너 파일이나 끊어진 리뷰 문서 링크 | 최초 시안 별도 보관, 제품 자산 두 장, 역사 기록과 새 자산 연결 | Git 상태, 파일 및 참조 검색, 독립 평가 | 예 |
| V05 | 운영 환경 | 실제 기기에서 카카오톡 앱 전환 미확인 | 배포 이후 실기기에서 확인 | 실제 모바일 브라우저와 카카오톡 | 아니오 |

| ID | 결과 | 검증 근거 |
| --- | --- | --- |
| V01 | PASS | ‘함께할 공연 제작팀을 찾습니다’, ‘인터뷰로 기능 개선 · 공고 홍보·심사’, ‘카카오톡 문의’를 확인했다. 로고를 제외한 공백 없는 글자 수는 56자에서 35자로 줄었다. 화면 낭독기의 대체 문구도 새 이미지와 맞췄다. |
| V02 | PASS | 현재 워드마크 원본을 크기만 바꿔 합성한 대조 표본과 두 최종 이미지의 로고 픽셀이 같았다. WebP는 PC 2160×675, 모바일 1440×1080이다. 네 폭에서 글과 사진을 육안으로 확인했다. 이벤트 5개가 있는 761·320px에서 버튼과 캐러셀 선택 영역 사이의 간격은 각각 0.94px, 12.27px였다. |
| V03 | PASS | 1280·390px Chromium에서 새 창 안내가 있는 버튼을 누르면 `https://open.kakao.com/o/sKRpDXOi`로 연결됐다. 카카오톡 응답은 로컬에서 대체했다. 이벤트 빈 상태와 503, 정상 응답으로 재조회, 방향키·움직임 감소와 두 이미지의 응답을 확인했다. 관련 테스트 60개, 린트, Webpack 빌드, `git diff --check`를 통과했다. |
| V04 | PASS | 최초 WebP 두 장을 원래 작업 공간의 `output/imagegen/2026-11-17-producer-partnership-first-draft/`에 보관했다. 홈 설정과 테스트는 새 WebP 두 장을 참조하고, 최초 평가의 파일 링크는 이 문서로 연결했다. 변경은 로컬 작업 트리에 있다. |
| V05 | UNVERIFIED | 실제 휴대전화의 카카오톡 앱 전환과 운영 환경은 실행하지 않았다. |

독립 평가 1회. 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 전체 미확인 1건 (선택 V05). 신규 확정 문제 발견 2 / 해결 2 / 미해결 0. P0 0 · P1 0 · P2 0 · P3 2. PRECHECK 0 · INDEPENDENT_REVIEW 1 · POST_FIX_CHECK 0 · EXTERNAL 1. 오탐 0. 독립 평가에서 두 비율의 로고 픽셀, 링크, 이전 자산 정리와 관련 테스트 16개를 확인했다. 후속 점검에서 최종 대체 문구와 두 이미지의 문구가 일치하고 모바일 설명이 한 줄로 읽히는 것을 확인했다. Claude CLI를 사용할 수 없어 별도 에이전트로 평가했다.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 및 최초 확정 | 근거와 조치 | 상태 및 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-frontend-producer-partnership-revision-F01 | P3 / FLOW / INTRODUCED | EXTERNAL · 2026-11-17T10:46:30+09:00 | 사용자가 긴 설명과 기존 디자인에 수정을 요청했다. 설명 두 줄을 한 줄로 줄이고 공연 제작팀을 제목에 적었다. 책자 삽화를 무대 사진으로 바꿨다. | FIXED · 2026-11-17T10:49:06+09:00 | PENDING |
| 2026-11-17-frontend-producer-partnership-revision-F02 | P3 / FLOW / INTRODUCED | INDEPENDENT_REVIEW · 2026-11-17T10:51:55+09:00 | 줄인 문구에서 인터뷰의 목적이 빠져 오디션 심사 과정의 인터뷰로 읽힐 수 있었다. ‘인터뷰로 기능 개선 · 공고 홍보·심사’로 구체화하고 두 자산과 대체 문구를 맞췄다. | FIXED · 2026-11-17T10:52:48+09:00 | PENDING |

| 사건 ID | 문제 ID 접미사 | 종류 | 시각 (+09:00) | 근거 / 관련 PR |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-17T10:46:30+09:00 | 사용자의 문구 길이와 시각 디자인 피드백 확인 / PENDING |
| E02 | F01 | FIXED | 2026-11-17T10:49:06+09:00 | 짧은 제목과 한 줄 설명, 새 무대 사진의 PC·모바일 시안 확인 / PENDING |
| E03 | F02 | CONFIRMED | 2026-11-17T10:51:55+09:00 | 독립 평가에서 인터뷰 목적 누락을 확인 / PENDING |
| E04 | F02 | FIXED | 2026-11-17T10:52:48+09:00 | 두 비율의 한 줄 설명과 대체 문구 수정 후 테스트를 재실행 / PENDING |

## 생성 프롬프트

내장 ImageGen으로 커튼과 조명이 있는 무대 사진을 생성했다. 기존 워드마크와 확정 문구를 PC·모바일 배너에 합성했다.

```text
Use case: ads-marketing.
Asset type: edge-to-edge photographic accent for the right-hand side of a minimal, editorial website banner recruiting Korean live-theatre production teams.
Create a realistic, cinematic photograph from the wings of an intimate black-box theatre. A rich oxblood velvet stage curtain dominates the right half of the frame, with subtle deep vertical folds and a clean silhouette. In the opening just left of it, one warm amber stage light spills across a small wedge of dark timber stage. Keep the stage empty and surrounding space deep aubergine-black. Understated, attractive film-still color grading and fine, subtle film grain; natural velvet and wood texture. Directional lighting with a warm narrow falloff, a single clear subject, significant shadow. Make this believable as a real theatre photograph, intimate and refined.
Composition: vertically oriented, crop-safe, curtain and light visible in a tall crop from the center, pictured straight enough to read at a small size. The more important silhouettes should be on the right and near the center. Photo only, edge to edge, no type or lettering, no logos, no people, no extra props, no empty audience seats, no 3D-render aesthetic, no background removal.
```
