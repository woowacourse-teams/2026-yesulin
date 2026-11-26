# 전시회 시연 초기화 기능 제거

- 작업 ID `2026-11-23-audit-remove-demo-reset`
- 범위는 2026-11-20 우형 전시회용으로 추가했던 dev·local 전용 `DELETE /api/v1/pdf-reviews`와 허용 회원 목록을 지우는 일이다.
  추가 내역은 PR #592(`e341e2ef`)이고 평가 기록은 [2026-11-16-audit-demo-reset](2026-11-16-audit-demo-reset.md)이다.
- 그 기록은 과거 이력이라 지우지 않는다. dev의 AI 정리 끄기 설정은 별도 작업이라 이번 범위에 넣지 않는다.
- Audit 평가표 v1. 2026-11-23 KST에 구현 전 작성했다.

| ID | 실패 조건 | 기대 결과 | 근거 | 필수 | 판정 |
| --- | --- | --- | --- | --- | --- |
| R01 (A08) | 초기화 Controller·Service·Policy·Result, 오류 코드, 전용 저장소 메서드, 설정, 테스트 중 일부가 남음 | #592가 추가한 코드·설정·테스트가 모두 없고 참조 검색 결과가 0 | `git grep`(이름·설정 키·오류 코드·응답 필드), diff | 예 | PASS |
| R02 (A08) | 다른 기능이 쓰는 저장소 메서드·import·설정을 함께 지움 | 남은 소비자가 없는 메서드만 지우고 다른 조회·잠금 메서드와 import는 유지 | 참조 검색, 백엔드 빌드 | 예 | PASS |
| R03 (A07) | prod·dev·local 설정에 초기화 키가 남거나 다른 설정이 바뀜 | `yesulin.pdf-review.*` 키만 사라지고 dev `pdf-ai` 등 나머지 설정은 그대로 | YAML diff | 예 | PASS |
| R04 (A09) | API 표·계약 절·도메인 정책·흐름 예외가 남거나, 제거한 절을 가리키는 링크가 깨짐 | 계약·정책·흐름에서 초기화 설명이 빠지고 `#시연-초기화` 링크가 0, 다른 문단은 유지 | 문서 diff, 앵커 검색 | 예 | PASS |
| R05 (A01·A06) | 제거 뒤 컴파일·기존 심사 흐름·Checkstyle이 깨짐 | 백엔드 빌드·전체 테스트·Checkstyle 통과 | 아래 검증 절의 두 실행 | 예 | PASS |
| R06 (A07) | 배포 뒤에도 dev에서 초기화 경로가 동작 | 배포 후 같은 요청이 등록되지 않은 경로로 실패 | dev 배포 뒤 실제 요청 | 아니오 | UNVERIFIED |
| R07 (A10) | 독립 평가나 집계 누락 | 독립 평가 1회와 건수·문제 ID 기록 | 이 기록과 PR 본문 | 예 | PASS |

프론트엔드는 이 API를 호출하거나 MSW로 흉내 내지 않았다(`deletedReviews`·`deletedEntries`·DELETE 호출 검색 0). 그래서 프론트 변경은 없다.
R06은 병합 후 dev 배포가 끝나야 확인할 수 있어 필수에서 뺐다.
A02~A05(원본 접수·추출 콜백·AI 획득·수동 작업 보호)는 N/A다. 제거 전용 작업이라 그 코드를 바꾸지 않았고, 관련 테스트는 R05 실행에 포함됐다.

## 검증과 독립 평가

- 2026-11-23 KST, Windows, Java 25. 백엔드 `./gradlew build`는 259클래스 1,562테스트 중 1건이 실패했다.
  실패는 이번 변경과 무관한 `OtrSubmissionPhotoAccessMysqlTest`다. 셸 PATH에 따옴표가 섞여(`C:\Python312\Scripts"`) `@EnabledIf` 조건 계산이 `InvalidPathException`을 냈다.
- PATH에서 따옴표를 뺀 뒤 그 테스트와 `art.yesulin.audit.*`·`art.yesulin.pdfextraction.*` 테스트, `checkstyleMain`·`checkstyleTest`를 다시 실행했다.
  27클래스 218테스트, 실패·오류 0, 건너뜀 2(MySQL 없는 환경에서 원래 건너뛰는 그 테스트), Checkstyle 위반 0, exit 0.
- 참조 검색(`AuditReset`·설정 키·오류 코드·응답 필드·`#시연-초기화` 앵커·환경 변수)은 보존한 11-16 기록과 이 기록 말고는 0건이다.
- 독립 평가 1회 완료. 우선 도구(Codex)가 이 PC에 없어 별도 읽기 전용 평가자를 썼다. 평가자는 스테이징 diff와 #592 되돌림 diff를 줄 단위로 비교했다.
  차이는 의도한 문장 1줄(#610이 넣은 AI 끄기 절의 초기화 API 언급)뿐이다. 남은 import, 다른 소비자, config 서브모듈, 프론트·MSW도 확인했다.
- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0 / N/A 4(A02~A05). 필수 아님 UNVERIFIED 1(R06).
- 신규 확정 문제는 발견 3 / 해결 3 / 미해결 0이다. 심각도는 P0 0 / P1 0 / P2 0 / P3 3이다.
  발견 경로는 PRECHECK 0 / INDEPENDENT_REVIEW 3 / POST_FIX_CHECK 0 / EXTERNAL 0이다. 오탐(REJECTED) 6.

| 문제 ID | 심각도·유형·유입·경로 | 문제·근거 | 조치·상태 |
| --- | --- | --- | --- |
| 2026-11-23-audit-remove-demo-reset-F01 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | 평가 결과를 채우기 전에 R07을 PASS로 적음 | 평가 결과·건수·문제 ID를 채운 뒤 PASS 유지. FIXED |
| 2026-11-23-audit-remove-demo-reset-F02 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | R05 근거가 `./gradlew build` 한 줄뿐이고 실제 전체 실행의 1건 실패·재실행 경위가 빠짐 | 두 실행의 숫자·원인·환경·날짜를 위에 기록. FIXED |
| 2026-11-23-audit-remove-demo-reset-F03 | P3/DOC/INTRODUCED/INDEPENDENT_REVIEW | 적용하지 않은 A02~A05의 N/A 사유 누락 | 평가표 아래에 사유 추가. FIXED |

오탐으로 본 6건은 다음과 같다. 셋은 #592 이전이나 다른 PR에서 온 것이다.

- MSW `/api/v1/pdf-reviews` passthrough: #592 이전부터 있던 목록 요청이다.
- `application-dev.yml`의 명함 설정: #434에서 온 것이다.
- `backend/docs/api.md`: #592가 바꾸지 않은 파일이다.

나머지 셋은 남겨 둔 이유가 있다.

- 11-16 기록의 이름 언급: 보존할 이력이다.
- 지운 문장 때문에 PENDING AI 작업 처리 안내가 빠진 점: 기능을 지웠으니 맞는 결과다.
- R06을 필수에서 뺀 점: 사유를 기록했다.

### 사건 이력

| 사건 | 문제 ID | 종류 | 시각 | 근거 / PR |
| --- | --- | --- | --- | --- |
| E01 | 2026-11-23-audit-remove-demo-reset-F01 | CONFIRMED | 2026-11-23T11:15:39+09:00 | 독립 평가 / PENDING |
| E02 | 2026-11-23-audit-remove-demo-reset-F02 | CONFIRMED | 2026-11-23T11:15:39+09:00 | 독립 평가 / PENDING |
| E03 | 2026-11-23-audit-remove-demo-reset-F03 | CONFIRMED | 2026-11-23T11:15:39+09:00 | 독립 평가 / PENDING |
| E04 | 2026-11-23-audit-remove-demo-reset-F01 | FIXED | 2026-11-23T11:18:00+09:00 | 이 기록 수정 / PENDING |
| E05 | 2026-11-23-audit-remove-demo-reset-F02 | FIXED | 2026-11-23T11:18:00+09:00 | 이 기록 수정 / PENDING |
| E06 | 2026-11-23-audit-remove-demo-reset-F03 | FIXED | 2026-11-23T11:18:00+09:00 | 이 기록 수정 / PENDING |

수정은 평가 기록 문서만 바꿨고 코드·설정은 그대로라 재실행이 필요한 검증은 없다. dev 배포 뒤 R06 확인이 남는다.
