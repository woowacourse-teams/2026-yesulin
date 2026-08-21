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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileService {

    private final FileAssetRepository fileAssetRepository;
    private final ObjectStorage objectStorage;

    @Transactional
    public FileUploadResult requestUpload(long ownerId, FileUploadCommand command) {
        FileMetadata metadata = command.toMetadata();
        String objectKey = createObjectKey();
        FileAsset fileAsset = new FileAsset(objectKey, ownerId, metadata);
        PresignedUpload upload = objectStorage.createUpload(objectKey, metadata.getContentType(), metadata.getSize());
        FileAsset savedFileAsset = fileAssetRepository.save(fileAsset);
        return new FileUploadResult(
                savedFileAsset.getId(), upload.url(), upload.method(), upload.expiresAt(), upload.headers()
        );
    }

    @Transactional
    public void completeUpload(long ownerId, long fileId) {
        FileAsset fileAsset = getOwnedFileAsset(ownerId, fileId);
        StoredObjectMetadata metadata = objectStorage.inspect(fileAsset.getObjectKey()).orElseThrow(
                () -> new BusinessException(UPLOAD_NOT_FOUND, "업로드 객체를 찾을 수 없습니다.")
        );
        fileAsset.completeUpload(metadata.contentType(), metadata.size());
    }

    @Transactional(readOnly = true)
    public String readUrl(long ownerId, long fileId) {
        FileAsset fileAsset = getOwnedFileAsset(ownerId, fileId);
        fileAsset.ensureUsable();
        return objectStorage.toPublicUrl(fileAsset.getObjectKey());
    }

    private String createObjectKey() {
        LocalDate date = LocalDate.now(ZoneOffset.UTC);
        return "files/%d%02d%02d/%s".formatted(
                date.getYear(), date.getMonthValue(), date.getDayOfMonth(), UUID.randomUUID()
        );
    }

    private FileAsset getOwnedFileAsset(long ownerId, long fileId) {
        return fileAssetRepository.findByIdAndOwnerId(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
    }
}
