package art.yesulin.application.file;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.StoredObjectContent;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.submission.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileContentService {

    private final FileAssetRepository fileAssetRepository;
    private final SubmissionRepository submissionRepository;
    private final ObjectStorage objectStorage;

    @Transactional(readOnly = true)
    public FileContentResult read(long memberId, MemberType memberType, long fileId) {
        FileAsset fileAsset = findPrivateReadyFile(fileId);
        ensureReadable(memberId, memberType, fileId, fileAsset);
        StoredObjectContent content = objectStorage.read(fileAsset.getObjectKey())
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        return new FileContentResult(content.contentType(), content.bytes());
    }

    private FileAsset findPrivateReadyFile(long fileId) {
        FileAsset fileAsset = fileAssetRepository.findById(fileId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        fileAsset.ensureUsable();
        if (!fileAsset.getObjectKey().startsWith("private/")) {
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
        return fileAsset;
    }

    private void ensureReadable(long memberId, MemberType memberType, long fileId, FileAsset fileAsset) {
        if (memberType == MemberType.ADMIN) {
            if (submissionRepository.existsSubmittedPhoto(fileId)) {
                return;
            }
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
        if (fileAsset.getOwnerId() == memberId) {
            return;
        }
        if (!submissionRepository.existsSubmittedPhotoOwnedByProducer(fileId, memberId)) {
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
    }
}
