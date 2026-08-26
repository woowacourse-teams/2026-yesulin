package art.yesulin.application.file;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FileReferenceService {

    private final FileAssetRepository fileAssetRepository;
    private final FileReferenceRepository fileReferenceRepository;

    @Transactional
    public void linkFile(LinkFileCommand command) {
        ensureFileUsable(command.ownerId(), command.fileId());
        createReferenceIfAbsent(command.referenceType(), command.referenceId(), command.fileId());
    }

    @Transactional
    public void replaceLinkedFile(ReplaceLinkedFileCommand command) {
        if (command.previousFileId() == command.currentFileId()) {
            return;
        }
        ensureFileUsable(command.ownerId(), command.currentFileId());
        fileReferenceRepository.deleteByReferenceTypeAndReferenceIdAndFileId(
                command.referenceType(), command.referenceId(), command.previousFileId()
        );
        createReferenceIfAbsent(command.referenceType(), command.referenceId(), command.currentFileId());
    }

    @Transactional
    public void unlinkFile(UnlinkFileCommand command) {
        fileReferenceRepository.deleteByReferenceTypeAndReferenceIdAndFileId(
                command.referenceType(), command.referenceId(), command.fileId()
        );
    }

    private void ensureFileUsable(long ownerId, long fileId) {
        FileAsset fileAsset = fileAssetRepository.findByIdAndOwnerId(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        fileAsset.ensureUsable();
    }

    private void createReferenceIfAbsent(String referenceType, long referenceId, long fileId) {
        if (fileReferenceRepository.existsByReferenceTypeAndReferenceIdAndFileId(referenceType, referenceId, fileId)) {
            return;
        }
        fileReferenceRepository.save(new FileReference(referenceType, referenceId, fileId));
    }
}
