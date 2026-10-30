# 실제 지원서 1건의 Luna 추론 비활성 실험

- 작업 ID: `2026-10-30-pdfextraction-luna-real-pdf-probe`
- 평가일: 2026-10-30, Asia/Seoul
- 기준 코드: `83b979ff`, 평가표 v1
- 범위: 사용자가 제공한 지원서 PDF 1건. 앱 코드·환경 변수·DB 변경 없음.
- 독립 평가 1회: 별도 읽기 전용 평가자. 다른 종류의 평가 도구가 없어 같은 종류의 독립 평가자로 대체했다.
- 개인정보·지원서 원문·응답 원문은 저장소에 기록하지 않는다. 임시 로컬 증거는
  `/private/tmp/yesulin-luna-pdf-probe/`에 있고 원격 테스트 응답 파일은 정리했다.

## 절차와 평가표

원문 페이지를 렌더링하여 예상 값을 먼저 고정하고, 현재 Lambda의 `extract_pdf` 함수를 로컬에서 실행했다.
실제 Java `PdfAiPrompt`가 생성한 입력을 dev EC2 SSM에서 Bedrock Converse로 전달했다.
배역은 실제 심사 DB 대신 명시적인 테스트 스냅샷 2개를 사용했다.
응답은 압축 체크섬을 확인하며 로컬로 옮겨 실제 `PdfAiResponseParser`로 검사했다.

| ID | 단계·실패 조건 | 기대 결과·검증 방법 | 필수 | 결과 |
| --- | --- | --- | --- | --- |
| E01 | PDF 추출 실패·누락 | 기존 함수로 전체 2페이지 COMPLETED, 경고 없음 | 예 | PASS |
| E02 | 원문 대비 누락·오전사 | 호출 전 고정한 이름·배역 2개, 프로필 4개, 경력 24개 값 비교 | 예 | PASS: 30/30 |
| E03 | 호출 거부·잘림·추론 설정 미적용 | 실제 dev EC2 Converse 호출의 HTTP·종료 상태·사용량·시간 관찰 | 예 | PASS: 실행자 직접 관찰 |
| E04 | 스키마·근거 불일치 | 실제 Java 파서 통과, 독립 검토로 입력과 근거 대조 | 예 | PASS |
| E05 | 표본·속도 결과 과장 | 단일 표본이며 서비스 E2E·모델 간 속도 비교가 아님을 명시 | 예 | PASS |
| E06 | 서비스 설정 변경·실험 잔재 | 앱·DB 변경 없음, 원격 임시 파일 정리·SSM 종료 | 예 | PASS |
| E07 | 업로드 권한·중복·콜백·lease·수동 입력 보호 | 이번 독립 모델 실험에서 실행하지 않음 | 아니요 | N/A |

## 관찰 결과

- 모델: `global.openai.gpt-6-luna`, endpoint: `ap-northeast-2` Bedrock Runtime Converse.
- `additionalModelRequestFields.reasoning.effort=none`, `maxTokens=4096`, temperature 생략.
- HTTP 200, `end_turn`, 모델 호출 3.97초, 응답 1,455자, 출력 616토큰, 추론 0토큰.
- provider `/usage`: 입력 1,793토큰, 출력 616, 합계 2,409.
  Converse 기본 usage의 `inputTokens=2`와 캐시 쓰기 1,791을 함께 읽어야 한다.
- 추출 함수 내부 396ms, 외부 측정 약 0.397초. 로컬 추출 시간이며 배포 Lambda 시간은 아니다.
- 원문에서 확인한 경력 4건을 순서대로 보존했다. 기재되지 않은 나이와 마지막 경력의 공연장은 null이었다.
- 실제 응답 파서의 형식·알려진 배역 ID·원문 근거·프로필 근거 검증을 통과했다.
- 독립 검토는 원문 이미지, 예상 값, 추출 결과, 입력, 응답 및 파서 결과를 대조했다.
  실측 시간·사용량은 실행자가 관찰한 SSM 결과이며 독립 평가자가 원격 호출을 반복한 값은 아니다.

## 한계와 문제 집계

이 결과는 한 지원서에서 30개 예상 값이 일치했다는 뜻이다. 일반적인 정확도나 다른 모델 대비 우월성을
입증하지 않는다. S3 업로드·실제 Lambda 실행·콜백·DB 반영·화면 반영은 이번 실험 범위 밖이다.
서버 Python SDK에는 Converse 메서드가 없어 기존 자격 증명으로 AWS 서명 HTTPS 요청을 사용했고,
서버 패키지나 서비스 설정을 변경하지 않았다. 실제 Java Bedrock 어댑터 자체를 호출한 실험은 아니다.

- 필수 PASS 6 / FAIL 0 / UNVERIFIED 0, N/A 1. 검증률은 이 실험 범위에 한한다.
- 신규 확정 문제 발견 0 / 해결 0 / 미해결 0, P0~P3 모두 0.
- 발견 경로 PRECHECK 0 / INDEPENDENT_REVIEW 0 / POST_FIX_CHECK 0 / EXTERNAL 0.
- 오탐 0, 문제 상태 사건 없음. PR 미생성.
- 정리 점검: 앱 코드·의존성·환경 변수 추가 없음. 재사용 실험 코드를 서비스 경로에 남기지 않았다.

## 같은 PDF로 모델·추론·온도 설정 비교

- 후속 작업 ID: `2026-10-30-pdfextraction-model-comparison`, 평가표 v1.
- 동일 PDF와 예상 값으로 4조건을 각 3회, 순차 round-robin 호출했다. 자동 재시도는 없다.
- 모든 요청은 4096토큰 상한, 서울 Bedrock Runtime Converse를 사용했다.
- 배포 JAR의 실제 프롬프트 상수를 읽어 기존 Java 생성 SYSTEM/USER의 SHA-256과 동일함을 확인했다.
모델별 캐시·추론 라우팅과 실행 순서는 통제하지 않았으며 시간은 end-to-end HTTP 호출 시간이다.

| 조건 | HTTP 200 | 값 일치(각 30개) | 호출 시간 중앙값 | 출력 토큰 중앙값 | 1천 건 기본요율 환산 추정 |
| --- | --- | --- | --- | --- | --- |
| Luna none, temperature 생략 | 3/3 | 30, 30, 30 | 4.170초 | 628 | $0.4913 |
| Luna none, temperature 0 | 0/3 | 응답 없음 | 비교 제외 | 비교 제외 | 비교 제외 |
| Haiku thinking disabled, temperature 생략 | 3/3 | 30, 30, 30 | 3.011초 | 673 | $0.6188 |
| Haiku 현재 기본값, temperature 생략 | 3/3 | 29, 23, 28 | 11.609초 | 2631 | $1.6339 |

### 정확성과 파라미터 해석

- 유효 응답 9건은 실제 `PdfAiResponseParser`와 근거 검사를 모두 통과했다.
- Haiku 기본값의 차이는 일부 공연장·배역을 null로 남긴 누락이다. 잘못된 다른 값을 생성한 사례로 해석하지 않는다.
  프롬프트가 모호한 경계를 보수적으로 null 처리하도록 요구하므로 이 표는 미리 정한 원문 값과의 완전 일치다.
- Luna temperature 0은 `This model doesn't support the temperature field. Remove temperature and try again.`으로
  HTTP 400을 반환했다. 이 Bedrock Converse 경로에서는 temperature를 생략해야 한다.
  온도 0의 정확성·속도·비용은 측정하지 못했으며 지원되는 설정으로 권장하지 않는다.
- Luna는 provider usage의 reasoning_tokens=0, Haiku disabled는 reasoningContent 블록 없음,
  Haiku 기본값은 reasoningContent 블록 있음을 확인했다. Haiku의 정확한 추론 토큰 수는 별도 제공되지 않아
  두 설정의 전체 출력 차이를 추론 토큰 수라고 부르지 않는다.

### 비용과 통계의 한계

Luna 입력은 매회 1,793토큰, Haiku disabled 2,836토큰, 기본값 2,837토큰이었다.
같은 문자열도 모델별 토큰 수가 다르므로 비용 차이에는 입력 토큰 수 차이도 포함된다.
표의 비용은 공개된 짧은 입력 기본 요율(입력 $0.10/출력 $0.50, 각각 백만 토큰당)을 사용해
각 호출의 총 입력·출력 비용을 계산한 뒤 3회 평균을 1천 건으로 환산한 추정이다.
캐시 읽기 할인·쓰기 할증, 계약, 세금, S3/Lambda/서버 비용은 제외했고 실제 계정 청구액이 아니다.
기본요율 환산으로 Luna는 현재 Haiku 대비 약 70%, Haiku disabled 대비 약 21% 낮았다.

근거 요율: [Luna Bedrock 글로벌](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-openai-gpt-6-luna.html#pricing),
[Haiku 공개 기본가](https://platform.claude.com/docs/en/about-claude/pricing).
세 조건의 표본은 같은 PDF 1건을 3회 반복한 것이므로 문서 다양성에 대한 정확도 검증이나 안정적인 지연시간
분포를 뜻하지 않는다. Haiku disabled 호출 시간은 2.993/3.011/6.829초로 변동했다.
Luna 2·3회는 입력 1,791토큰을 캐시에서 읽었다. 캐시가 시간·실청구액에 미친 효과를 분리한 실험은 아니다.
평균 호출 시간은 Luna 4.164초, Haiku disabled 4.278초, Haiku 기본값 11.272초다.
따라서 중앙값만으로 Haiku disabled가 항상 빠르다고 결론내리지 않는다.

### 비교 평가표

| ID | 실패 조건·검증 방법 | 결과 |
| --- | --- | --- |
| B01 | 배포 프롬프트와 기존 Java 입력 해시 불일치 시 중단 | PASS: 두 해시 동일 |
| B02 | 동일 입력·리전·상한·명시된 조건 확인 | PASS: 온도 0 거부도 결과로 보존 |
| B03 | 조건당 3회 시도·HTTP·종료·시간·사용량 보존 | PASS: 총 12회, 성공 9/거부 3 |
| B04 | 성공 응답이 실제 파서·근거 검사를 통과하고 30개 원문 값 모두 일치 | FAIL: 기본 Haiku 3회 모두 null 누락, 나머지 성공 조건은 PASS |
| B05 | 중앙값·비용 계산·캐시와 표본 한계 명시 | PASS |
| B06 | 앱/DB 무변경·원격 파일 정리·세션 종료·독립 검토 | PASS |

비교 증거는 같은 임시 로컬 디렉터리의 `model-comparison-*.json`, `comparison-criteria.md`,
`compare_results.py`, `PdfBatchValidate.java`다. 실제 원격 파일의 압축 결과 2,412자를 읽어 체크섬 검증 후
21,714바이트 JSON을 복원했다. 원격 임시 디렉터리를 정리하고 SSM 종료를 확인했다.
서비스용 실험 코드·의존성·환경 변수는 추가하지 않았다. PR 미생성.

독립 읽기 전용 평가 1회에서 입력 해시, 요청 순서, 성공 응답 9건, 파서 결과, 누락, 중앙값·평균·비용 계산을
재검토했다. 별도 원격 재호출은 하지 않았다. 확정된 신규 서비스 결함 0/P0~P3 모두 0, 오탐 0,
상태 사건 없음. B04 실패는 기존 모델 설정의 표본 품질 결과이며 이번 비교 작업에서 앱을 수정해 해결한 것이 아니다.
필수 PASS 5 / FAIL 1 / UNVERIFIED 0, 검증률 5/6은 실험 평가표 기준이며 모델 정확도가 아니다.
업로드·실제 Lambda·콜백·DB·화면 흐름, 다수 PDF 정확도, 캐시를 통제한 성능은 N/A/미검증 범위로 유지한다.
