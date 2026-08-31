# Admin 지원서 조회 및 삭제 설계

## 목적

베타 운영 중 운영자가 `/admin`에서 모든 공고의 지원서를 조회하고, 선택한 지원서 한 건을 안전하게
삭제한다. 기존 `ADMIN` 세션 인증에 별도 확인 비밀번호를 더하고 모든 삭제 결과를 감사 로그에 남긴다.

## 확정 결정

### 조회 화면과 API

- 공고 목록의 행을 펼치면 해당 공고의 지원서 요약 목록을 조회한다.
- 요약 목록에서 지원서 상세를 열어 제출 당시 전체 스냅샷과 제출 자료를 확인한다.
- 공개 API는 다음 세 경계로 고정한다.
  - `GET /api/v1/admin/auditions/{auditionId}/submissions`
  - `GET /api/v1/admin/submissions/{submissionId}`
  - `DELETE /api/v1/admin/submissions/{submissionId}`
- 모든 경계는 `ADMIN` 세션을 요구하고 DELETE는 CSRF 검증을 함께 요구한다.

### 2차 확인

- 삭제 모달은 대상 공고·지원자·지원서 ID를 다시 보여주고 매 삭제마다 별도 비밀번호를 입력받는다.
- 요청 본문은 `confirmationPassword`만 전송한다. 브라우저 상태나 저장소에 보존하지 않는다.
- 서버에는 원문이 아닌 BCrypt 해시만 `YESULIN_ADMIN_DELETION_PASSWORD_HASH`로 설정한다.
- 해시가 비어 있거나 형식이 잘못됐거나 비밀번호가 일치하지 않으면 삭제를 거부한다.
- 비밀번호와 요청 본문은 애플리케이션 로그와 감사 로그에 남기지 않는다.

### 삭제 트랜잭션

- 공개 UUID로 대상 지원서를 잠가 다시 확인한 뒤 한 트랜잭션에서 삭제한다.
- 삭제 순서는 심사 기록, 심사 완료 표시, 동의, 제출 사진·포스터 `file_references`, 지원서와 JPA가 소유한
  종속 컬렉션 순이다.
- 삭제된 지원서가 선택했던 배역의 `screening_completions`를 함께 제거해 남은 지원서를 다시 심사할 수 있게 한다.
- `file_assets`와 S3 객체는 삭제하지 않는다. 다른 참조 가능성과 복구 여지를 보존한다.
- 성공한 삭제만 `AdminAction.SUBMISSION_DELETED` 감사 로그로 남긴다. 대상은 내부 지원서 ID이며 detail에는
  공고 UUID와 지원서 UUID만 기록하고 개인정보 원문은 기록하지 않는다.

### 오류 계약

- 지원서가 없으면 `404 SUBMISSION_NOT_FOUND`다.
- 별도 비밀번호가 비어 있거나 일치하지 않거나 서버 해시가 설정되지 않았으면
  `403 ADMIN_DELETION_CONFIRMATION_FAILED`다.
- 성공 응답은 본문 없는 `204 No Content`다.

## 검증

- Controller 테스트로 ADMIN 권한, 응답 계약, CSRF와 DELETE body 전달을 확인한다.
- application 테스트로 비밀번호 불일치 시 무변경, 성공 시 종속 데이터 삭제·파일 원본 보존·감사 로그 생성을 확인한다.
- 실제 DB 기반 테스트로 지원서의 JPA 소유 컬렉션과 별도 FK 행이 모두 제거되는지 확인한다.
- 프론트 lint/build와 데스크톱·모바일 Visual QA로 조회·상세·삭제 모달의 상태를 확인한다.
