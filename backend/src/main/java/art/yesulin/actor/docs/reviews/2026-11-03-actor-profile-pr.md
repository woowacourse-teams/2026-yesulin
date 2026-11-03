# 배우 프로필 개선 PR 통합 점검

- 작업 ID `2026-11-03-actor-profile-pr` / 평가표 v1 / PR PENDING
- 범위: 현재 대화에서 진행한 프로필 입력·공개, 배우 상세·SNS·경력 연월, 모바일·포커스 변경과 작업별 평가 기록을 dev 대상 PR로 묶는다.

| ID | 실패 조건 | 기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- | --- |
| G01 | 이전 인증 메일 변경·별도 산출물 혼입 | 현재 작업만 포함, evidence.md 및 다른 작업 보존 | diff·staging·커밋 범위 | Y | UNVERIFIED |
| G02 | 최신 통합 브랜치와 충돌·이전 API 계약 불일치 | 최신 dev 위로 rebase, month nullable 호환·신규 검증·마이그레이션 유지 | rebase·관련 테스트·계약 읽기 | Y | UNVERIFIED |
| G03 | 최종 조합 검증 누락 | hook·lint·테스트·build 결과를 실제 실행 범위로 기록 | 명령 결과 | Y | UNVERIFIED |
| G04 | 평가와 미확인 범위 과장·문제 집계 중복 | 작업별 평가·이력 링크와 iPhone 잔여 항목 명시 | 독립 읽기 전용 평가 | Y | UNVERIFIED |
| G05 | PR·이슈·평가 기록 연결 누락 | 이슈·PR·작업별 기록 연결 및 task 첨부 | GitHub 조회 | Y | UNVERIFIED |

실제 서비스 배포·운영 마이그레이션·배우 페이지 공개·지원서 제출은 N/A. 기존 코드 작업의 독립 평가를 새 통합 평가로 대체하지 않는다.

## 독립 통합 평가 1회와 수정 후 검증

- 상대 평가 도구가 설치되어 있지 않아 같은 종류의 별도 읽기 전용 평가자를 사용했다. origin/dev 대비 148파일의 범위, 계약·마이그레이션·legacy 보존, 새 코드 참조·의존성·Markdown 상대 링크를 확인했다. 인증 메일·output/tmp/evidence.md 혼입 없음. 미사용 제품 코드·파일·설정·의존성·옛 문서 추가 발견 없음.
- 확정 문제 F01(P3 CODE INTRODUCED / INDEPENDENT_REVIEW): diff check가 세 파일 EOF 빈 줄로 실패. actor-social-links.md, career-month-mobile.md, actor-page-settings.test.tsx의 끝 빈 줄만 제거했다. `git diff --check origin/dev` PASS로 표적 확인. 신규 기능 결함으로 확대하지 않는다.
- 최종 dev 통합 검증: frontend 전체 eslint PASS, Vitest158파일889테스트 PASS. backend actor 및 관련 submission 테스트200개 PASS(실패0·skip0), checkstyleMain/checkstyleTest PASS. pre-commit config pin 및 backend Checkstyle PASS.
- rebase 후 기존 frontend .next/dev와 이전 .next/types 라우트 캐시가 community 경로에서 충돌해 첫 tsc TS2344 실패. 제품 소스를 분리 복사하여 `.next`가 없는 `/private/tmp/yesulin-actor-pr-build`에서 `npm run build -- --webpack` 및 `npx tsc --noEmit` 모두 종료0. 원래 서버의 캐시를 삭제하지 않았다. 실행 로그 `/private/tmp/actor-pr-{lint,test,backend,build,clean-tsc}.log`.
- iOS 임시 LAN 서버·소스 복사본·proxy helper 종료/삭제. iOS I05 PASS로 후속 기록했고 I03(키보드 중 스크롤/저장), I04(사진 업로드 완료)는 UNVERIFIED 유지. 원래 감사의 역사적 FAIL·미확인과 composer 비필수 C11을 PR에서 구분한다.

| 문제 ID | 심각도·유형·유입 | 발견 경로 | 최초 확정 / 최초 PR | 해결 / 상태 | 검증 |
| --- | --- | --- | --- | --- | --- |
| 2026-11-03-actor-profile-pr-F01 | P3 / CODE / INTRODUCED | INDEPENDENT_REVIEW | 2026-11-03T18:27:33+09:00 / PENDING | 2026-11-03T18:29:31+09:00 / FIXED | EOF3곳 정리 후 git diff --check origin/dev PASS |

| 사건 ID | 문제 ID | 사건 | 발생 시각 | 근거·관련 PR |
| --- | --- | --- | --- | --- |
| G-E01 | 2026-11-03-actor-profile-pr-F01 | CONFIRMED | 2026-11-03T18:27:33+09:00 | 독립 평가 diff check 실패, PENDING |
| G-E02 | 2026-11-03-actor-profile-pr-F01 | FIXED | 2026-11-03T18:29:31+09:00 | 끝 빈 줄 정리·diff check PASS, PENDING |

현재 G01/G02/G03/G04 PASS, G05 게시 연결 대기 UNVERIFIED. 필수 PASS4 / FAIL0 / UNVERIFIED1, 독립 평가1회. 신규 발견1 / 해결1 / 미해결0 / P0=0·P1=0·P2=0·P3=1 / PRECHECK0·INDEPENDENT_REVIEW1·POST_FIX_CHECK0·EXTERNAL0 / 오탐0. 실제 PR 연결 후 별도 게시 결과를 추가한다.
