# PDF 대량 업로드 안내 검토

작업 ID: 2026-10-31-pdf-upload-risk-advice. 평가일 2026-10-31, 공용 PDF v1. 제품 수정 없는 코드/공식 문서 기반 자문.

| ID | 기대 결과 / 실패 경계 | 검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| R1 | 다중 선택 상한과 실제 동시 실행을 구분 | use-review-uploads.ts CONCURRENCY=2, S3 비동기 흐름 대조 | Y | PASS |
| R2 | 재시도와 영구 복구 보장을 구분 | completion_api.py timeout=10/오류 전파, 공용 PDF 정책, AWS 비동기 오류 문서 | Y | PASS |
| R3 | 운영 설정·300건 안전성·확률을 추정하지 않음 | 미측정 명시·외부 안내 문안 독립 검토 | Y | PASS |

범위: 대표에게 보낼 안내 문안과 개발자 메시지의 기술적 해석. 운영 AWS/DB 부하·실제 50 동시성 설정·배포 버전 확인은 실시하지 않는다. 기능 변경이나 부하 테스트는 요청 범위 밖. 20~30개 분할 제안은 검증된 안전 수치가 아닌 임시 운영 완화책이다.

근거: frontend/src/features/pdf-reviews/use-review-uploads.ts:10; ops/pdf-extraction-lambda/src/infrastructure/completion_api.py; 공용 PDF flows/pdf-extraction.md, policies/pdf-processing.md. AWS https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html 및 https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html 확인. 비동기 내부 큐/제한적 재시도 존재. 함수 오류 재시도 소진 및 이벤트 만료는 결과 미반영 위험. 원본 S3 보존과 DB 결과 반영 실패는 별도.

평가 전 잠정 집계: 신규 확정 결함 0, 미확인 1(R3 독립 문안 검토). 기존 영구 실패 복구 미완료를 신규 결함으로 재집계하지 않는다. 새 런타임 파일·코드·설정·의존성 없음. 본 기록은 자문 근거이며 PR 미생성(PENDING).


## 최종 독립 검토

독립 평가 1회 완료(상대 도구 미연결로 기존 별도 에이전트 사용). R3 PASS. 브라우저 업로드2 ≠ Lambda/DB동시2, 운영50 미확인, 분할업로드는 안전보장 아님, 완료 문구뿐 아니라 전체/실패/일부와 개별 결과 대조하도록 문안 확인. 신규 미사용 파일·코드·설정·의존성 없음.

최종 집계: 필수 PASS 3 / FAIL 0 / UNVERIFIED 0 / N/A 0 (자문 검증률3/3). 발견0 / 해결0 / 미해결0, P0~P3각0, 발견경로별각0, 오탐0. 문제 사건 없음, PR PENDING. 실제 운영 설정·DB 처리량·300건 안전성은 범위 밖으로 미검증 상태 유지. 제품 테스트/배포는 실행하지 않았다. 위 잠정 집계는 평가 이전 이력이다.
