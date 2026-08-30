package art.yesulin.application.file;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;
import static art.yesulin.domain.file.FileErrorCode.UPLOAD_NOT_FOUND;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.PresignedUpload;
import art.yesulin.application.file.storage.StoredObjectMetadata;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileMetadata;
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

    @Transactional
    public void completeUpload(long ownerId, long fileId) {
        FileAsset fileAsset = getOwnedFileAsset(ownerId, fileId);
        StoredObjectMetadata metadata = objectStorage.inspect(fileAsset.getObjectKey()).orElseThrow(
                () -> new BusinessException(UPLOAD_NOT_FOUND, "업로드 객체를 찾을 수 없습니다.")
        );
        logMetadataMismatch(fileAsset, metadata);
        fileAsset.completeUpload(metadata.contentType(), metadata.size());
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
