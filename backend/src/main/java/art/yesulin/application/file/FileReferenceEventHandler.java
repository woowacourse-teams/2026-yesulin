package art.yesulin.application.file;

import static art.yesulin.domain.file.FileErrorCode.NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.event.FileReferenceAssignedEvent;
import art.yesulin.domain.file.event.FileReferenceChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
public class FileReferenceEventHandler {

    private final FileAssetRepository fileAssetRepository;

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(FileReferenceAssignedEvent event) {
        ensureReady(event.ownerId(), event.fileId());
    }

    @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
    public void handle(FileReferenceChangedEvent event) {
        ensureReady(event.ownerId(), event.currentFileId());
    }

    private void ensureReady(long ownerId, long fileId) {
        FileAsset fileAsset = fileAssetRepository.findByIdAndOwnerId(fileId, ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "파일을 찾을 수 없습니다."));
        fileAsset.ensureReadyForReference();
    }
}
