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
        DraftJpaEntity incoming = draftRepository.findById(draftId)
                .orElseThrow(() -> new DraftNotFoundException(draftId));
        DraftJpaEntity existing = draftRepository.findByAccountIdAndPostingId(
                authenticatedAccountId, incoming.postingId()).orElse(null);
        if (existing == null || existing.id().equals(incoming.id())) {
            incoming.attach(authenticatedAccountId, now());
            return;
        }
        if (isNewer(incoming, existing)) {
            draftRepository.delete(existing);
            draftRepository.flush();
            incoming.attach(authenticatedAccountId, now());
            return;
        }
        draftRepository.delete(incoming);
    }

    private boolean isNewer(DraftJpaEntity candidate, DraftJpaEntity current) {
        int timeComparison = candidate.clientModifiedAt().compareTo(current.clientModifiedAt());
        return timeComparison > 0
                || timeComparison == 0 && candidate.revision() > current.revision();
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
