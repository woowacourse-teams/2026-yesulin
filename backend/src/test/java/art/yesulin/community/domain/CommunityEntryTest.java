package art.yesulin.community.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CommunityEntryTest {

    private static final String OWNER = "a".repeat(64);
    private static final Instant NOW = Instant.parse("2026-10-27T00:00:00Z");

    @Test
    void trimsContentAndKeepsPlainText() {
        CommunityEntry post = post("  제목  ", "  <script>alert(1)</script>\n내용  ");
        assertEquals("제목", post.getTitle());
        assertEquals("<script>alert(1)</script>\n내용", post.getBody());
        assertTrue(post.isOwnedBy(OWNER));
    }

    @Test
    void rejectsBlankAndOversizedContent() {
        assertThrows(IllegalArgumentException.class, () -> post(" ", "본문"));
        assertThrows(IllegalArgumentException.class, () -> post("제목", " "));
        assertThrows(IllegalArgumentException.class, () -> post("가".repeat(101), "본문"));
        assertThrows(IllegalArgumentException.class, () -> post("제목", "가".repeat(5001)));
        assertThrows(IllegalArgumentException.class, () -> comment("가".repeat(1001)));
    }

    @Test
    void onlyOwnerCanEditOrDelete() {
        CommunityEntry post = post("제목", "본문");
        assertThrows(BusinessException.class, () -> post.edit("b".repeat(64), "변경", "본문", NOW));
        assertThrows(BusinessException.class, () -> post.delete("b".repeat(64), NOW));
        post.edit(OWNER, "변경", "수정", NOW.plusSeconds(1));
        assertEquals("변경", post.getTitle());
        post.delete(OWNER, NOW.plusSeconds(2));
        assertThrows(BusinessException.class, post::requireVisible);
    }

    @Test
    void retryMustMatchOriginalOwnerAndContentEvenAfterEdit() {
        UUID requestId = UUID.randomUUID();
        CommunityEntry post = CommunityEntry.post(OWNER, requestId, "제목", "본문", NOW);
        post.edit(OWNER, "수정 제목", "수정 본문", NOW.plusSeconds(1));
        post.verifyRetry(OWNER, null, "제목", "본문");
        assertThrows(BusinessException.class, () -> post.verifyRetry(OWNER, null, "다른 제목", "본문"));
        assertThrows(BusinessException.class, () -> post.verifyRetry("b".repeat(64), null, "제목", "본문"));
    }

    private CommunityEntry post(String title, String body) {
        return CommunityEntry.post(OWNER, UUID.randomUUID(), title, body, NOW);
    }

    private CommunityEntry comment(String body) {
        return CommunityEntry.comment(1L, OWNER, UUID.randomUUID(), body, NOW);
    }
}
