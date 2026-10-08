package art.yesulin.file.application;

import static art.yesulin.file.domain.FileErrorCode.NOT_FOUND;

import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.dormant.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.dormant.domain.submission.SubmissionRepository;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.file.application.storage.StoredObjectContent;
import art.yesulin.file.domain.FileAsset;
import art.yesulin.file.domain.FileAssetRepository;
import art.yesulin.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileContentService {

    private final FileAssetRepository fileAssetRepository;
    private final SubmissionRepository submissionRepository;
    private final OtrSubmissionRepository otrSubmissionRepository;
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
            if (submissionRepository.existsSubmittedPhoto(fileId)
                    || otrSubmissionRepository.existsSubmittedPhoto(fileId)) {
                return;
            }
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
        if (fileAsset.getOwnerId() == memberId) {
            return;
        }
        if (!submissionRepository.existsSubmittedPhotoOwnedByProducer(fileId, memberId)
                && !otrSubmissionRepository.existsSubmittedPhotoOwnedByProducer(fileId, memberId)) {
            throw new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다.");
        }
    }
}
