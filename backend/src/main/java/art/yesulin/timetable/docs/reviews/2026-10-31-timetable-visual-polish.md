# 일정 화면 시각 정리

작업ID 2026-10-31-timetable-visual-polish, Audit/Timetable v1. 사용자 요청: 디자인만 수정, 기능 유지.
기존 feat/audition-management에서 진행. API·저장·검증·판정·라우팅 변경 없음. 상단 심사/일정 이동 분리는 이번 범위 밖.

| ID | 기대결과 / 실패경계 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| V1 | 헤더 반복 축약·정렬·입력크기 유지·모바일 가로넘침 없음 | 데스크톱/모바일 UI | Y | PASS |
| V2 | 선택형 일괄도구 노출이 초안·기존 저장 동작 보존 | 기존 UI 테스트/브라우저 | Y | PASS |
| V3 | 처리알림 펼침/닫기/재시도 유지, 저장버튼 가림 없음 | UI/표적 테스트 | Y | PASS |
| V4 | 연락처 보기에서 배정초안/피드백 유실 없음 | 기존 UI 테스트 | Y | PASS |
| V5 | lint/build 및 독립 평가1회·미사용 검토 | 자동 검사/별도 검토 | Y | PASS |

기존 문제 근거는 audition-regression 보고서와 그 문서가 인용한 19:14 UX 재점검. 과거 UX ID 충돌은 해결했다고 주장하지 않음. H2 migration/기록 복원/검색필터/상단 영역 분리/대량 성능/운영 배포는 제외.

## 구현·실행 근거

- 표시 계층만 수정: 일정 헤더/현황, 열 정렬, 컨테이너 폭에 따른 모바일 날짜·시간 2열, 상태 배지, 보조 버튼 톤, 상세 도움말. 등록/배정/검증/소유권/API/메시지/라우팅 핸들러는 그대로 유지.
- 일괄 도구는 선택/입력이 없으면 접히지만 DOM과 상위 초안은 유지. 선택 해제 후 입력이 있으면 계속 표시. 배정 초안 없는 연락처 보기는 불필요한 비활성 배정 도구만 숨기며 피드백은 유지. 배정 초안이 있으면 맥락을 표시해 기존 저장·취소를 유지.
- 처리 알림은 심사 화면에서는 기존 fixed, 연락처·일정 화면에서는 본문 inline. 같은 컴포넌트를 유지하여 펼침·닫기 상태와 오류·재시도 동작 보존. frontend/docs/design-system.md에 배치 기준만 반영.
- 기존 테스트127 + 표적 회귀2 = 15파일129테스트 PASS. `/private/tmp/yesulin-polish-final-tests.log`. 새로운 테스트는 일괄 입력 보존/연락처 보기 배정초안 경계, 알림 같은 instance·확장·닫기 상태 이동 보존을 검증.
- lint PASS `/private/tmp/yesulin-polish-final-lint.log`. 1차 build PASS `/private/tmp/yesulin-polish-build.log`; 최종 결과 아래 추가.
- 실제 localhost3000, 합성 일정. 데스크톱1707×960 / 모바일 실제CSS391×844(브라우저 배율로 viewport 도구 입력값과 다름). 양쪽 document.scrollWidth=innerWidth, 가로 overflow0. 모바일 날짜/시간 입력 높이45.33px, 너비161.33px. 알림 내역 확장 상태와 저장 도구의 교차 면적 양쪽0.
- 실제 선택→일괄 날짜 입력→선택 해제 후 날짜 보존, 두 명 일괄 적용→연락처 보기→배정 복귀 후10:20 초안 보존→전체 취소로 원상 복구. 서버 저장을 실행하지 않았으며 기존 일정 내용 변경 없음. 연락처 편집 초점 edit-name, 취소/뷰 복귀 확인.
- 결과 화면 `/private/tmp/yesulin-polish-desktop.png`, `/private/tmp/yesulin-polish-mobile.png`. 모바일 viewport 원상복구. 새 시각 CSS는 해당 명단 컴포넌트만 소비하고 다른 심사 판정 화면에는 적용하지 않음.
- 이전 H2 migration 회귀 실패/과거 평가 ID충돌은 이번 범위 밖으로 그대로 미해결. 이전 UX 알림 겹침/맥락 없는 비활성 저장 도구는 위 실측으로 수정 확인하되, 충돌한 과거 ID에 임의의 해결 사건을 덮어쓰지 않는다. 기존 기록은 19:14 재점검 증상의 증거로만 참조.

## 최종 검증·독립 평가

최종 build 종료0(컴파일·TypeScript·정적 생성 완료), `/private/tmp/yesulin-polish-final-build.log`. 최종 tests/lint도 종료0, git diff --check PASS. 기존 복수 lockfile workspace 경고 유지.
독립 읽기전용 평가1회: 상대 도구 미제공으로 별도 동종 평가자 사용. `/private/tmp/yesulin-design-before/` 6개 원본과 현재 diff, 새 CSS, 디자인 문서, 최종 로그 및 데스크톱/모바일 화면 대조. 신규 확정 결함 없음. 기존 API/상태 갱신·저장·검증 유지 및 신규 CSS 사용처 확인. 추가 의존성/설정 없음. 이번 작업에 새로 남은 미사용 제품 파일 없음.
필수 PASS5/FAIL0/UNVERIFIED0/N/A0, 검증률5/5. 신규 발견0/해결0/미해결0/P0=0/P1=0/P2=0/P3=0. PRECHECK0/INDEPENDENT_REVIEW0/POST_FIX_CHECK0/오탐0. 신규 문제 사건 없음. PR 생성/게시 없음.
이는 시각 변경과 관련 회귀 검증 범위의 판정이며 기존 backend 실패·운영 배포·실물 모바일 키보드·보조기기·300명 부하의 통과를 의미하지 않는다.

## 최초 PR 연결

최초 게시 PR: [#479](https://github.com/woowacourse-teams/2026-yesulin/pull/479), 대상 dev, 관련 이슈 #478.
위 PENDING/PR 미생성 표기는 당시 작업 이력이며 이 절로 최초 게시 번호를 연결한다. 기존 문제 ID·확정/해결 시각은 변경하지 않는다.
