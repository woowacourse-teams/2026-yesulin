# 많이 본 공고 순위 겹침 수정 운영 선별 릴리스

작업 ID 2026-11-06-main-rank-overlap-release · 프론트 디자인 / release-v1

origin/main에서 `chore/release-rank-overlap-2026-11-06`을 만들고 dev의 #545(c956c1db)만 cherry-pick했다.
커뮤니티(수다방)·의견 보내기·PDF 심사 개편(#533)·DB 마이그레이션은 포함하지 않는다. 운영 개인정보처리방침에 커뮤니티·의견 보내기가
아직 없고, 수다방 공개와 #533 운영 반영은 팀 확인 전이라 의도적으로 뺐다.

| ID | 흐름 | 실패 경계 | 기대 결과 | 확인 방법 | 필수 |
| --- | --- | --- | --- | --- | --- |
| R1 | 범위 | dev 전용 변경 혼입 | #545의 3개 파일만, DB·설정·의존성·커뮤니티·의견 없음 | `git diff origin/main HEAD`, patch-id | 예 |
| R2 | main 호환 | dev 전용 props·API 의존 | main의 홈 줄·PosterImage 계약과 맞음 | 코드 검토 | 예 |
| R3 | 동작 | 순위 유무·이미지 실패 | 순위 카드의 기본 포스터는 단체명 생략, 순위 없는 카드는 유지, byline에 단체명 | 테스트·코드 | 예 |
| R4 | 검증 | main 기준 실행 | 관련 vitest·lint 통과, 빌드는 PR CI | 실행 | 예 |
| R5 | 정리 | 미사용 코드·깨진 링크 | 없음 | 검색 | 예 |

## 검증 근거

- main 기준 브랜치에서 `npm run lint` 통과, `src/components/audition-posts`·`src/components/home` vitest 6개 파일 16개 통과(2026-11-06).
- `npm run build`는 PR CI(`ci.yml`의 Frontend)에서 깨끗한 설치로 확인한다. 로컬 작업 폴더에는 추적하지 않는 실험 화면이 있어 로컬 빌드는 대표성이 없다.
- 화면 동작은 #545 작업에서 1440·375px로 확인했고, 같은 코드가 main에 그대로 들어간다(patch-id 일치).

## 독립 평가 1회

Codex(읽기 전용)가 diff와 평가표로 평가했다. R1·R2·R3·R5 PASS, R4는 평가 환경에서 vitest 임시 파일 생성이 막혀 UNVERIFIED였다.
R4는 구현자가 위 실행 결과로 PASS 판정했다. 신규 확정 문제 0건.

## 판정

필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0. 발견 0 / 해결 0 / 미해결 0. P0 0 / P1 0 / P2 0 / P3 0.
PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0 / 오탐 0.
