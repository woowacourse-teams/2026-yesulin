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
- 배우 사진은 `private/actor-photos/{UTC yyyyMMdd}/{UUID}` 논리 키로 저장한다. private 키는 CloudFront
  URL로 변환하지 않는다.
- S3 실제 키는 논리 키 앞에 `YESULIN_STORAGE_S3_KEY_PREFIX`를 붙인다. 현재 staging 기준으로 포스터는
  `yesulin/public/files/...`, 배우 사진은 `yesulin/private/actor-photos/...`이다.

배우 사진 내용은 `GET /api/v1/files/{fileId}/content`로만 제공한다. Spring이 S3 객체를 읽어
`Cache-Control: no-store, must-revalidate`와 원본 Content-Type으로 응답한다. 조회자는 파일 소유 배우이거나,
해당 파일이 `SUBMISSION_PHOTO → Submission → Audition.ownerId`로 연결된 공고의 공연사여야 한다. 그 밖의
회원과 존재하지 않는 파일에는 동일하게 `404`를 반환한다.

## 소유권과 참조

- 모든 파일 동작은 소유 member ID를 검증한다.
- READY 파일만 공연 포스터, 사진 보관함과 지원서에 연결할 수 있다.
- 사진 보관함 삭제는 보관함 항목의 soft delete다.
- 지원서가 참조하는 사진과 포스터는 별도 reference registry에 기록해 제출 스냅샷과 개인 보관함을 분리한다.
- 사진보관함과 지원서 상세의 사진 URL은 private 콘텐츠 API 상대 경로를 반환한다.

## 현재 하지 않는 것

magic byte, 이미지 디코딩, 악성 파일 검사, EXIF 제거와 미참조 객체 정리는 아직 구현되지 않았다. 이 항목은
[미구현 사항](../../docs/implementation-gaps.md)에서만 관리한다.
