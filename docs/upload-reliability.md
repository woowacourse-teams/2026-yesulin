# WebKit 파일 업로드 신뢰성

## 배경

iOS 26.5~26.6 WebKit에서는 사진 선택기나 IndexedDB에서 얻은 disk-backed `File`을
`fetch`/XHR body로 직접 전송할 때 네트워크 프로세스가 임시 파일을 읽지 못할 수 있다. 이때
`NotFoundError` 또는 `Failed to fetch`가 발생하거나, PUT은 성공처럼 보이지만 S3에 0바이트 객체가
저장될 수 있다. 페이지에서 `arrayBuffer()`로 읽은 뒤 만든 메모리 `Blob`은 이 경계를 피한다.

이 문서는 지원서 사진, 배우 프로필 사진, 공연 포스터가 공유할 클라이언트 업로드 방식과 베타 운영
진단 범위를 정한다. Presigned PUT, completion, `FileAsset`/`FileReference`와 파일 조회 계약은 바꾸지
않는다.

## 결정

### 공용 업로더

워크플로 단위의 공용 모듈이 다음 순서를 책임진다.

1. 입력 `Blob`을 `arrayBuffer()`로 읽고 새 메모리 `Blob`으로 복사한다.
2. 복사본의 크기가 입력 크기와 같은지 확인한다.
3. 파일 종류별 upload-request 콜백으로 presigned URL을 받는다.
4. 메모리 `Blob`만 S3 PUT body로 보낸다.
5. 파일 종류별 completion 콜백을 호출한다.
6. `NotFoundError`, `Failed to fetch` 계열 또는 `FILE_METADATA_MISMATCH`에 한해서 같은 URL과
   메모리 `Blob`으로 최대 한 번 PUT과 completion을 다시 수행한다.
7. 준비, upload-request, PUT, completion, retry 단계를 구분한 오류를 반환한다.

프로필 보관함 연결, 공연 생성·수정, 지원서 제출과 같은 도메인 동작은 각 기능 모듈이 계속 책임진다.
여러 사진은 메모리 사용량이 겹치지 않도록 기존과 같이 순차 업로드한다.

### 진단 수집

외부 오류 수집 서비스와 별도 진단 테이블은 이번 베타 범위에 도입하지 않는다. 인증된 사용자의 최종
실패와 재시도 성공만 동일 출처의 Spring 진단 API로 보내고, Spring 구조화 로그에 기록한다. 진단 전송
실패는 원래 업로드 결과를 바꾸지 않는다. 기존 로그 보존 설정은 이번 작업에서 변경하지 않는다.

클라이언트가 UUID `incidentId`를 만들고 Spring 요청의 `X-Request-Id`로 전달한다. 허용 필드는 다음과
같다.

- `uploadFlow`: `APPLICATION_PHOTO`, `PROFILE_PHOTO`, `PERFORMANCE_POSTER`
- `stage`: `PREPARE`, `UPLOAD_REQUEST`, `PUT`, `COMPLETION`, `RETRY`, `SUBMISSION`
- `attempt`: 1 또는 2
- `result`: `FAILED` 또는 `RETRY_SUCCEEDED`
- `errorCode`: 허용 목록으로 제한한 오류 코드
- 선택적 `httpStatus`
- `serviceWorkerControlled`
- `coarsePlatform`: `IOS`, `ANDROID`, `DESKTOP`, `OTHER`
- `coarseBrowser`: `SAFARI`, `CHROME`, `KAKAO`, `NAVER`, `INSTAGRAM`, `OTHER`

파일명, 파일 내용, object URL, presigned URL, 지원서 답변, 전체 User-Agent, Cookie, 인증 토큰은 보내거나
로그에 남기지 않는다. completion의 `FILE_METADATA_MISMATCH`는 서버가 `fileId`, 기대/실제 크기와
Content-Type을 기록하되 소유자 ID는 기록하지 않는다.

### 사용자 안내

업로드 오류에는 실패 단계별 안내와 `incidentId`를 표시한다. 사용자는 해당 사진을 다시 선택하거나
잠시 후 재시도할 수 있고, 문의 시 사진 자체 대신 오류 ID를 전달한다.

## 검증 전략

공용 업로더는 Vitest로 다음을 자동 검증한다.

- PUT body가 원본 `File`이 아닌 같은 크기·Content-Type의 메모리 `Blob`인지
- 읽기 실패와 복사 크기 불일치가 PUT 전에 차단되는지
- 허용된 WebKit 증상만 같은 URL로 한 번 재시도하는지
- 0바이트 객체가 completion mismatch를 일으킬 때 재업로드하는지
- 비허용 HTTP 오류와 두 번째 실패는 더 재시도하지 않는지
- 여러 파일이 동시에 메모리 복사·업로드되지 않고 순차 처리되는지
- 최종 실패와 재시도 성공 진단에 허용 필드만 포함되는지

Spring 테스트는 진단 API의 인증·검증·로그 필드와 completion metadata mismatch를 검증한다. 일반
Playwright WebKit은 iOS 26 네트워크 프로세스를 재현하지 못하므로 자동 테스트 통과는 실기기 승인과
분리한다.

배포 후에는 실제 iOS 26.5/26.6 Safari, iOS Chrome, WKWebView 인앱 브라우저 한 종류 이상에서 다음을
각각 확인한다.

1. 사진 선택 직후 지원서 제출
2. IndexedDB Draft 복원 후 제출
3. 지원 사진 3장 순차 업로드
4. 배우 프로필 사진 추가
5. 공연 포스터 생성 및 교체
6. 네트워크 실패 후 재시도와 오류 ID 안내

각 항목은 화면 성공 여부, Spring의 동일 `incidentId` 로그, S3 객체 크기, completion 후 `READY`를
서로 대조한다. CI 성공, 운영 배포, 실기기 검증 완료는 별도 상태로 보고한다.
