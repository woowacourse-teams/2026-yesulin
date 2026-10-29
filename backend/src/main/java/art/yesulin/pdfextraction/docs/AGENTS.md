# 공용 PDF 추출·AI 규칙

최상위/backend 규칙 다음에 적용한다. `docs/CLAUDE.md`·`docs/README.md`와 대상 flows/policies를 읽는다.
- PDF 해석은 Lambda 한 경로다. 서버 Python 워커·processor 선택 옵션을 만들지 않는다.
- 공연사 심사와 배우 프로필이 공유한다. purpose/ownerType/소유권과 배우의 보관·삭제·일일 집계 계약을 보존한다.
- callback payload는 불변, AI 결과는 별도 DB 작업에 둔다. 동일 callback·재시작·lease·삭제 후 늦은 결과를 검증한다.
- 독립 평가와 미사용 정리는 공통 평가 절차를 따르고, 실제 실행 경로/현재 소비자 기준으로 판단한다.
  자기 테스트나 과거 probe만 있는 구현은 그 이유만으로 유지하지 않는다.
- 기술 정책은 docs/policies, 기능 흐름은 docs/flows에 둔다. 추가 전체 평가 의무는 없고 기본 1회다.
