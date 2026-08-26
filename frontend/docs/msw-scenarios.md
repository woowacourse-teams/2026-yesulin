# MSW 시나리오

MSW는 `NEXT_PUBLIC_API_MOCKING=enabled`에서만 실행하며 `/dev/scenarios`에서 대표 상태를 연다. 경로와 데이터는
프론트 UI 검증용이며 백엔드 계약의 정본이 아니다.

## 배우 지원

| 시나리오 | 경로 | 확인 내용 |
| --- | --- | --- |
| 기본 복수 배역 | `/apply/seed_posting_1` | 복수 배역, 기본·추가·사진·영상·질문·검토 단계 |
| 최소 정보 | `/apply/seed_posting_minimal` | 단일 배역 선택 생략, 빈 섹션 생략 |
| 키 미수집 | `/apply/seed_posting_without_height` | HEIGHT 미노출, WEIGHT 필수 |
| 전체 항목 | `/apply/seed_posting_all_fields` | 전체 기본·추가 정보와 긴 질문 |

사진 보관함은 지원서에 자동 첨부하지 않는다. 보관함 선택과 새 파일은 요구 슬롯 단위로 Draft에 저장한다.
실제 UUID 공고 제출은 MSW 환경에서도 백엔드 세션과 `/api/v1/**` 제출 계약을 사용한다.

## 심사

| 시나리오 | 경로 | 확인 내용 |
| --- | --- | --- |
| 배역 현황 | `/producers/postings/seed_posting_round_2` | 단일 배역도 배역 현황을 거쳐 심사 보드로 이동 |
| 1차 | `/producers/roles/seed_role_seoyeon?round=1` | 결과 저장과 2차 대상 계산 |
| 영상 | `/producers/roles/seed_role_seoyeon/submissions/26081201?round=1` | 영상 3개와 요구 설명 |
| 2차 | `/producers/roles/seed_role_round_2?round=2` | 1차 PASS 대상만 승계 |
| 3차 | `/producers/roles/seed_role_round_3?round=3` | 이전 차수 PASS 대상만 승계 |

상태는 `PENDING`, `PASS`, `FAIL`, `ETC`다. 모든 차수의 `PENDING`이 없어야 배역 전체 심사를 종료할 수 있고,
종료 후에는 결과를 수정할 수 없다. 목 메모리 상태는 새로고침하면 seed로 돌아간다.

## 공통 검증

- 모바일 390×844와 데스크톱 1440×1000에서 가로 overflow가 없어야 한다.
- sticky header와 하단 action이 내용을 가리지 않아야 한다.
- 키보드로 단계 이동, 필터와 결과 버튼을 사용할 수 있어야 한다.
- 필수·선택·잠김·검토 대기·완료 상태는 텍스트로도 구분한다.
- 로딩·빈 상태·오류 상태에 접근 가능한 이름과 복구 안내를 제공한다.

