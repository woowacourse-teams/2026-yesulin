package art.yesulin.infrastructure.draft;

import art.yesulin.application.application.ApplicationSubmissionException;
import art.yesulin.application.draft.DraftResult;
import art.yesulin.application.draft.DraftSyncCommand;
import art.yesulin.application.draft.DraftSyncService;
import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;
import art.yesulin.infrastructure.recruitment.PostingJpaRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DraftSyncServiceAdapter implements DraftSyncService {

    private final DraftJpaRepository draftRepository;
    private final PostingJpaRepository postingRepository;
    private final Clock clock;

    public DraftSyncServiceAdapter(
            DraftJpaRepository draftRepository,
            PostingJpaRepository postingRepository,
            Clock clock) {
        this.draftRepository = draftRepository;
        this.postingRepository = postingRepository;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    @Override
    public DraftResult find(long accountId, long postingId) {
        return result(draftRepository.findByAccountIdAndPostingId(accountId, postingId)
                .orElseThrow(() -> new ApplicationSubmissionException(
                        "DRAFT_NOT_FOUND", "Draft를 찾을 수 없습니다.")));
    }

    @Transactional
    @Override
    public DraftResult synchronize(long accountId, DraftSyncCommand command) {
        if (!postingRepository.existsById(command.postingId())) {
            throw new ApplicationSubmissionException("POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
        }
        LocalDateTime serverNow = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        LocalDateTime clientModifiedAt = LocalDateTime.ofInstant(
                command.clientModifiedAt(), ZoneOffset.UTC);
        DraftJpaEntity entity = draftRepository
                .findByAccountIdAndPostingId(accountId, command.postingId())
                .map(existing -> replace(existing, command, clientModifiedAt, serverNow))
                .orElseGet(() -> create(accountId, command, clientModifiedAt, serverNow));
        return result(draftRepository.save(entity));
    }

    private DraftJpaEntity replace(
            DraftJpaEntity existing,
            DraftSyncCommand command,
            LocalDateTime clientModifiedAt,
            LocalDateTime serverNow) {
        if (!"ACTIVE".equals(existing.status())) {
            throw new DomainException(DomainError.DRAFT_NOT_ACTIVE);
        }
        if (command.expectedRevision() == null) {
            throw new ApplicationSubmissionException(
                    "DRAFT_REVISION_REQUIRED", "기존 Draft를 갱신하려면 revision이 필요합니다.");
        }
        existing.replace(
                command.contentJson(), command.expectedRevision(), clientModifiedAt, serverNow);
        return existing;
    }

    private DraftJpaEntity create(
            long accountId,
            DraftSyncCommand command,
            LocalDateTime clientModifiedAt,
            LocalDateTime serverNow) {
        if (command.expectedRevision() != null) {
            throw new ApplicationSubmissionException(
                    "DRAFT_VERSION_CONFLICT", "갱신할 Draft가 존재하지 않습니다.");
        }
        return DraftJpaEntity.createOwned(
                command.postingId(), accountId, command.contentJson(), clientModifiedAt, serverNow);
    }

    private DraftResult result(DraftJpaEntity entity) {
        return new DraftResult(
                entity.id(), entity.postingId(), entity.contentJson(), entity.revision(),
                entity.clientModifiedAt().toInstant(ZoneOffset.UTC),
                entity.serverModifiedAt().toInstant(ZoneOffset.UTC), entity.status());
    }
}
