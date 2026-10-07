# 파일 저장

## 현재 흐름

1. 공연 포스터 또는 배우 사진 upload request API를 호출한다.
2. 서버는 `PENDING` FileAsset과 만료 10분의 S3 presigned PUT URL을 반환한다.
3. 클라이언트가 원본 `File`을 `arrayBuffer()`로 읽어 같은 크기의 메모리 `Blob`을 만들고 반환받은 URL에 PUT한다.
4. 클라이언트가 completion API를 호출한다.
5. 서버는 S3 HEAD의 Content-Type과 크기를 요청 metadata와 비교하고 일치하면 `READY`로 바꾼다.

공연 포스터는 JPEG·PNG·WebP 최대 30MB, 배우 사진은 같은 형식 최대 20MB다.

iOS WebKit의 disk-backed `File` 접근 실패를 피하기 위해 지원서 사진·프로필 사진·공연 포스터 모두 원본 `File`을
네트워크 body로 직접 보내지 않는다. `NotFoundError`, `Failed to fetch` 계열 또는 completion의
`FILE_METADATA_MISMATCH`만 같은 presigned URL로 최대 한 번 덮어쓴다. completion은 0바이트를 포함해 기대한
Content-Type·크기와 다르면 `READY`로 전환하지 않는다.

## 공개·비공개 경로

- 공연 포스터는 `public/files/{UTC yyyyMMdd}/{UUID}` 논리 키로 저장한다. CloudFront 원본 경로는
  `/yesulin/public`이며, 응답 URL에서는 `public/`을 제외한 `/files/...` 경로를 사용한다.
- 로컬 LocalStack의 공개 base URL은 버킷과 팀 prefix 뒤의 `/public`까지 포함한다. 따라서 운영 CDN과 동일하게
  `public/`을 제외한 `/files/...` 응답 URL로 실제 `yesulin/public/files/...` 객체를 읽는다.
- 로컬 LocalStack의 브라우저 업로드 CORS는 `http://localhost:3000`, `http://localhost:3001`과 실제 API 검증용
  `http://localhost:3200`을 허용한다.
- 배우 사진은 `private/actor-photos/{UTC yyyyMMdd}/{UUID}` 논리 키로 저장한다. private 키는 CloudFront
  URL로 변환하지 않는다.
- S3 실제 키는 논리 키 앞에 `YESULIN_STORAGE_S3_KEY_PREFIX`를 붙인다. 현재 staging 기준으로 포스터는
  `yesulin/public/files/...`, 배우 사진은 `yesulin/private/actor-photos/...`이다.

배우 사진 내용은 `GET /api/v1/files/{fileId}/content`로만 제공한다. Spring이 S3 객체를 읽어
`Cache-Control: no-store, must-revalidate`와 원본 Content-Type으로 응답한다. 조회자는 파일 소유 배우이거나,
해당 파일이 `SUBMISSION_PHOTO → Submission → Audition.ownerId`로 연결된 공고의 공연사여야 한다. 그 밖의
회원과 존재하지 않는 파일에는 동일하게 `404`를 반환한다.

## 서버가 직접 올리는 파일

운영자가 OTR에서 가져온 공고의 본문 사진·첨부파일은 presigned URL 없이 서버가 `ObjectStorage.put`으로 올린다.
키는 공고 전용 `public/audition-posts/{UTC yyyyMMdd}/{UUID}`이며 공개 CDN 주소로 응답한다.
개발·운영 S3 실제 키는 각각 `yesulin/dev/public/audition-posts/...`, `yesulin/prod/public/audition-posts/...`다.
CloudFront의 `/dev/audition-posts/*`, `/prod/audition-posts/*` 동작을 각 환경의 기존 공개 S3 원본에 연결하고,
뷰어 요청 함수 `yesulin-public-path-rewrite`가 환경 접두사를 제거해 `/audition-posts/...`로 전달한다.
함수는 `files`와 `audition-posts`만 허용하고 빈 경로 조각·`.`·`..`는 거부한다.
공연 포스터와 이미 `public/files/`에 저장된 파일을 위해 기존 `/dev/files/*`, `/prod/files/*` 동작도 유지한다.
기존 공고는 객체 이동·재가져오기 없이 같은 주소로 제공한다. 키마다 내용이 바뀌지 않으므로
`Cache-Control: public, max-age=31536000, immutable`을 붙이고, 첨부는 `Content-Disposition: attachment`와
원래 파일 이름(RFC 6266 `filename*`)을 객체에 설정한다. 내용은 원문 응답 길이만큼 스트림으로 보낸다.
이 파일은 `file_assets`·`file_references`에 기록하지 않고 `audition_post_files`가 키를 소유한다.
원문으로 다시 가져와 교체하면 커밋 뒤 이전 객체를 지운다.

## 소유권과 참조

- 모든 파일 동작은 소유 member ID를 검증한다.
- READY 파일만 공연 포스터, 사진 보관함과 지원서에 연결할 수 있다.
- 사진 보관함 삭제는 보관함 항목의 soft delete다.
- 지원서가 참조하는 사진과 포스터는 별도 reference registry에 기록해 제출 스냅샷과 개인 보관함을 분리한다.
- 운영자가 베타 지원서를 삭제하면 지원서의 reference만 제거하고 `file_assets`와 S3 객체는 보존한다.
- 사진보관함과 지원서 상세의 사진 URL은 private 콘텐츠 API 상대 경로를 반환한다.

## 미사용 파일 관리자 조회

- 관리자가 `/api/v1/admin/files/unreferenced`를 호출하면 기간과 관계없이 미참조 `PENDING`·`READY` 파일을
  페이지별로 조회한다. 삭제 진행 중인 `DELETING` 파일도 재시도를 위해 표시한다. 자동 실행은 하지 않는다.
- `PENDING`의 미사용 시작 시각은 업로드 요청 시각, `READY`는 업로드 완료 또는 마지막 연결 해제 시각이다.
  생성 시각이 없던 기존 파일과 마지막 연결 해제 시각을 알 수 없는 기존 `READY` 파일은 각각 배포 시각부터
  보수적으로 계산한다.
- `file_references`와 공연·사진 보관함·지원서·공연 예매의 활성 참조를 모두 확인한다. 사진 보관함에서
  soft delete된 항목은 활성 참조로 보지 않는다.
- 조회 응답은 파일 ID, 소유자 ID, 상태, 공개·비공개 범위, 생성·미사용 시작·삭제 가능 시각 및 7일 경과 여부만 담는다.
  원본 파일명과 저장소 키는 보내지 않는다. 조회 과정에서 DB 행과 S3 객체는 변경하지 않는다.
- 목록은 조회 시점의 상태다. 삭제 시점에는 서버가 참조와 기간을 다시 검사한다.
- 수동 삭제는 지원서 삭제에서 이미 사용하는 관리자 2차 확인 비밀번호를 요구한다.
  선택한 파일 최대 100개를 한 요청으로 보내고 비밀번호는 한 번만 확인한다. 7일 이상 미사용인 파일만 `DELETING`으로 전환한 뒤
  S3 객체를 삭제하고 `DELETED`와 관리자 감사 기록을 남긴다. S3 삭제가 실패하면 `DELETING`을 유지하며
  관리자가 실패한 파일을 다시 선택해 재시도한다. 성공·실패 결과는 파일별로 반환한다.
  `file_assets` 행은 삭제 상태와 이력을 위해 남긴다.
- 공개 이미지의 S3 원본이 삭제되어도 CDN에 이미 캐시된 응답은 즉시 사라진다고 보장할 수 없다.

## 현재 하지 않는 것

magic byte, 이미지 디코딩, 악성 파일 검사, EXIF 제거와 미참조 객체의 자동 정리는 아직 구현되지 않았다. 이 항목은
[미구현 사항](../../docs/implementation-gaps.md)에서만 관리한다.
