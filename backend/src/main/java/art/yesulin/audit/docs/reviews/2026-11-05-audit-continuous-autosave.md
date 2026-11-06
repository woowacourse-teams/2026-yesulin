# 연속 PDF·제목/메모 자동 저장

작업 ID `2026-11-05-audit-continuous-autosave`, Audit v1. 로컬만 반영하며 PR/배포 보류.

| ID | 흐름·실패 조건·기대 결과 | 검증 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| S01 | 전체 PDF 연속 스크롤, 페이지·부가 도구 제거, 근처만 렌더/먼 페이지 bitmap 해제 | 지연렌더 테스트·브라우저 | Y | PASS |
| S02 | 일반 휠 스크롤/수정키 휠·트랙패드 핀치 이벤트 확대, 소스 전환 취소·원본 실패 안내 | 테스트·브라우저 | Y | PASS |
| S03 | 제목·메모 입력 멈춤/blur 자동저장, IME·요청 중 새 입력·직렬화·실패 보존 | 상태기계·UI 테스트 | Y | PASS |
| S04 | 이동/필터/배역/판정 전에 저장 완료, 실패는 이동 중단, 탭 이탈 보호 | UI 테스트·브라우저 | Y | PASS |
| S05 | 메모 전용 API는 판정·배역·제목 변경 안 함, 소유권·길이 검증 | 서비스·실제 API | Y | PASS |
| S06 | 늦은 제목/메모 응답이 다른 필드/새 입력/다른 지원서를 덮지 않음 | 지연응답 테스트 | Y | PASS |
| S07 | 저장 지표를 성공 응답에 유지, 자동저장 메모 구분/개인정보 미전송 | 분석 회귀 | Y | PASS |
| S08 | PC/모바일·lint/build·문서·미사용 정리·독립 평가1회 | 실행·평가 | Y | PASS |

## 검증 근거 (2026-11-05)

- 프론트 관련31파일·219테스트 PASS. autosave9, 연속 canvas6, 원본 심사7의 지연 응답/실패/취소/필드 병합과 기존 API/분석/권한 회귀를 포함한다. lint·프로덕션 build PASS.
- 백엔드 전체 build PASS, Checkstyle PASS. 246 suite·1476 test, 실패/오류/skip0. 메모 전용 저장은 최신 판정·제목을 유지하며 잘못된 소유자/심사/길이를 거부한다.
- 실제 HTTP: 별도 로컬 H2와 LocalStack에서 PDF2건 업로드·원본 조회, memo PATCH 저장/재조회, 제목/배역/판정 보존, 빈 메모 허용, null/누락/2001자400, 타 심사 항목404 확인. 운영 MySQL·AWS 인프라는 변경하지 않았다. AI·문자·메일·Slack 호출을 끈 로컬 검증이다.
- 실제 IAB 브라우저: 888px PC·390×844 모바일에서 PDF2/3페이지 연속 렌더, 스크롤 위치 증가, 도구/원본명/PDF 배지/수동 메모 저장/대기 복원 제거 확인. 제목 blur 및 메모 입력 후 다음/이전 지원서 이동에서도 저장값 유지, Ctrl+플러스(zoom1.2)/0 확인. 모바일 문서너비390px, 가로 overflow0, 심사 입력/판정이 원본 아래로 배치됨을 확인했다.
- 수정키 wheel 취소/일반 wheel 통과·빠른 가시영역 복귀·원본 URL 전환 취소는 단위 테스트로 확인했다. 실제 트랙패드 핀치와 터치스크린·Safari는 실행하지 않았다. 터치스크린 자체 pinch는 이번 구현 범위가 아니다.
- 독립 평가1회: 대체 독립 에이전트의 읽기 전용 검토 및3파일·21테스트 표적 실행 PASS. 상대 도구를 연결할 수 없어 같은 종류의 별도 평가자로 대체했다. F01/F02 수정 후 확인 완료. 추가 전체 평가는 하지 않았다.
- 분석은 요청 성공 후 `save_kind=memo`, operation_id당 시도/결과를 유지한다. 제목·원본명·메모·URL 미전송. 자동 메모 요청은 기본 판정 조작으로 세지 않는다. 대시보드 설명에 시행일과 요청수/클릭수 차이를 명시했다.

## 미사용·호환 정리

일반 PDF 도구 모음·다운로드 Blob 코드와 patchReview context를 제거했다. 기존에 라우트/import 소비자가 없던 ReviewEntryDetail과 그것만 사용하던 PdfCareerList를 제거했다(아래 F03). 이전 브라우저 보기/앱 전환·수동 저장 안내도 현재 문서로 교체했다. 새 page/queue/store/hook/DTO/CSS는 실제 호출 경로가 있으며 의존성을 추가하지 않았다.

공용 PDF 뷰어는 배우 프로필 가져오기·독립 추출 확인 화면·연락처 원본 모달이 소비한다. 이 소비자는 타입·빌드·공용 컴포넌트 렌더 테스트로 확인했고 해당 업무 전체를 브라우저에서 반복하지 않았다. 기존 `onRefresh` prop은 API 소비자가 갱신한 서명 주소로 실패를 재시도하는 계약이라 유지한다. 기존 메모+판정 PATCH와 PENDING enum은 카드/표 및 기존 API 호환을 위해 유지한다. 새 메모 PATCH는 자동 저장 시 판정 재전송을 제거한다.

## 평가 결과

필수 PASS8 / FAIL0 / UNVERIFIED0 / N/A0 (로컬 작업의 정의된 범위). 실제300건 자원 측정·모델 정확도·외부 서비스 배포·실기기 터치·Safari는 이 평가 범위 밖이며 성능 수치나 완료로 주장하지 않는다. 미저장 탭 종료는 브라우저 경고만 제공하며 강제 종료까지 저장을 보장하지 않는다.

발견3 = 해결3 + 미해결0. P0 0 / P1 1 / P2 1 / P3 1.
PRECHECK1 / INDEPENDENT_REVIEW2 / POST_FIX_CHECK0 / EXTERNAL0 / REJECTED0. 최초 PR은 모두 PENDING(외부 등록 보류).

| 문제 ID | 심각도/유형/유입/경로 | 근거·조치·검증 | 상태 |
| --- | --- | --- | --- |
| 2026-11-05-audit-continuous-autosave-F01 | P1/FLOW/INTRODUCED/INDEPENDENT_REVIEW | 진행 중 요청을 원래 값으로 복원하면 dirty가 일찍 해제됨. inFlight/uncertain 추적으로 마지막 값 확정 전 보호 유지. 지연 성공/실패 재전송2테스트 PASS | FIXED |
| 2026-11-05-audit-continuous-autosave-F02 | P2/CODE/INTRODUCED/INDEPENDENT_REVIEW | 후반 페이지 metadata 실패가 전체 원본 표시 차단. fallback 크기로 해당 페이지만 격리. 앞페이지 정상·뒤페이지 오류 회귀 PASS | FIXED |
| 2026-11-05-audit-continuous-autosave-F03 | P3/UNUSED/EXISTING/PRECHECK | 기존 ReviewEntryDetail/그 전용 PdfCareerList가 소비자 없이 옛 수동 저장 UI를 보유. 참조 검색 후2파일 삭제, 이전 안내 문서 갱신. 타입/build PASS | FIXED |

## 추가 전용 상태 이력

확인 시각은 추정하지 않고 아래 기록에서 최초 확정·수정 검증을 정리한 시각을 사용한다. PR PENDING.

| 사건 | 문제 ID | 종류 | 시각(+09:00) | 근거 / 최초 PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-05-audit-continuous-autosave-F01 | CONFIRMED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |
| E02 | 2026-11-05-audit-continuous-autosave-F01 | FIXED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |
| E03 | 2026-11-05-audit-continuous-autosave-F02 | CONFIRMED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |
| E04 | 2026-11-05-audit-continuous-autosave-F02 | FIXED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |
| E05 | 2026-11-05-audit-continuous-autosave-F03 | CONFIRMED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |
| E06 | 2026-11-05-audit-continuous-autosave-F03 | FIXED | 2026-11-05T13:39:02+09:00 | 위 수정·표적 검증 / PENDING |

## 최초 PR 연결 (2026-11-05T18:00:02+09:00)

이 작업의 모든 문제 ID와 위 추가 전용 상태 이력은 [PR #533](https://github.com/woowacourse-teams/2026-yesulin/pull/533)에 최초 게시했다. 이전 PENDING 기록은 당시 이력을 보존하며 최초 기록 PR을 #533으로 연결한다. 발견·해결 시각은 위 사건 시각을 유지한다.
