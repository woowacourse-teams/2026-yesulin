package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityEntry;
import java.time.Instant;

public record EntryResult(long id, String title, String body, String author, Instant createdAt,
                          Instant updatedAt, int commentCount, boolean editable, long likeCount, boolean liked) {

    public static EntryResult from(CommunityEntry entry, String owner) {
        return from(entry, owner, "익명1");
    }

    public static EntryResult from(CommunityEntry entry, String owner, String author) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), author, entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), entry.isOwnedBy(owner), 0, false);
    }

    public EntryResult withLikes(long count, boolean selected) {
        return new EntryResult(id, title, body, author, createdAt, updatedAt, commentCount, editable, count, selected);
    }

    public static EntryResult summary(CommunityEntry entry) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), "익명1", entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), false, 0, false);
    }
}
