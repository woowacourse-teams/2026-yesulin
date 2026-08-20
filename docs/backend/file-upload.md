# 파일 업로드 설계

파일은 특정 도메인에 종속되지 않는 공통 자산이다. 현재 API는 공연 포스터 이미지 한 장만 받지만 파일 모델과 application은 향후 사진·영상·첨부 파일을 수용할 수 있게 유지한다.

## 경계와 의존성

```text
domain/performance ──event──> presentation/event/performance ──> application/file ──> domain/file
                                                                            │
                                                                            └── ObjectStorage <── infrastructure/storage
```

- 공연 포스터의 인증·용량·미디어 타입 계약은 `presentation/api/performance`가 가진다.
- `FileService`는 presigned upload 발급과 완료 확인을 담당하고 `ObjectStorage`를 사용한다. `FileReferenceService`는 이벤트로 시작된 파일 연결·교체와 관계 영속화만 담당하며 Storage를 사용하지 않는다. 둘 다 공연·포스터의 의미를 알지 않는다.
- `domain/file`은 저장소 SDK와 다른 도메인을 알지 않는다.
- `ObjectStorage`는 application의 out port이며 실제 S3 구현은 infrastructure가 제공한다.
- 도메인별 파일 연결은 각 도메인이 `fileId`를 참조하고 자신의 사건을 발행한다. presentation event adapter가 연결·교체별 command로 파일 application 경계를 호출하고, application 내부에서는 개별 값으로 관계를 처리한다. 파일 서비스에 `attachPerformancePoster` 같은 도메인 전용 메서드나 `ATTACHED` 상태를 추가하지 않는다.
- 파일 application 서비스끼리 또는 다른 도메인 서비스끼리 직접 의존시키지 않는다. 여러 작업의 조합이 필요해질 때 역할이 드러나는 별도 application 조정 객체를 둔다.

## 모델

- `FileAsset`: 내부 `Long id`, `ownerId`, 서버가 만든 `objectKey`, `FileMetadata`, `PENDING|READY`를 가진다.
- `FileReference`: `fileId`, `referenceType`, `referenceId`로 실제 사용 관계를 기록한다. `referenceType`은 `PERFORMANCE_POSTER`처럼 사용처를 하나의 값으로 표현하며 파일 계층은 그 의미를 해석하지 않는다. 같은 사용처와 대상에 여러 파일을 연결할 수 있고, 동일한 `사용처·대상·파일` 관계만 하나로 제한한다.
- `ATTACHED`는 저장 상태가 아니라 `FileReference` 존재 여부로 판단한다. 공연의 포스터 FK는 공연 관계의 정본이고 참조 행은 파일 정리와 다중 재사용을 위한 공통 관계 기록이다. 둘은 같은 DB 트랜잭션에서 변경한다.
- 외부 식별을 위한 별도 UUID는 두지 않는다. 파일 ID 접근은 항상 소유자와 함께 조회하고 미존재·타인 소유를 같은 `404 FILE_NOT_FOUND`로 응답한다.
- `objectKey`는 외부 API에 노출하거나 클라이언트 입력으로 받지 않는다. 형식은 `files/{UTC yyyyMMdd}/{UUID}`다. 원본 파일명과 확장자는 메타데이터이며 객체 접근은 Content-Type과 URL로 처리한다.
- `FileMetadata`는 원본명, 정규화한 Content-Type, 양수 크기, `FileType`을 갖는다. 현재 `IMAGE`는 JPEG·PNG·WebP만 허용한다.
- 이미지·영상별 필드가 실제로 생기기 전에는 JPA 상속 계층을 만들지 않는다. 단일 embeddable과 문자열 타입 구분자를 사용한다.
- API·application의 숫자는 값 부재가 유효하지 않으면 primitive를 사용한다. 생성 전 `null`이 의미 있는 JPA 식별자만 `Long`이다.
- enum은 이름을 문자열로 저장하는 명시적 `StringEnumConverter`를 사용한다. unique 제약은 추적 가능한 이름으로 `@Table`에 선언한다.
- 운영 스키마는 시각 기반 Flyway migration으로 만들고 H2에서 JPA schema validation을 수행한다.
- 단순 상태 대입의 동시 충돌이 멱등 재시도를 깨뜨리지 않도록 현재는 `@Version`을 두지 않는다. 이후 독립적인 경쟁 상태 전이가 생길 때 추가한다.

## 업로드 생명주기

1. 클라이언트가 포스터 업로드 요청을 보낸다. 소유자는 세션 `MemberPrincipal`에서만 얻는다.
2. 서버는 메타데이터와 API 정책을 검증하고 `PENDING` 파일을 저장한 뒤 presigned URL을 반환한다.
3. 클라이언트는 응답의 HTTP method와 headers를 그대로 사용해 저장소에 직접 업로드한다. headers는 서명에 포함된 `Content-Type` 등이며 향후 checksum·암호화 헤더가 추가될 수 있다.
4. 클라이언트가 완료 API를 호출한다. 서버는 `id + ownerId`로 먼저 조회한 뒤 저장소 HEAD에 해당하는 `inspect`로 실제 Content-Type·크기를 확인한다.
5. 요청 메타데이터와 실제 객체가 일치하면 `READY`로 전이하고 `204 No Content`를 반환한다.

완료 API는 직접 업로드 결과를 서버가 알기 위해 필요하다. `PATCH`는 상태 일부 변경을 표현하며 이미 `READY`인 파일도 같은 메타데이터를 다시 확인하고 성공하는 멱등 연산이다. 파일 생성과 완료는 각각 DB 트랜잭션이다. 외부 저장소는 DB 트랜잭션에 참여하지 않으므로 호출을 짧게 유지하고 장기 작업은 넣지 않는다.

## 운영 S3 구성

- 운영 adapter는 AWS SDK for Java 2.x의 `S3Client`와 `S3Presigner`를 사용한다. 자격 증명을 코드나 환경 변수로 주입하지 않고 EC2 instance profile의 `ec2-project` 임시 자격 증명을 기본 provider chain으로 읽는다.
- 논리 `objectKey` 앞에 `YESULIN_STORAGE_S3_KEY_PREFIX`를 붙여 S3 물리 키를 만든다. 현재 bucket은 `techcourse-project-2026`, 팀 prefix는 `yesulin`이다.
- CloudFront 원본 경로가 `/yesulin`이므로 공개 URL에는 팀 prefix를 다시 붙이지 않는다. `files/...`는 `https://dcijkydwh7e79.cloudfront.net/files/...`로 변환한다.
- presigned PUT 기본 만료는 10분이며 `Content-Type`을 서명한다. PUT은 파일 크기 상한을 S3 정책으로 강제하지 않으므로 요청 단계의 30MB 검사에 더해 완료 단계에서 HEAD 결과의 실제 크기와 타입을 반드시 재검증한다.
- 운영 환경은 `YESULIN_STORAGE_S3_BUCKET`, `YESULIN_STORAGE_S3_KEY_PREFIX`, `YESULIN_STORAGE_S3_PUBLIC_BASE_URL`을 설정한다. `AWS_REGION`, `YESULIN_STORAGE_S3_UPLOAD_EXPIRATION`은 기본값을 변경할 때만 지정한다.

공연 생성은 공연 ID와 포스터 파일 ID를 가진 `PerformanceCreatedEvent`, 포스터 교체는 공연 ID와 이전·신규 파일 ID를 가진 `PerformancePosterChangedEvent`를 발행한다. presentation의 `PerformanceFileEventHandler`는 `BEFORE_COMMIT`에 `PERFORMANCE_POSTER` 참조를 연결하거나 교체한다. 신규 파일의 소유자나 `READY` 상태가 유효하지 않으면 공연 트랜잭션도 롤백한다. 파일 application/domain은 공연별 규칙과 한 사용처의 파일 개수를 모르며 adapter가 전달한 범용 참조 정보만 처리한다.

참조 없는 `READY`는 업로드 후 화면 이탈이나 포스터 교체로 생길 수 있다. 향후 정리 배치는 생성·참조 해제 유예기간이 지난 `PENDING`과 참조 없는 `READY`를 인덱스와 제한된 청크로 조회한 뒤 Storage와 DB에서 멱등 삭제한다. 본문 이미지는 HTML URL을 배치가 파싱하지 않고 저장 시 전달된 file ID 목록의 참조를 추가·제거한다.

## API·오류

- `POST /api/v1/performance-posters/upload-requests`: 포스터용 presigned upload 발급, `201 Created`
- `PATCH /api/v1/performance-posters/{fileId}/completion`: 업로드 검증 및 완료, `204 No Content`
- 요청에는 `purpose`와 `ownerId`가 없다. 공연 포스터라는 의미와 30MB 제한은 endpoint 계약이며 파일 도메인에 전달하지 않는다.
- 결과는 wrapper 없이 `fileId`, `uploadUrl`, `method`, `expiresAt`, `headers`를 반환한다. enum 대신 안정적인 문자열 값을 반환한다.
- 공통 `BusinessException`은 오류 코드·HTTP 성격을 가지며 구체 메시지는 오류 발생 지점에서 만든다. presentation handler가 HTTP 응답으로 바꾼다.
- `IllegalArgumentException`은 잘못된 내부 객체 생성에 가깝기 때문에 전역에서 사용자 `400`으로 변환하지 않는다. 입력 형식은 Bean Validation, 비즈니스 위반은 `BusinessException`으로 처리한다.
- 참조 연결과 교체는 이벤트 재처리를 고려해 멱등하게 수행한다. 교체할 이전 참조가 이미 없어도 실패시키지 않으며 운영에서 상태 불일치를 추적해야 하면 로그나 메트릭을 추가한다.

## 후속 작업

- 객체 magic byte 또는 비동기 검사, 이미지 처리
- 만료된 `PENDING`과 참조 없는 `READY` 파일의 청크 정리 배치와 S3 Lifecycle 보조 정책
- LocalStack 통합 테스트와 `Clock` 주입이 필요한 시간 경계 테스트
- Spring Session Redis 도입 시 `MemberPrincipal` serializer 설정

현재 범위에는 S3 저장소 구현을 포함하지만 지원서·공고 모델은 포함하지 않는다. 공연은 `fileId` 참조 이벤트로 완료된 포스터만 연결한다.
