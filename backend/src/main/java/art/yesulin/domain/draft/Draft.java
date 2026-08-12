package art.yesulin.domain.draft;

import art.yesulin.domain.account.AccountId;
import art.yesulin.domain.common.DomainError;
import art.yesulin.domain.common.DomainException;
import art.yesulin.domain.recruitment.PostingId;
import java.time.Instant;
import java.util.Optional;

public final class Draft {

    private final DraftId id;
    private final PostingId postingId;
    private final AccountId owner;
    private final DraftContent content;
    private final long revision;
    private final Instant clientModifiedAt;
    private final DraftStatus status;

    private Draft(
            DraftId id,
            PostingId postingId,
            AccountId owner,
            DraftContent content,
            long revision,
            Instant clientModifiedAt,
            DraftStatus status) {
        this.id = id;
        this.postingId = postingId;
        this.owner = owner;
        this.content = content;
        this.revision = revision;
        this.clientModifiedAt = clientModifiedAt;
        this.status = status;
    }

    public static Draft createAnonymous(
            DraftId id, PostingId postingId, DraftContent content, Instant clientModifiedAt) {
        return new Draft(id, postingId, null, content, 1L, clientModifiedAt, DraftStatus.ACTIVE);
    }

    public Draft attach(AccountId accountId) {
        requireActive();
        if (owner != null && !owner.equals(accountId)) {
            throw new DomainException(DomainError.DRAFT_ALREADY_OWNED);
        }
        return new Draft(id, postingId, accountId, content, revision, clientModifiedAt, status);
    }

    public Draft replace(DraftContent incomingContent, Instant incomingModifiedAt) {
        requireActive();
        if (!incomingModifiedAt.isAfter(clientModifiedAt)) {
            throw new DomainException(DomainError.DRAFT_VERSION_CONFLICT);
        }
        return new Draft(
                id, postingId, owner, incomingContent, revision + 1L, incomingModifiedAt, status);
    }

    public Draft markSubmitted() {
        requireActive();
        if (owner == null) {
            throw new DomainException(DomainError.DRAFT_NOT_OWNED);
        }
        return new Draft(
                id, postingId, owner, content, revision, clientModifiedAt, DraftStatus.SUBMITTED);
    }

    private void requireActive() {
        if (status != DraftStatus.ACTIVE) {
            throw new DomainException(DomainError.DRAFT_NOT_ACTIVE);
        }
    }

    public DraftId id() {
        return id;
    }

    public PostingId postingId() {
        return postingId;
    }

    public Optional<AccountId> owner() {
        return Optional.ofNullable(owner);
    }

    public DraftContent content() {
        return content;
    }

    public long revision() {
        return revision;
    }

    public Instant clientModifiedAt() {
        return clientModifiedAt;
    }

    public DraftStatus status() {
        return status;
    }
}
