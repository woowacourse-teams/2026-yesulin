# 파일 저장

## 현재 흐름

1. 공연 포스터 또는 배우 사진 upload request API를 호출한다.
2. 서버는 `PENDING` FileAsset과 만료 10분의 S3 presigned PUT URL을 반환한다.
3. 클라이언트가 반환받은 URL에 파일을 PUT한다.
4. 클라이언트가 completion API를 호출한다.
5. 서버는 S3 HEAD의 Content-Type과 크기를 요청 metadata와 비교하고 일치하면 `READY`로 바꾼다.

공연 포스터는 JPEG·PNG·WebP 최대 30MB, 배우 사진은 같은 형식 최대 20MB다. 읽기 URL도 기본 10분 만료다.

## 소유권과 참조

- 모든 파일 동작은 소유 member ID를 검증한다.
- READY 파일만 공연 포스터, 사진 보관함과 지원서에 연결할 수 있다.
- 사진 보관함 삭제는 보관함 항목의 soft delete다.
- 지원서가 참조하는 사진과 포스터는 별도 reference registry에 기록해 제출 스냅샷과 개인 보관함을 분리한다.

## 현재 하지 않는 것

magic byte, 이미지 디코딩, 악성 파일 검사, EXIF 제거와 미참조 객체 정리는 아직 구현되지 않았다. 이 항목은
[미구현 사항](../../docs/implementation-gaps.md)에서만 관리한다.

