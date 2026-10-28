package art.yesulin.file.application;

import static art.yesulin.file.domain.FileErrorCode.NOT_FOUND;
import static art.yesulin.file.domain.FileErrorCode.UPLOAD_NOT_FOUND;

import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.ObjectUpload;
import art.yesulin.file.application.storage.PresignedUpload;
import art.yesulin.file.application.storage.StoredObjectMetadata;
import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.file.domain.FileMetadata;
import art.yesulin.global.exception.BusinessException;
import java.io.ByteArrayInputStream;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileService {

    private static final Logger LOGGER = LoggerFactory.getLogger(FileService.class);

    private final FileAssetRepository fileAssetRepository;
    private final ObjectStorage objectStorage;
    private final Clock clock;

    @Transactional
    public FileUploadResult requestUpload(long ownerId, FileUploadCommand command) {
        return requestUpload(ownerId, command, "public/files");
    }

    private FileUploadResult requestUpload(long ownerId, FileUploadCommand command, String objectKeyPrefix) {
        FileMetadata metadata = command.toMetadata();
        String objectKey = createObjectKey(objectKeyPrefix);
        FileAsset fileAsset = new FileAsset(objectKey, ownerId, metadata);
        PresignedUpload upload = objectStorage.createUpload(objectKey, metadata.getContentType(), metadata.getSize());
        FileAsset savedFileAsset = fileAssetRepository.save(fileAsset);
        return new FileUploadResult(
                savedFileAsset.getId(), upload.url(), upload.method(), upload.expiresAt(), upload.headers()
        );
    }

    @Transactional
    public FileUploadResult requestPublicUpload(long ownerId, FileUploadCommand command) {
        return requestUpload(ownerId, command, "public/files");
    }

    @Transactional
    public FileUploadResult requestPrivateActorPhotoUpload(long ownerId, FileUploadCommand command) {
        return requestUpload(ownerId, command, "private/actor-photos");
    }

    /**
     * 서버가 가진 이미지로 배우 사진 파일을 바로 만든다. PDF에서 뽑은 사진 후보를 보관함에 넣을 때 쓰며, 원본 추출 이미지와 떨어진
     * 새 객체라 추출 결과를 지워도 남는다. 저장소에 올리지 못하면 파일 행도 남기지 않는다.
     */
    @Transactional
    public long createPrivateActorPhoto(long ownerId, String originalFilename, String contentType, byte[] content) {
        FileMetadata metadata = new FileMetadata(originalFilename, contentType, content.length);
        FileAsset fileAsset = fileAssetRepository.save(
                new FileAsset(createObjectKey("private/actor-photos"), ownerId, metadata)
        );
        objectStorage.put(fileAsset.getObjectKey(), new ObjectUpload(
                metadata.getContentType(), null, content.length, new ByteArrayInputStream(content)
        ));
        fileAsset.completeUpload(metadata.getContentType(), content.length, clock.instant());
        return fileAsset.getId();
    }

    @Transactional
    public void completeUpload(long ownerId, long fileId) {
        FileAsset fileAsset = fileAssetRepository.findByIdAndOwnerIdForUpdate(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        StoredObjectMetadata metadata = objectStorage.inspect(fileAsset.getObjectKey()).orElseThrow(
                () -> new BusinessException(UPLOAD_NOT_FOUND, "업로드 객체를 찾을 수 없습니다.")
        );
        logMetadataMismatch(fileAsset, metadata);
        fileAsset.completeUpload(metadata.contentType(), metadata.size(), clock.instant());
    }

    @Transactional(readOnly = true)
    public String readPublicUrl(long ownerId, long fileId) {
        FileAsset fileAsset = getOwnedFileAsset(ownerId, fileId);
        fileAsset.ensureUsable();
        if (!fileAsset.getObjectKey().startsWith("public/")) {
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
        return objectStorage.toPublicUrl(fileAsset.getObjectKey());
    }

    public String privateContentUrl(long fileId) {
        return "/api/v1/files/" + fileId + "/content";
    }

    private String createObjectKey(String prefix) {
        LocalDate date = LocalDate.now(ZoneOffset.UTC);
        return "%s/%d%02d%02d/%s".formatted(
                prefix, date.getYear(), date.getMonthValue(), date.getDayOfMonth(), UUID.randomUUID()
        );
    }

    private FileAsset getOwnedFileAsset(long ownerId, long fileId) {
        return fileAssetRepository.findByIdAndOwnerId(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
    }

    private void logMetadataMismatch(FileAsset fileAsset, StoredObjectMetadata actual) {
        FileMetadata expected = fileAsset.getMetadata();
        if (expected.matches(actual.contentType(), actual.size())) {
            return;
        }
        LOGGER.warn(
                "FILE_METADATA_MISMATCH fileId={} expectedSize={} actualSize={} expectedContentType={} "
                        + "actualContentType={}",
                fileAsset.getId(),
                expected.getSize(),
                actual.size(),
                expected.getContentType(),
                actual.contentType()
        );
    }
}
