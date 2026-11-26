# 개발 심사함 지원서 확장자 설정 검증

작업 ID `2026-11-27-review-document-dev-config`. 2026-11-27 KST. 심사 도메인 평가표 v1 중 접수·환경·미사용 설정을 검토했다.

| ID | 확인할 내용 | 검증 방법과 결과 |
| --- | --- | --- |
| C1 | 개발 서버의 허용 형식만 추가한다. 설정값의 유실이나 운영 변경이 없어야 한다. | PASS. 비공개 설정 커밋 전후의 SOPS MAC 확인 및 복호화 결과를 메모리에서 비교했다. 변경 경로는 server/dev.env 하나이며 추가한 설정 키는 한 개다. 다른 키와 값, 운영 파일은 동일했다. |
| C2 | 기존 PDF와 새 형식이 모두 같은 심사함 정책에 연결돼야 한다. | PASS. ReviewDocumentFormats의 기본 PDF와 개발 허용 목록 DOCX·PPTX·HWP·HWPX가 결합되며 가져오기·심사함 상세·접수에서 같은 정책을 소비하는 경로를 확인했다. 미사용 설정 없음. |
| C3 | 애플리케이션과 배포 시스템이 같은 암호화 설정을 선택해야 한다. | PASS. config 서브모듈과 config-version.txt가 원격 main에 게시된 같은 커밋을 가리킨다. validate-pin.sh의 로컬·원격 검사와 실제 암호화 파일을 이용한 verify-build-source.sh의 dev 소스 검사, 환경별 선택 회귀 테스트가 통과했다. |

## 평가 집계

독립 평가 1회. 필수 PASS 3, FAIL 0, UNVERIFIED 0, N/A 0. 신규 확정 발견·해결·미해결 0건. P0~P3, PRECHECK·INDEPENDENT_REVIEW·POST_FIX_CHECK·EXTERNAL, 오탐 모두 0건. 배포된 dev 서버의 응답과 실제 문서 변환은 병합 후 검증할 범위다.

## 상태 이력

확정·해결·재개·오탐 사건 없음.
