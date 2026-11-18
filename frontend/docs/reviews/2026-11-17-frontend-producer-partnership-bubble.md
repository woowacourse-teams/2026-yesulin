# 공연 제작팀 모집 배너 말풍선 디자인과 문구

- 작업 ID `2026-11-17-frontend-producer-partnership-bubble`
- 평가일 2026-11-17 (+09:00), frontend 평가표 v1
- [사진형 시안](2026-11-17-frontend-producer-partnership-revision.md) 다음 단계다. [오디션 알림 이미지](2026-11-17-frontend-audition-openchat-apply.md)의 말풍선 형태를 참고했고, 사용자가 제안한 성장 문구를 한 문장으로 정리했다.
- [홈 구조](../architecture.md), [공개 UI 규칙](../design-system.md), [분석 계약](../analytics.md)을 기준으로 검증했다.
- [PC WebP](../../public/images/banners/producer-partnership-bubble-desktop.webp), [모바일 WebP](../../public/images/banners/producer-partnership-bubble-mobile.webp)

| ID | 흐름 | 실패 조건 | 기대 결과 | 검증 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| M01 | 삽화 | 알림 배너와 조형이 다르거나 협업 배너의 상징이 모호함 | 같은 계열의 둥근 3D 말풍선에 연보라색과 무대 커튼으로 구분 | 오디션 원본과 두 비율의 협업 시안 비교 | 예 |
| M02 | 문구와 배치 | 추가 설명이 남거나 로고·글자·탐색 조작부가 겹침 | 성장 제안 한 문장과 문의 버튼, 현 워드마크, 규격 및 여백 | 이미지·alt·픽셀, 1280·761·390·320px Chromium | 예 |
| M03 | 홈 링크와 탐색 | 잘못된 이미지 또는 문의 링크, 캐러셀 순서와 회복 회귀 | 화면 폭별 새 WebP, 기존 문의 새 창과 정상·빈 상태·503 회복 | 최적화 이미지 요청, 테스트 팝업, SSR, 로컬 브라우저 | 예 |
| M04 | 범위와 정리 | 사진형 초안 유실, 죽은 자산·설정·문서 참조 | 이전 시안 보관, 두 WebP 적용, 로컬 작업 유지 | Git 상태, 참조 확인, 독립 평가 | 예 |
| M05 | 운영 환경 | 실제 휴대전화에서 카카오톡 앱 전환 미확인 | 배포 이후 실기기에서 확인 | 모바일 기기와 실서비스 | 아니오 |

| ID | 결과 | 검증 근거 |
| --- | --- | --- |
| M01 | PASS | 기존 파란 말풍선과 새 연보라색 말풍선의 정면 형태, 왼쪽 아래 꼬리, 부드러운 입체감을 비교했다. 새 말풍선의 중앙에 흰 무대 커튼이 보인다. |
| M02 | PASS | ‘예술in과 함께 성장할 공연 제작팀을 찾습니다’와 ‘카카오톡 문의’를 두 이미지에서 확인하고 대체 문구를 맞췄다. 현 워드마크의 로고 영역 RGB가 원본 합성과 일치한다. 2160×675와 1440×1080 WebP를 확인했다. 네 화면 폭에서 왼쪽 문구와 말풍선이 조작부에 가려지지 않았다. 이벤트 5개와 고정 배너 2개가 있을 때 761·320px의 CTA와 선택 영역 사이 간격은 각각 0.94·22.87 CSS px였다. |
| M03 | PASS | PC·모바일에서 올바른 최적화 파일과 새 창 대상 `https://open.kakao.com/o/sKRpDXOi`를 확인했다. 카카오톡 응답은 로컬에서 대체했다. 이벤트 빈 상태·503·정상 재조회, 방향키 및 움직임 감소, 배너 7개 상태를 Chromium으로 확인했다. 관련 테스트 60개, 린트, Webpack 빌드와 `git diff --check`를 통과했다. |
| M04 | PASS | 사진형 WebP 두 장은 원래 작업 공간 `output/imagegen/2026-11-17-producer-partnership-stage-draft/`에 보관했다. 제품은 말풍선 WebP 두 장을 사용한다. 사진형 평가 기록에서 이 문서를 참조한다. 변경은 로컬 작업 트리에 있다. |
| M05 | UNVERIFIED | 실제 휴대전화의 카카오톡 앱 전환과 운영 환경은 실행하지 않았다. |

독립 평가 1회. 필수 PASS 4 / FAIL 0 / UNVERIFIED 0 / N/A 0. 전체 미확인 1건 (선택 M05). 신규 확정 문제 발견 0 / 해결 0 / 미해결 0. P0 0 · P1 0 · P2 0 · P3 0. PRECHECK 0 · INDEPENDENT_REVIEW 0 · POST_FIX_CHECK 0 · EXTERNAL 0. 오탐 0. 추가 전용 상태 이력 없음.

독립 평가에서 두 WebP의 크기와 로고 픽셀, 네 폭의 실제 캡처, 새 창 이름과 주소, 이전 이미지 파일 정리를 확인했다. 관련 테스트 16개를 별도로 실행했다. Claude CLI를 사용할 수 없어 별도 에이전트로 평가했다.

## 생성 프롬프트

내장 ImageGen에 오디션 알림 배너의 말풍선 삽화를 참고 이미지로 제공했다. 생성한 새 말풍선을 현재 워드마크와 확정한 한글 문구에 합성했다.

```text
Use case: ads-marketing.
Asset type: a new single supporting 3D symbol for a Korean theatre-production collaboration banner, in a coordinated set with the attached audition-alert brand artwork.
Input image 1: STYLE AND SILHOUETTE REFERENCE. Make a sibling object, matching its front-facing geometry, gently inflated rounded horizontal chat bubble, short bottom-left tail, satin-matte finish, subtle depth and upper-left lighting. Generate a new artwork.
The new bubble is a distinct soft mauve lavender with a warm pale rose tint in the lower-left light, restrained gentle gradient and enough contrast against a cream paper background (#F8F2EB). Its single centered raised icon is an ivory theatrical proscenium with two simple pulled-back curtained shapes. Readable as a theatre stage at thumbnail size, using large simple solid shapes like the reference bell, with shallow relief, rounded edges and restrained shading. Think of one uncomplicated stage pictogram, with a smooth top arch and two broad pulled-back curtain forms, no intricate folds, ropes, pillars or tiny detail. Integrate it onto the front face with softly cast occlusion, about 45% of bubble width.
Square canvas with genuine transparent alpha and clean margins. One speech bubble, one icon, no bell, no book, no floating shapes, no shadow floor, no words, letters or logos, no image frame or stage photograph. Keep it clean and understated, with the same family resemblance as the attached art.
```
