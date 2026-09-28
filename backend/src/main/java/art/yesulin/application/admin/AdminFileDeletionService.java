package art.yesulin.application.admin;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.common.exception.BusinessException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminFileDeletionService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AdminFileDeletionService.class);

    private final AdminFileDeletionConfirmation deletionConfirmation;
    private final AdminFileDeletionStateService stateService;
    private final ObjectStorage objectStorage;

    public void delete(long actorMemberId, long fileId, String confirmationPassword) {
        deletionConfirmation.verify(confirmationPassword);
        Optional<FileDeletionTarget> target = stateService.prepare(fileId);
        if (target.isEmpty()) {
            return;
        }
        objectStorage.delete(target.orElseThrow().objectKey());
        stateService.finish(actorMemberId, fileId);
    }

    public BatchFileDeletionResult deleteBatch(long actorMemberId, List<Long> fileIds, String confirmationPassword) {
        deletionConfirmation.verify(confirmationPassword);
        List<BatchFileDeletionResult.Item> results = new ArrayList<>();
        for (long fileId : fileIds) {
            results.add(deleteOne(actorMemberId, fileId));
        }
        return new BatchFileDeletionResult(List.copyOf(results));
    }

    private BatchFileDeletionResult.Item deleteOne(long actorMemberId, long fileId) {
        try {
            Optional<FileDeletionTarget> target = stateService.prepare(fileId);
            if (target.isEmpty()) {
                return new BatchFileDeletionResult.Item(fileId, BatchFileDeletionResult.Status.ALREADY_DELETED, null);
            }
            objectStorage.delete(target.orElseThrow().objectKey());
            stateService.finish(actorMemberId, fileId);
            return new BatchFileDeletionResult.Item(fileId, BatchFileDeletionResult.Status.DELETED, null);
        } catch (BusinessException exception) {
            return new BatchFileDeletionResult.Item(fileId, BatchFileDeletionResult.Status.FAILED,
                    exception.getErrorCode().code());
        } catch (RuntimeException exception) {
            LOGGER.error("ADMIN_FILE_DELETION_FAILED actorMemberId={} fileId={} errorType={}",
                    actorMemberId, fileId, exception.getClass().getSimpleName());
            return new BatchFileDeletionResult.Item(fileId, BatchFileDeletionResult.Status.FAILED,
                    "FILE_DELETION_FAILED");
        }
    }
}
