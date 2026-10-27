package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityEntry;
import java.time.Instant;

public record EntryResult(long id, String title, String body, String author, Instant createdAt,
                          Instant updatedAt, int commentCount, boolean editable) {

    public static EntryResult from(CommunityEntry entry, String owner) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), "익명", entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), entry.isOwnedBy(owner));
    }

    public static EntryResult summary(CommunityEntry entry) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), "익명", entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), false);
    }
}
