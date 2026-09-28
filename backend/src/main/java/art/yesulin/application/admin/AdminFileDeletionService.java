package art.yesulin.application.admin;

import art.yesulin.application.file.storage.ObjectStorage;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminFileDeletionService {

    private final AdminDeletionConfirmation deletionConfirmation;
    private final AdminFileDeletionStateService stateService;
    private final ObjectStorage objectStorage;

    public void delete(long actorMemberId, long fileId, String confirmationPassword) {
        deletionConfirmation.verify(actorMemberId, confirmationPassword);
        Optional<FileDeletionTarget> target = stateService.prepare(fileId);
        if (target.isEmpty()) {
            return;
        }
        objectStorage.delete(target.orElseThrow().objectKey());
        stateService.finish(actorMemberId, fileId);
    }
}
