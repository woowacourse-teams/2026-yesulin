package art.yesulin.infrastructure.draft;

import art.yesulin.application.draft.DraftAttachmentService;
import art.yesulin.application.draft.DraftNotFoundException;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DraftAttachmentServiceAdapter implements DraftAttachmentService {

    private final DraftJpaRepository draftRepository;
    private final Clock clock;

    public DraftAttachmentServiceAdapter(DraftJpaRepository draftRepository, Clock clock) {
        this.draftRepository = draftRepository;
        this.clock = clock;
    }

    @Transactional
    @Override
    public void attachVerifiedDraft(long draftId, long authenticatedAccountId) {
        DraftJpaEntity draft = draftRepository.findById(draftId)
                .orElseThrow(() -> new DraftNotFoundException(draftId));
        draft.attach(authenticatedAccountId, LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
    }
}
