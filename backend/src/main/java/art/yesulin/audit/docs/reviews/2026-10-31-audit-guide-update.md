# PDF 심사 가이드 화면 갱신

작업 ID `2026-10-31-audit-guide-update`, Audit v1 + 가이드 갱신 v1, 2026-10-31.
사용자가 제공한 기존 12쪽 PDF를 현재 로컬 화면·동작에 맞게 수정한다. 원본 보존, 별도 수정본 PDF.
제품 코드·운영 데이터 변경 없음. 로컬 합성 지원자 화면만 촬영한다.

| ID | 기준·실패 조건 | 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| G1 | 생성/업로드/필터/배역/원문/판정 버튼이 현재 UI와 일치 | 실제 캡처·코드 대조 | Y | PASS |
| G2 | 폴더/ZIP·SNS URL/QR·중복·저장 설명이 구현과 일치 | 도메인·코드·문구 대조 | Y | PASS |
| G3 | 합격자 전화·이메일 확인 안내, 일정 운영 완료 오인 없음 | 실제 캡처·문구 | Y | PASS |
| G4 | 모든 쪽 글자·이미지·번호 가독성, 잘림·중첩·누락 없음 | 전체 PDF 렌더·시각 검사 | Y | PASS |
| G5 | 합성 예시·로컬 기준 명시, 원본 보존·미사용 참조·독립평가 | 파일·독립 검토1회 | Y | PASS |

운영 배포·실제 지원서 추출 정확도/300건 성능은 검증 범위 밖. 런타임 변경 없는 문서 작업으로 제품 테스트 N/A.

## 결과와 근거

- 독립 평가 1회 완료. 상대 평가 도구가 제공되지 않아 같은 종류의 별도 읽기 전용 평가자를 사용했다.
- 필수 PASS 5 / FAIL 0 / UNVERIFIED 0 / N/A 0, 검증률 100%(가이드 범위).
- 발견 3 / 해결 3 / 미해결 0, P0 0 / P1 0 / P2 2 / P3 1, PRECHECK 2 / INDEPENDENT_REVIEW 1 / POST_FIX_CHECK 0, 오탐 0.
- 출력: `output/pdf/예술in_오디션_PDF_심사_가이드_수정본.pdf`, A4 가로 13쪽. 기존 파일은 보존했다.
- G1~G3: 현재 프론트 복사본 + 격리된 로컬 합성 API로 생성/업로드/필터/판정/배역/원문/합격자 연락처 화면 촬영. `tmp/pdfs/audition-guide-update/preview.cjs`, `screens/01-list.png`~`12-contacts.png`. 운영 DB 변경·실제 지원서 사용 없음. 합격 판정은 합성 API의 가상 응답이다.
- G2: 폴더 PDF 지원, ZIP 해제 필요, Instagram·YouTube URL 지원/QR 이미지 미추출, 동일 심사함 동일 내용 재사용, 보류는 판정 완료 집계 제외를 구현과 대조.
- G4: Poppler로 `page-01.png`~`page-13.png`를 생성해 작성자와 독립 평가자가 모두 확인. `layout-check.json` 13쪽 overflow/누락 이미지/페이지 이탈 0. pdftotext로 한글 본문과 연락처 안내를 확인(pypdf 한글 추출은 부정확하여 검증에 사용하지 않음).
- G5: 13쪽에 로컬 기준·합성 예시·배포 차이 명시. 원본 SHA256 `bcfc9ff7972f6bc99a4088ed5ee9d33495e0516f7f829e7e913ec328789ba6ec` 변경 없음. 미사용 초기 focus/contacts 캡처와 예비 몽타주 삭제. 새 의존성 없음.
- authoring HTML/build/render/fixture/assets/screens는 수정본 재생성에 사용하므로 보존. PNG는 시각 검수 근거다.
- 운영 배포, 실제 PDF 추출 정확도와 300건 처리 성능은 미검증이며 이 문서 작업 기준에는 포함하지 않았다. PR 생성하지 않음.

## 문제

| ID | 심각도·유형·유입 | 발견 경로 | 근거·조치 | 상태 |
| --- | --- | --- | --- | --- |
| 2026-10-31-audit-guide-update-F01 | P2 / DOC / EXISTING | PRECHECK | 원본의 중복 자동 제외 미지원 설명이 구현과 다름. 동일 내용은 기존 항목 재사용, 다른 내용은 신규로 수정 | FIXED |
| 2026-10-31-audit-guide-update-F02 | P2 / DOC / INTRODUCED | PRECHECK | 캡처 실제 너비와 DOM 측정 너비 차이로 이미지 일부 잘림/잘못된 영역 표시. 자연 이미지 크기를 기준으로 crop 수정, 최종 13쪽 직접 확인 | FIXED |
| 2026-10-31-audit-guide-update-F03 | P3 / DOC / EXISTING | INDEPENDENT_REVIEW | 모든 URL처럼 읽히는 안내를 지원 대상인 인스타그램·유튜브로 한정, 최종 7쪽 확인 | FIXED |

## 추가 전용 사건 이력

| 사건 ID | 문제 ID | 종류 | 시각 | 근거 | 최초 PR |
| --- | --- | --- | --- | --- | --- |
| E01 | 2026-10-31-audit-guide-update-F01 | CONFIRMED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |
| E02 | 2026-10-31-audit-guide-update-F01 | FIXED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |
| E03 | 2026-10-31-audit-guide-update-F02 | CONFIRMED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |
| E04 | 2026-10-31-audit-guide-update-F02 | FIXED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |
| E05 | 2026-10-31-audit-guide-update-F03 | CONFIRMED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |
| E06 | 2026-10-31-audit-guide-update-F03 | FIXED | 2026-10-31T19:01:07+09:00 | 확정 결과 기록·최종 PDF/PNG 검증 및 독립 평가 메시지 | PENDING |

## 최초 PR 연결

최초 게시 PR: [#479](https://github.com/woowacourse-teams/2026-yesulin/pull/479), 대상 dev, 관련 이슈 #478.
위 PENDING/PR 미생성 표기는 당시 작업 이력이며 이 절로 최초 게시 번호를 연결한다. 기존 문제 ID·확정/해결 시각은 변경하지 않는다.
