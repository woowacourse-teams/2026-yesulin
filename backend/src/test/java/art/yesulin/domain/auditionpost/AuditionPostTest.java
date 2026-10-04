package art.yesulin.domain.auditionpost;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.common.exception.BusinessException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditionPostTest {

    private static final Instant NOW = Instant.parse("2026-10-04T01:00:00Z");
    private static final AuditionPostOrigin ORIGIN =
            new AuditionPostOrigin("OTR", "22397", "https://otr.co.kr/audition/?vid=22397");

    @Test
    void keepsDeadlineTextAndParsesOnlyIsoDate() {
        AuditionPostContent dated = content("2026-10-31");
        final AuditionPostContent always = content("상시");

        assertEquals(LocalDate.of(2026, 10, 31), dated.getDeadline());
        assertFalse(dated.isClosedOn(LocalDate.of(2026, 10, 31)));
        assertTrue(dated.isClosedOn(LocalDate.of(2026, 11, 1)));
        assertEquals("상시", always.getDeadlineText());
        assertNull(always.getDeadline());
        assertFalse(always.isClosedOn(LocalDate.of(2099, 1, 1)));
    }

    @Test
    void rejectsBlankTitle() {
        assertThrows(BusinessException.class, () -> new AuditionPostContent(
                "연극", " ", "", "", "", null, "<p>본문</p>"
        ));
    }

    @Test
    void publishesOnImportAndSplitsImagesFromAttachments() {
        AuditionPost post = new AuditionPost(
                ORIGIN, content("2026-10-31"), List.of("연극"), List.of(image("a"), attachment("b")), 1L, NOW
        );

        assertTrue(post.isPublished());
        assertEquals(List.of("public/a"), post.images().stream().map(AuditionPostFile::getObjectKey).toList());
        assertEquals(List.of("public/b"), post.attachments().stream().map(AuditionPostFile::getObjectKey).toList());
        assertEquals(NOW, post.getCreatedAt());
    }

    @Test
    void refreshReplacesContentAndReturnsPreviousFiles() {
        AuditionPost post = new AuditionPost(ORIGIN, content("2026-10-31"), List.of(), List.of(image("old")), 1L, NOW);
        post.changeStatus(AuditionPostStatus.HIDDEN);
        Instant later = NOW.plusSeconds(60);

        List<AuditionPostFile> previous = post.refresh(content("상시"), List.of(), List.of(image("new")), 2L, later);

        assertEquals(List.of("public/old"), previous.stream().map(AuditionPostFile::getObjectKey).toList());
        assertEquals(List.of("public/new"), post.images().stream().map(AuditionPostFile::getObjectKey).toList());
        assertEquals("상시", post.getContent().getDeadlineText());
        assertEquals(AuditionPostStatus.HIDDEN, post.getStatus());
        assertEquals(later, post.getUpdatedAt());
        assertEquals(NOW, post.getCreatedAt());
    }

    @Test
    void trimsAndDeduplicatesTags() {
        AuditionPost post = new AuditionPost(
                ORIGIN, content("상시"), List.of(" 연극 ", "연극", "", "뮤지컬"), List.of(), 1L, NOW
        );

        assertEquals(List.of("연극", "뮤지컬"), post.getTags());
    }

    @Test
    void limitsAttachmentCount() {
        List<AuditionPostFile> attachments = new ArrayList<>();
        for (int index = 0; index <= AuditionPost.MAX_ATTACHMENTS; index++) {
            attachments.add(attachment(String.valueOf(index)));
        }

        assertThrows(BusinessException.class, () -> new AuditionPost(
                ORIGIN, content("상시"), List.of(), attachments, 1L, NOW
        ));
    }

    @Test
    void rejectsNonHttpsSourceUrl() {
        assertThrows(BusinessException.class, () -> new AuditionPostOrigin("OTR", "1", "http://otr.co.kr/audition"));
    }

    private static AuditionPostContent content(String deadline) {
        return new AuditionPostContent("연극", "배우 모집", "협의", deadline, "예술극단", null, "<p>본문</p>");
    }

    private static AuditionPostFile image(String name) {
        return new AuditionPostFile(AuditionPostFileKind.IMAGE, "public/" + name, name + ".png", "image/png", 10);
    }

    private static AuditionPostFile attachment(String name) {
        return new AuditionPostFile(
                AuditionPostFileKind.ATTACHMENT, "public/" + name, name + ".pdf", "application/pdf", 10
        );
    }
}
