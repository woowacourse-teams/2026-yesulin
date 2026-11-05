package art.yesulin.community.application;

import art.yesulin.community.domain.CommunityEntry;
import java.time.Instant;

public record EntryResult(long id, String title, String body, String author, Instant createdAt,
                          Instant updatedAt, int commentCount, boolean editable, long likeCount, boolean liked,
                          String authorPhotoUrl, String authorPath, boolean postAuthor, String authorMode,
                boolean memberOwned) {

    public static EntryResult from(CommunityEntry entry, String owner) {
        return from(entry, owner, "익명1");
    }

    public static EntryResult from(CommunityEntry entry, String owner, String author) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), author, entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), entry.isOwnedBy(owner), 0, false, null, null,
                author.equals("익명1"), entry.getAuthorMode().name(), entry.getMemberId() != null);
    }

    public EntryResult withLikes(long count, boolean selected) {
        return new EntryResult(id, title, body, author, createdAt, updatedAt, commentCount, editable, count,
                selected, authorPhotoUrl, authorPath, postAuthor, authorMode, memberOwned);
    }

    public EntryResult withAuthor(CommunityProfile profile, boolean canEdit) {
        return new EntryResult(id, title, body, profile.name(), createdAt, updatedAt, commentCount, canEdit,
                likeCount, liked, profile.photoUrl(), profile.path(), postAuthor, authorMode, memberOwned);
    }

    public static EntryResult summary(CommunityEntry entry) {
        return new EntryResult(entry.getId(), entry.getTitle(), entry.getBody(), "익명1", entry.getCreatedAt(),
                entry.getUpdatedAt(), entry.getCommentCount(), false, 0, false, null, null, true,
                entry.getAuthorMode().name(), entry.getMemberId() != null);
    }
}
