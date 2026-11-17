# 홈 오디션 오픈채팅 배너 이미지

- 작업 ID `2026-11-17-frontend-audition-openchat-banner`
- 평가일 2026-11-17 (+09:00), frontend 평가표 v1
- 이미지 검토 당시 PNG는 원래 작업 공간의 `output/imagegen/2026-11-17-audition-openchat/`에 보관한다. 실제 사용 자산은 [홈 배너 이미지 교체 기록](2026-11-17-frontend-audition-openchat-apply.md)에 연결했다.
- [디자인 시스템](../design-system.md)의 공개 헤더 워드마크와 [홈 구조](../architecture.md)의 배너 규격과 조작부를 기준으로 평가했다.

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| C01 | 로고 | 구형 로고나 재현 로고 사용, 원본 비율 왜곡 | 공개 헤더의 공식 워드마크를 원래 비율로 표시 | 현재 워드마크에서 만든 대조 영역과 픽셀 비교 | 예 |
| C02 | 안내 | 새 오디션 소식, 수신 채널, 참여 행동이 모호하거나 장식과 섞여 읽기 어려움 | 제목, 카카오톡 오픈채팅 안내, 참여 버튼 순서로 읽힘 | 원본과 표시 폭 축소본의 문구와 대비를 확인 | 예 |
| C03 | 이미지 규격 | 시안 비율 불일치 또는 캐러셀 조작부와 내용 겹침 | PC 3.2:1, 모바일 4:3, 캐러셀 조작부 여백 확보 | PNG 메타데이터와 2개 및 7개 선택 표시 배치 검산 | 예 |
| C04 | 범위 및 정리 | 미사용 중간물이나 무관한 코드, 설정, 의존성이 포함됨 | 최종 이미지 2장과 평가 기록 | 생성 경로의 파일 목록과 운영 배너 경로의 Git 상태 확인 | 예 |
| C05 | 운영 동작 | 링크 및 분석, 실패·재시도·중복, 키보드·움직임 감소, 권한 | 이미지 검토 단계의 실행 대상 없음 | 시안은 홈 런타임에 연결하지 않음 | 아니오 |

| ID | 결과 | 근거 |
| --- | --- | --- |
| C01 | PASS | 두 최종 PNG의 로고 영역을 `frontend/public/images/yesulin-wordmark.png`를 원본 비율로 축소해 합성한 RGB 픽셀과 비교해 일치를 확인했다. 독립 평가에서도 별도로 재현했다. |
| C02 | PASS | ‘새 오디션 소식’, ‘카카오톡 오픈채팅으로 받으세요’, ‘오픈채팅방 참여하기’를 육안으로 확인했다. 1080·633·601·350·280px로 줄여 제목과 안내, 행동이 순서대로 읽히는지 확인했다. |
| C03 | PASS | `sips`로 2160×675 및 1440×1080 PNG를 확인했다. `notebook.css`의 조작부 위치를 축소본에 재현했다. 선택 버튼 7개일 때 PC 배너 폭 633px에서 CTA 하단 y≈148.87은 선택 영역 시작 y≈149.81보다 위다. 폭 601px에서도 1px 경계를 반영해 비겹침을 확인했다. |
| C04 | PASS | 시안 저장 경로에 최종 PNG 2장만 있다. 운영 배너 자산, 렌더러, 등록 정보와 링크는 이번 변경에 포함되지 않았다. 미사용 파일·코드·설정·의존성·옛 문서 및 깨진 링크 없음. |
| C05 | N/A | 운영 연결을 요청하지 않은 이미지 시안 단계여서 서비스 탐색과 실기기 실행 검증은 적용하지 않았다. |

독립 평가 1회. 필수 PASS 4 / FAIL 0 / UNVERIFIED 0, N/A 1. 신규 확정 문제 발견 1 / 해결 1 / 미해결 0. P0 0 · P1 0 · P2 0 · P3 1. PRECHECK 1 · INDEPENDENT_REVIEW 0 · POST_FIX_CHECK 0 · EXTERNAL 0. 오탐 0. 독립 평가는 로고 픽셀, 633px·280px 축소본, 최대 7개 선택 표시와 변경 범위를 확인했다. Claude CLI를 사용할 수 없어 별도 에이전트로 평가했다. 최초 기록 PR은 PENDING.

| 문제 ID | 심각도 / 유형 / 유입 | 발견 경로 및 최초 확정 | 근거 및 조치 | 상태 및 해결 시각 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| 2026-11-17-frontend-audition-openchat-banner-F01 | P3 / FLOW / INTRODUCED | PRECHECK · 2026-11-17T09:57:59+09:00 | PC 초안의 CTA 하단은 폭 633px에서 y≈162.36이었다. 선택 표시가 7개일 때 표시 배경 시작 y≈156.81과 겹쳤다. 문구와 CTA를 위로 옮기고, 최종 CTA의 하단 y≈148.87이 전체 선택 영역 시작 y≈149.81보다 위인 것을 확인했다. | FIXED · 2026-11-17T09:58:37+09:00 | PENDING |

| 사건 ID | 문제 ID 접미사 | 종류 | 시각 (+09:00) | 근거 / 관련 PR |
| --- | --- | --- | --- | --- |
| E01 | F01 | CONFIRMED | 2026-11-17T09:57:59+09:00 | 최대 7개 선택 표시 조건에서 초안 좌표 검산 / PENDING |
| E02 | F01 | FIXED | 2026-11-17T09:58:37+09:00 | 최종 PNG 축소본과 조작부 합성 및 좌표 검산 / PENDING |

## 생성 프롬프트

내장 ImageGen으로 투명 배경의 알림 삽화를 만들었다. 현재 워드마크 원본과 확정 한글 문구를 최종 배너에 합성했다.

```text
Use case: ads-marketing.
Asset type: small supporting illustration for a Korean arts service's home-page audition-alert banner. This is only the transparent cutout illustration, not the banner layout itself.
Primary request: Make one immediately recognizable chat notification symbol, a single rounded speech bubble with a short soft lower-left tail and one clearly defined bell embossed into its front. A very clean high-end 3D icon like slightly translucent satin-matte ceramic, front-facing with only a subtle perspective angle so the bell silhouette is readable. A generously proportioned rounded horizontal bubble, a softly rounded bell with body and one small clapper, all one unified composition.
Color palette: cool baby blue with a very subtle lilac lower-right tonal shift, raised bell in a lighter cool off-white. Tone-on-tone, restrained color, soft studio light top left. Confident simple silhouette; keep the piece quiet and visually subordinate to black text and a yellow action in the eventual banner. The cutout will sit on a #EDF6FF pale blue background. Use just enough color depth to read against that pale surface.
Composition: centered and fully contained, square artwork, modest clean margin all around, the bubble fills about 78% of frame. Clean edges on genuine transparent alpha with no detached shadow floor and no backdrop.
No text or letters, no platform logo, no digits, no red badge, no sparkles, no floating pieces, no scene, no mascots, no smartphone, no other elements.
```
